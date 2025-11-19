
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DollarSign, Users, TrendingUp, HandCoins, Loader2, Receipt, ListChecks, DatabaseZap, TriangleAlert } from "lucide-react";
import { CollectionChart, CollectionCountChart } from "@/components/reports/charts";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCollection, useFirestore } from "@/firebase";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where, writeBatch, doc } from "firebase/firestore";
import type { Customer, WithId, User, Expense } from "@/types";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, eachMonthOfInterval, addMonths } from "date-fns";
import { CapitalFlowTable } from "@/components/dashboard/capital-flow-table";

// Define a default company ID for migration. This should match the one in your seed script.
const DEFAULT_MIGRATION_COMPANY_ID = '9213b6c3-634c-4cf1-be66-8b79a73bc43b';

function getCustomersQuery(firestore: any, user: User | null) {
  if (!firestore || !user) return null;
  
  if (user.role === 'superadmin') {
      // Super admin sees all customers across all companies
      return collection(firestore, 'customers');
  }
  
  // For other roles, companyId is required.
  if (!user.companyId) return null;

  // Admins and Agents are restricted to their companyId
  return query(collection(firestore, 'customers'), where('companyId', '==', user.companyId));
}

function getExpensesQuery(firestore: any, user: User | null) {
  if (!firestore || !user || (user.role !== 'superadmin' && user.role !== 'admin')) return null;

  if (user.role === 'superadmin') {
      // Super admin sees all expenses
      return collection(firestore, 'expenses');
  }
  
  // For admin role, companyId is required.
  if (!user.companyId) return null;

  // Regular admin sees expenses for their company
  return query(collection(firestore, 'expenses'), where('companyId', '==', user.companyId));
}

function getUsersQuery(firestore: any, user: User | null) {
    if (!firestore || !user || user.role !== 'superadmin') return null;
    return collection(firestore, 'users');
}


export default function DashboardPage() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isMigrating, setIsMigrating] = useState(false);


  const customersQuery = useMemo(() => getCustomersQuery(firestore, user), [user, firestore]);
  const { data: customersData, isLoading: customersLoading } = useCollection<WithId<Customer>>(customersQuery);

  const expensesQuery = useMemo(() => getExpensesQuery(firestore, user), [user, firestore]);
  const { data: expensesData, isLoading: expensesLoading } = useCollection<WithId<Expense>>(expensesQuery);
  
  const usersQuery = useMemo(() => getUsersQuery(firestore, user), [user, firestore]);
  const { data: usersData, isLoading: usersLoading } = useCollection<WithId<User>>(usersQuery);
  
  const customers = useMemo(() => {
    if (!customersData) return [];
    // For non-superadmins, filter out pending customers. Superadmin can see all.
    if (user?.role === 'superadmin') return customersData;
    return customersData.filter(c => c.status !== 'pending');
  }, [customersData, user]);

  const expenses = useMemo(() => expensesData || [], [expensesData]);

  const unmigratedCustomers = useMemo(() => {
    if (user?.role !== 'superadmin' || !customersData) return [];
    return customersData.filter(c => !c.companyId);
  }, [user, customersData]);
  
  const unmigratedExpenses = useMemo(() => {
    if (user?.role !== 'superadmin' || !expensesData) return [];
    return expensesData.filter(e => !e.companyId);
  }, [user, expensesData]);

  const unmigratedUsers = useMemo(() => {
    if (user?.role !== 'superadmin' || !usersData) return [];
    return usersData.filter(u => !u.companyId && u.role !== 'superadmin'); // Don't migrate the superadmin itself
  }, [user, usersData]);

  const unmigratedCount = unmigratedCustomers.length + unmigratedExpenses.length + unmigratedUsers.length;
  
  const isLoading = customersLoading || expensesLoading || usersLoading;

  const handleMigrateData = async () => {
    if (!firestore || unmigratedCount === 0 || user?.role !== 'superadmin') return;

    setIsMigrating(true);
    try {
        const batch = writeBatch(firestore);
        
        unmigratedCustomers.forEach(customer => {
            const customerRef = doc(firestore, 'customers', customer.id);
            batch.update(customerRef, { companyId: DEFAULT_MIGRATION_COMPANY_ID });
        });
        
        unmigratedExpenses.forEach(expense => {
            const expenseRef = doc(firestore, 'expenses', expense.id);
            batch.update(expenseRef, { companyId: DEFAULT_MIGRATION_COMPANY_ID });
        });
        
        unmigratedUsers.forEach(appUser => {
            const userRef = doc(firestore, 'users', appUser.id);
            batch.update(userRef, { companyId: DEFAULT_MIGRATION_COMPANY_ID });
        });

        await batch.commit();

        toast({
            title: "Migration Successful",
            description: `${unmigratedCount} records have been successfully assigned to the default company. Admins and agents can now see their data.`,
        });
    } catch (error) {
        console.error("Migration failed: ", error);
        toast({
            variant: "destructive",
            title: "Migration Failed",
            description: "An error occurred while migrating data. Check the console for details.",
        });
    } finally {
        setIsMigrating(false);
    }
  };

  const monthlyStats = useMemo(() => {
    const today = new Date();
    const startOfCurrentMonth = startOfMonth(today);
    const endOfCurrentMonth = endOfMonth(today);
    let expectedAmount = 0;
    let expectedCount = 0;

    customers.forEach(customer => {
        if (!customer.startDate) return; // Skip if no start date
        const startDate = parseISO(customer.startDate);
        const loanMonths = eachMonthOfInterval({ start: startDate, end: addMonths(startDate, customer.duration) });

        loanMonths.forEach((monthDate, index) => {
            // The first EMI is due one month after the start date
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

  if (isLoading || !customers) {
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

        {user?.role === 'superadmin' && unmigratedCount > 0 && (
            <Alert variant="destructive" className="mb-6">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Action Required: Data Migration</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                    <div>
                        <p>
                            Detected {unmigratedCount} records (customers, expenses, users) that are not assigned to a company.
                            This will prevent admin/agent users from seeing their data.
                        </p>
                         <p className="font-semibold">Please run the one-time migration to resolve this.</p>
                    </div>
                    <Button onClick={handleMigrateData} disabled={isMigrating}>
                        {isMigrating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <DatabaseZap className="mr-2 h-4 w-4" />
                        )}
                        Migrate Data
                    </Button>
                </AlertDescription>
            </Alert>
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
