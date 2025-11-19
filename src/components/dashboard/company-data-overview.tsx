
"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, DatabaseZap, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { writeBatch, doc } from "firebase/firestore";
import type { Company, Customer, Expense, User, WithId } from "@/types";

const FINSERV_COMPANY_ID = '9213b6c3-634c-4cf1-be66-8b79a73bc43b';
const LEGACY_COMPANY_ID = 'finserv-company-id';

interface CompanyDataOverviewProps {
  companies: WithId<Company>[] | null;
  customers: WithId<Customer>[] | null;
  users: WithId<User>[] | null;
  expenses: WithId<Expense>[] | null;
}

export function CompanyDataOverview({
  companies,
  customers,
  users,
  expenses,
}: CompanyDataOverviewProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isMigrating, setIsMigrating] = useState(false);

  const { companyStats, dataToMigrate, totalCountToMigrate } = useMemo(() => {
    const stats: Record<
      string,
      { name: string; customerCount: number; userCount: number; expenseCount: number; }
    > = {};
    
    const migrationList: {id: string; collection: string}[] = [];

    // Initialize with known companies
    (companies || []).forEach((company) => {
      stats[company.id] = {
        name: company.name,
        customerCount: 0,
        userCount: 0,
        expenseCount: 0,
      };
    });

    // Initialize groups for unassigned and legacy data
    stats["unassigned"] = { name: "Unassigned", customerCount: 0, userCount: 0, expenseCount: 0 };
    stats[LEGACY_COMPANY_ID] = { name: "Unknown Company (Legacy)", customerCount: 0, userCount: 0, expenseCount: 0 };


    (customers || []).forEach((c) => {
      const companyId = c.companyId || "unassigned";
      if (!stats[companyId]) stats[companyId] = { name: "Unknown Company", customerCount: 0, userCount: 0, expenseCount: 0 };
      stats[companyId].customerCount++;
      if (!c.companyId || c.companyId === LEGACY_COMPANY_ID) {
          migrationList.push({id: c.id, collection: 'customers'});
      }
    });
    
    (users || []).forEach((u) => {
      if (u.role === 'superadmin') return;
      const companyId = u.companyId || "unassigned";
      if (!stats[companyId]) stats[companyId] = { name: "Unknown Company", customerCount: 0, userCount: 0, expenseCount: 0 };
      stats[companyId].userCount++;
      if (!u.companyId || u.companyId === LEGACY_COMPANY_ID) {
        migrationList.push({id: u.uid, collection: 'users'});
      }
    });

    (expenses || []).forEach((e) => {
      const companyId = e.companyId || "unassigned";
      if (!stats[companyId]) stats[companyId] = { name: "Unknown Company", customerCount: 0, userCount: 0, expenseCount: 0 };
      stats[companyId].expenseCount++;
      if (!e.companyId || e.companyId === LEGACY_COMPANY_ID) {
        migrationList.push({id: e.id, collection: 'expenses'});
      }
    });

    return {
        companyStats: Object.entries(stats).map(([id, data]) => ({ id, ...data })),
        dataToMigrate: migrationList,
        totalCountToMigrate: migrationList.length,
    };
  }, [companies, customers, users, expenses]);

  const hasDataToMigrate = totalCountToMigrate > 0;

  const handleMigrateData = async () => {
    if (!firestore || !hasDataToMigrate) {
      toast({ variant: 'destructive', title: 'Error', description: 'No data to migrate or Firestore not available.' });
      return;
    }
    
    setIsMigrating(true);
    const batch = writeBatch(firestore);

    dataToMigrate.forEach(item => {
        const docRef = doc(firestore, item.collection, item.id);
        batch.update(docRef, { companyId: FINSERV_COMPANY_ID });
    });

    try {
      await batch.commit();
      toast({
        title: 'Migration Complete',
        description: `${dataToMigrate.length} records have been successfully consolidated into the FINSERV company.`
      });
    } catch (error) {
      console.error("Migration failed:", error);
      toast({
        variant: 'destructive',
        title: 'Migration Failed',
        description: 'An error occurred during data consolidation. Please check the console.'
      });
    } finally {
      setIsMigrating(false);
    }
  }


  return (
    <Card className="mb-6 border-primary/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DatabaseZap className="h-6 w-6 text-primary" />
          Company Data Overview
        </CardTitle>
        <CardDescription>
          A summary of all data across different company tenants. You can consolidate unassigned data into the main FINSERV company.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-center">Users</TableHead>
                    <TableHead className="text-center">Customers</TableHead>
                    <TableHead className="text-center">Expenses</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {companyStats.filter(s => s.customerCount > 0 || s.userCount > 0 || s.expenseCount > 0).map(stat => (
                    <TableRow 
                        key={stat.id}
                        className={stat.id === 'unassigned' || stat.id === LEGACY_COMPANY_ID ? "bg-amber-100/50 hover:bg-amber-100/70 dark:bg-amber-900/20 dark:hover:bg-amber-900/30" : ""}
                    >
                        <TableCell>
                            <div className={`font-medium ${stat.id === 'unassigned' || stat.id === LEGACY_COMPANY_ID ? "text-amber-700 dark:text-amber-400" : ""}`}>{stat.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{stat.id}</div>
                        </TableCell>
                        <TableCell className="text-center">{stat.userCount}</TableCell>
                        <TableCell className="text-center">{stat.customerCount}</TableCell>
                        <TableCell className="text-center">{stat.expenseCount}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
      </CardContent>
      {hasDataToMigrate && (
        <CardFooter className="border-t pt-4 bg-amber-50/50 dark:bg-amber-900/10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full">
                <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300 mb-2 sm:mb-0">
                    <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <p>
                        Found <strong>{totalCountToMigrate} records</strong> that are unassigned or part of a legacy company. These should be consolidated.
                    </p>
                </div>
                <Button onClick={handleMigrateData} disabled={isMigrating}>
                    {isMigrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Consolidate Data
                </Button>
            </div>
        </CardFooter>
      )}
    </Card>
  );
}

