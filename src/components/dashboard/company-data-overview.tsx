
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
import { Loader2, DatabaseZap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { writeBatch, doc } from "firebase/firestore";
import type { Company, Customer, Expense, User, WithId } from "@/types";

const FINSERV_COMPANY_ID = '9213b6c3-634c-4cf1-be66-8b79a73bc43b';

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

  const companyStats = useMemo(() => {
    const stats: Record<
      string,
      { name: string; customerCount: number; userCount: number; expenseCount: number; dataToMigrate: any[] }
    > = {};

    // Initialize with known companies
    (companies || []).forEach((company) => {
      stats[company.id] = {
        name: company.name,
        customerCount: 0,
        userCount: 0,
        expenseCount: 0,
        dataToMigrate: []
      };
    });

    // Initialize unassigned group
    stats["unassigned"] = {
      name: "Unassigned",
      customerCount: 0,
      userCount: 0,
      expenseCount: 0,
      dataToMigrate: []
    };

    (customers || []).forEach((c) => {
      const companyId = c.companyId || "unassigned";
      if (!stats[companyId]) stats[companyId] = { name: "Unknown Company", customerCount: 0, userCount: 0, expenseCount: 0, dataToMigrate: [] };
      stats[companyId].customerCount++;
      if (!c.companyId) stats["unassigned"].dataToMigrate.push({id: c.id, collection: 'customers'});
    });
    
    (users || []).forEach((u) => {
      // Superadmins don't belong to a company
      if (u.role === 'superadmin') return;
      const companyId = u.companyId || "unassigned";
      if (!stats[companyId]) stats[companyId] = { name: "Unknown Company", customerCount: 0, userCount: 0, expenseCount: 0, dataToMigrate: [] };
      stats[companyId].userCount++;
      if (!u.companyId) stats["unassigned"].dataToMigrate.push({id: u.id, collection: 'users'});
    });

    (expenses || []).forEach((e) => {
      const companyId = e.companyId || "unassigned";
      if (!stats[companyId]) stats[companyId] = { name: "Unknown Company", customerCount: 0, userCount: 0, expenseCount: 0, dataToMigrate: [] };
      stats[companyId].expenseCount++;
      if (!e.companyId) stats["unassigned"].dataToMigrate.push({id: e.id, collection: 'expenses'});
    });

    return Object.entries(stats).map(([id, data]) => ({ id, ...data }));
  }, [companies, customers, users, expenses]);

  const unassignedData = companyStats.find(s => s.id === 'unassigned');
  const hasUnassignedData = unassignedData && (unassignedData.customerCount > 0 || unassignedData.userCount > 0 || unassignedData.expenseCount > 0);

  const handleMigrateData = async () => {
    if (!firestore || !unassignedData || unassignedData.dataToMigrate.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'No data to migrate.' });
      return;
    }
    
    setIsMigrating(true);
    const batch = writeBatch(firestore);

    unassignedData.dataToMigrate.forEach(item => {
        const docRef = doc(firestore, item.collection, item.id);
        batch.update(docRef, { companyId: FINSERV_COMPANY_ID });
    });

    try {
      await batch.commit();
      toast({
        title: 'Migration Complete',
        description: `${unassignedData.dataToMigrate.length} records have been successfully associated with the FINSERV company.`
      });
    } catch (error) {
      console.error("Migration failed:", error);
      toast({
        variant: 'destructive',
        title: 'Migration Failed',
        description: 'An error occurred during data migration. Please check the console.'
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
          A summary of all data across different company tenants. You can migrate unassigned data to the FINSERV company.
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
                {companyStats.filter(s => s.id !== 'unassigned' && (s.customerCount > 0 || s.userCount > 0 || s.expenseCount > 0)).map(stat => (
                    <TableRow key={stat.id}>
                        <TableCell>
                            <div className="font-medium">{stat.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{stat.id}</div>
                        </TableCell>
                        <TableCell className="text-center">{stat.userCount}</TableCell>
                        <TableCell className="text-center">{stat.customerCount}</TableCell>
                        <TableCell className="text-center">{stat.expenseCount}</TableCell>
                    </TableRow>
                ))}
                 {hasUnassignedData && (
                    <TableRow className="bg-amber-100/50 hover:bg-amber-100/70 dark:bg-amber-900/20 dark:hover:bg-amber-900/30">
                        <TableCell className="font-medium text-amber-700 dark:text-amber-400">Unassigned Data</TableCell>
                        <TableCell className="text-center font-medium text-amber-700 dark:text-amber-400">{unassignedData.userCount}</TableCell>
                        <TableCell className="text-center font-medium text-amber-700 dark:text-amber-400">{unassignedData.customerCount}</TableCell>
                        <TableCell className="text-center font-medium text-amber-700 dark:text-amber-400">{unassignedData.expenseCount}</TableCell>
                    </TableRow>
                 )}
            </TableBody>
        </Table>
      </CardContent>
      {hasUnassignedData && (
        <CardFooter className="border-t pt-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full">
                <p className="text-sm text-muted-foreground mb-2 sm:mb-0">
                    There are {unassignedData.dataToMigrate.length} records not assigned to any company.
                </p>
                <Button onClick={handleMigrateData} disabled={isMigrating}>
                    {isMigrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Migrate to FINSERV Company
                </Button>
            </div>
        </CardFooter>
      )}
    </Card>
  );
}
