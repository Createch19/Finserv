
"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DollarSign, Users, TrendingUp, HandCoins, Loader2, Receipt, ListChecks, DatabaseZap, TriangleAlert, Info } from "lucide-react";
import { CollectionChart, CollectionCountChart } from "@/components/reports/charts";
import { Separator } from "@/components/ui/separator";
import { useCollection, useFirestore } from "@/firebase";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where, writeBatch, getDocs, doc } from "firebase/firestore";
import type { Customer, WithId, User, Expense } from "@/types";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, eachMonthOfInterval, addMonths } from "date-fns";
import { CapitalFlowTable } from "@/components/dashboard/capital-flow-table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const FINSERV_COMPANY_ID = '9213b6c3-634c-4cf1-be66-8b79a73bc43b';

export default function DashboardPage() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isMigrating, setIsMigrating] = useState(false);

  // Fetch ALL data for Super Admin to perform migration check. Filtering for display happens later.
  const { data: customersData, isLoading: customersLoading } = useCollection<WithId<Customer>>(
      firestore ? collection(firestore, 'customers') : null
  );
  
  const { data: expensesData, isLoading: expensesLoading } = useCollection<WithId<Expense>>(
      firestore ? collection(firestore, 'expenses') : null
  );

  const { data: usersData, isLoading: usersLoading } = useCollection<WithId<User>>(
      firestore ? collection(firestore, 'users') : null
  );
  
  const isLoading = customersLoading || expensesLoading || usersLoading;

  const migrationData = useMemo(() => {
      if (user?.role !== 'superadmin' || !customersData || !usersData || !expensesData) {
          return { required: false, customers: [], expenses: [], users: [] };
      }

      const unmigratedCustomers = customersData.filter(c => !c.companyId);
      const unmigratedExpenses = expensesData.filter(e => !e.companyId);
      const unmigratedUsers = usersData.filter(u => u.role !== 'superadmin' && !u.companyId);

      return {
          required: unmigratedCustomers.length > 0 || unmigratedExpenses.length > 0 || unmigratedUsers.length > 0,
          customers: unmigratedCustomers,
          expenses: unmigratedExpenses,
          users: unmigratedUsers,
      }
  }, [user, customersData, usersData, expensesData]);
  
  // Now, create memoized lists for display, filtered by user role.
  const customers = useMemo(() => {
    if (!customersData) return [];
    if (user?.role === 'superadmin') return customersData.filter(c => c.status !== 'pending');;
    if (!user?.companyId) return [];
    // Admins and Agents only see non-pending customers from their company
    return customersData.filter(c => c.companyId === user.companyId && c.status !== 'pending');
  }, [customersData, user]);

  const expenses = useMemo(() => {
    if (!expensesData) return [];
    if (user?.role === 'superadmin') return expensesData;
    if (user?.role !== 'admin' || !user?.companyId) return [];
    // Admins only see expenses from their company
    return expensesData.filter(e => e.companyId === user.companyId);
  }, [expensesData, user]);

  
  const handleMigrateData = async () => {
    if (!firestore || user?.role !== 'superadmin') {
      toast({ variant: 'destructive', title: 'Error', description: 'You do not have permission to perform this action.' });
      return;
    }
    
    setIsMigrating(true);
    const batch = writeBatch(firestore);

    migrationData.customers.forEach(item => {
        const docRef = doc(firestore, 'customers', item.id);
        batch.update(docRef, { companyId: FINSERV_COMPANY_ID });
    });
    migrationData.expenses.forEach(item => {
        const docRef = doc(firestore, 'expenses', item.id);
        batch.update(docRef, { companyId: FINSERV_COMPANY_ID });
    });
    migrationData.users.forEach(item => {
        const docRef = doc(firestore, 'users', item.id);
        batch.update(docRef, { companyId: FINSERV_COMPANY_ID });
    });

    try {
      await batch.commit();
      toast({
        title: 'Migration Complete',
        description: 'All records have been successfully associated with the FINSERV company.'
      });
      // Data will refetch automatically due to useCollection hook
    } catch (error) {
      console.error("Migration failed:", error);
      toast({
        variant: 'destructive',
        title: 'Migration Failed',
        description: 'An error occurred during the data migration. Please check the console.'
      });
    } finally {
      setIsMigrating(false);
    }
  }


  const monthlyStats = useMemo(() => {
    const today = new Date();
    const startOfCurrentMonth = startOfMonth(today);
    const endOfCurrentMonth = endOfMonth(today);
    let expectedAmount = 0;
    let expectedCount = 0;

    customers.forEach(customer => {
        if (!customer.startDate) return; 
        const startDate = parseISO(customer.startDate);
        const loanMonths = eachMonthOfInterval({ start: startDate, end: addMonths(startDate, customer.duration) });

        loanMonths.forEach((monthDate, index) => {
            const emiDueDate = addMonths(startDate, index + 1);
            if (isWithinInterval(emiDueDate, { start: startOfCurrentMonth, end: endOfCurrentMonth })) {
                if (customer.status === 'active' || customer.status === 'overdue') {
                    expectedAmount += customer.monthlyEMI;
                    expectedCount += 1;
                }
            }
        });
    });

    const collectedAmount = customers
        .flatMap(c => c.payments || [])
        .filter(p => isWithinInterval(parseISO(p.date), { start: startOfCurrentMonth, end: endOfCurrentMonth }))
        .reduce((acc, p) => acc + p.amount, 0);

    const collectedCount = customers
        .flatMap(c => c.payments || [])
        .filter(p => isWithinInterval(parseISO(p.date), { start: startOfCurrentMonth, end: endOfCurrentMonth }))
        .length;

    return {
        expectedAmount,
        expectedCount,
        collectedAmount,
        collectedCount
    };
}, [customers]);

  if (isLoading || !user) {
      return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
  }

  const totalFinanced = customers.reduce((acc, c) => acc + c.financedAmount, 0);
  const totalInterest = customers.reduce((acc, c) => acc + c.interestAmount, 0);
  const totalExpenses = (expenses || []).reduce((acc, e) => acc + e.amount, 0);
  const profit = totalInterest - totalExpenses;

  const activeLoans = customers.filter(c => c.status === 'active' || c.status === 'overdue').length;

  const formatValue = (value: number) => {
    const roundedValue = Math.round(value);
    if (roundedValue >= 10000000) {
      return `₹${(roundedValue / 10000000).toFixed(2)}Cr`;
    }
    if (roundedValue >= 100000) {
      return `₹${(roundedValue / 100000).toFixed(2)}L`;
    }
    return `₹${roundedValue.toLocaleString('en-IN')}`;
  };

  const stats = [
      { title: "Total Financed", value: formatValue(totalFinanced), icon: TrendingUp },
      { title: "Active Loans", value: activeLoans, icon: Users },
      { title: (user?.role === 'admin' || user?.role === 'superadmin') ? "Net Profit" : "Potential Profit", value: formatValue(profit), icon: DollarSign },
  ];
  
  const collectionStat = {
    title: "Monthly Collection",
    value: `${formatValue(monthlyStats.collectedAmount)} / ${formatValue(monthlyStats.expectedAmount)}`,
    icon: HandCoins,
  };

  const emiCountStat = {
    title: "Monthly EMIs",
    value: `${monthlyStats.collectedCount} / ${monthlyStats.expectedCount} EMIs`,
    icon: ListChecks,
  };
  
  let finalStats = [...stats];
  finalStats.splice(1, 0, collectionStat);
  finalStats.splice(2, 0, emiCountStat);


  if (user?.role === 'admin' || user?.role === 'superadmin') {
      finalStats.splice(4, 0, { title: "Total Expenses", value: formatValue(totalExpenses), icon: Receipt });
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Here's a high-level overview of your financing business."
      />
        {user?.role === 'superadmin' && migrationData.required && (
            <Card className="mb-6 border-amber-500">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DatabaseZap className="h-6 w-6 text-amber-600" />
                        Data Migration Required
                    </CardTitle>
                    <CardDescription>
                        Some records are not associated with a company. This will prevent admin and agent users from seeing their data.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                        {migrationData.customers.length > 0 && <li>{migrationData.customers.length} customer(s) need to be updated.</li>}
                        {migrationData.expenses.length > 0 && <li>{migrationData.expenses.length} expense(s) need to be updated.</li>}
                        {migrationData.users.length > 0 && <li>{migrationData.users.length} user(s) need to be updated.</li>}
                    </ul>
                    <Button className="mt-4" onClick={handleMigrateData} disabled={isMigrating}>
                        {isMigrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Migrate Data to FINSERV Company
                    </Button>
                </CardContent>
            </Card>
        )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {finalStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Separator className="my-6 md:my-8" />
       <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Collection</CardTitle>
             <CardDescription>Total EMI amount collected each month vs expected.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <CollectionChart customers={customers} />
          </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Monthly EMI Collection Count</CardTitle>
                <CardDescription>Number of EMIs collected each month vs expected.</CardDescription>
            </CardHeader>
            <CardContent>
                <CollectionCountChart customers={customers} />
            </CardContent>
        </Card>
      </div>
      <Separator className="my-6 md:my-8" />
      <CapitalFlowTable customers={customers} />
    </>
  );
}
