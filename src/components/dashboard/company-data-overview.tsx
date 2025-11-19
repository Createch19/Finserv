
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
import { Loader2, DatabaseZap, AlertTriangle, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

  const { companyStats, dataToMigrate } = useMemo(() => {
    const stats: Record<
      string,
      { name: string; customerCount: number; userCount: number; expenseCount: number; isProblematic: boolean }
    > = {};
    
    const migrationList: {id: string; collection: string, originalCompanyId: string}[] = [];

    // Initialize with known companies
    (companies || []).forEach((company) => {
      stats[company.id] = {
        name: company.name,
        customerCount: 0,
        userCount: 0,
        expenseCount: 0,
        isProblematic: false,
      };
    });

    // Initialize groups for unassigned and legacy data
    stats["unassigned"] = { name: "Unassigned", customerCount: 0, userCount: 0, expenseCount: 0, isProblematic: true };
    stats[LEGACY_COMPANY_ID] = { name: "Unknown Company (Legacy)", customerCount: 0, userCount: 0, expenseCount: 0, isProblematic: true };


    (customers || []).forEach((c) => {
      const companyId = c.companyId || "unassigned";
      if (!stats[companyId]) stats[companyId] = { name: `Unknown (${companyId.substring(0,8)})`, customerCount: 0, userCount: 0, expenseCount: 0, isProblematic: true };
      stats[companyId].customerCount++;
      if (!c.companyId || c.companyId === LEGACY_COMPANY_ID) {
          migrationList.push({id: c.id, collection: 'customers', originalCompanyId: companyId});
      }
    });
    
    (users || []).forEach((u) => {
      if (u.role === 'superadmin') return;
      const companyId = u.companyId || "unassigned";
      if (!stats[companyId]) stats[companyId] = { name: `Unknown (${companyId.substring(0,8)})`, customerCount: 0, userCount: 0, expenseCount: 0, isProblematic: true };
      stats[companyId].userCount++;
      if (!u.companyId || u.companyId === LEGACY_COMPANY_ID) {
        migrationList.push({id: u.uid, collection: 'users', originalCompanyId: companyId});
      }
    });

    (expenses || []).forEach((e) => {
      const companyId = e.companyId || "unassigned";
      if (!stats[companyId]) stats[companyId] = { name: `Unknown (${companyId.substring(0,8)})`, customerCount: 0, userCount: 0, expenseCount: 0, isProblematic: true };
      stats[companyId].expenseCount++;
      if (!e.companyId || e.companyId === LEGACY_COMPANY_ID) {
        migrationList.push({id: e.id, collection: 'expenses', originalCompanyId: companyId});
      }
    });

    return {
        companyStats: Object.entries(stats).map(([id, data]) => ({ id, ...data })),
        dataToMigrate: migrationList,
    };
  }, [companies, customers, users, expenses]);

  const totalCountToMigrate = dataToMigrate.length;
  const hasDataToMigrate = totalCountToMigrate > 0;
  
  const handleMigrateData = async (targetCompanyId: string) => {
    if (!firestore || !hasDataToMigrate) {
      toast({ variant: 'destructive', title: 'Error', description: 'No data to migrate or Firestore not available.' });
      return;
    }
    
    setIsMigrating(true);
    const batch = writeBatch(firestore);

    dataToMigrate.forEach(item => {
        const docRef = doc(firestore, item.collection, item.id);
        batch.update(docRef, { companyId: targetCompanyId });
    });

    try {
      await batch.commit();
      const companyName = companies?.find(c => c.id === targetCompanyId)?.name || "the selected company";
      toast({
        title: 'Migration Complete',
        description: `${dataToMigrate.length} records have been successfully consolidated into ${companyName}.`
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
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {companyStats.filter(s => s.customerCount > 0 || s.userCount > 0 || s.expenseCount > 0).map(stat => (
                    <TableRow 
                        key={stat.id}
                        className={stat.isProblematic ? "bg-amber-100/50 hover:bg-amber-100/70 dark:bg-amber-900/20 dark:hover:bg-amber-900/30" : ""}
                    >
                        <TableCell>
                            <div className={`font-medium ${stat.isProblematic ? "text-amber-700 dark:text-amber-400" : ""}`}>{stat.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{stat.id}</div>
                        </TableCell>
                        <TableCell className="text-center">{stat.userCount}</TableCell>
                        <TableCell className="text-center">{stat.customerCount}</TableCell>
                        <TableCell className="text-center">{stat.expenseCount}</TableCell>
                        <TableCell className="text-right">
                            {stat.isProblematic && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" disabled={isMigrating}>
                                             {isMigrating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Assign All To</DropdownMenuLabel>
                                        {(companies || []).map(c => (
                                            <DropdownMenuItem key={c.id} onSelect={() => handleMigrateData(c.id)}>
                                                {c.name}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </TableCell>
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
                <Button onClick={() => handleMigrateData(FINSERV_COMPANY_ID)} disabled={isMigrating}>
                    {isMigrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Consolidate to FINSERV
                </Button>
            </div>
        </CardFooter>
      )}
    </Card>
  );
}
