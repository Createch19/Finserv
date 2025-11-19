
"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DollarSign, Users, TrendingUp, HandCoins, Loader2, Receipt, ListChecks } from "lucide-react";
import { CollectionChart, CollectionCountChart } from "@/components/reports/charts";
import { Separator } from "@/components/ui/separator";
import { useCollection, useFirestore } from "@/firebase";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where } from "firebase/firestore";
import type { Customer, WithId, User, Expense } from "@/types";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, eachMonthOfInterval, addMonths } from "date-fns";
import { CapitalFlowTable } from "@/components/dashboard/capital-flow-table";

function getCustomersQuery(firestore: any, user: User | null) {
    if (!firestore || !user) return null;
    
    if (user.isSuperAdmin) {
        // Super admin sees all customers across all companies
        return collection(firestore, 'customers');
    }
    
    if (!user.companyId) return null; // Guard against undefined companyId
    // Admins and Agents are restricted to their companyId
    return query(collection(firestore, 'customers'), where('companyId', '==', user.companyId));
}

function getExpensesQuery(firestore: any, user: User | null) {
    if (!firestore || !user || (!user.isSuperAdmin && user.role !== 'admin')) return null;

    if (user.isSuperAdmin) {
        // Super admin sees all expenses
        return collection(firestore, 'expenses');
    }
    
    if (!user.companyId) return null; // Guard against undefined companyId
    // Regular admin sees expenses for their company
    return query(collection(firestore, 'expenses'), where('companyId', '==', user.companyId));
}

export default function DashboardPage() {
  const { user } = useAuth();
  const firestore = useFirestore();

  const customersQuery = useMemo(() => getCustomersQuery(firestore, user), [user, firestore]);
  const { data: customersData, isLoading: customersLoading } = useCollection<WithId<Customer>>(customersQuery);

  const expensesQuery = useMemo(() => getExpensesQuery(firestore, user), [user, firestore]);
  const { data: expenses, isLoading: expensesLoading } = useCollection<WithId<Expense>>(expensesQuery);
  
  const customers = useMemo(() => {
    if (!customersData) return [];
    // Filter out pending customers on the client.
    return customersData.filter(c => c.status !== 'pending');
  }, [customersData]);
  
  const isLoading = customersLoading || expensesLoading;

  const monthlyStats = useMemo(() => {
    const today = new Date();
    const startOfCurrentMonth = startOfMonth(today);
    const endOfCurrentMonth = endOfMonth(today);
    let expectedAmount = 0;
    let expectedCount = 0;

    customers.forEach(customer => {
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
      { title: (user?.role === 'admin' || user?.isSuperAdmin) ? "Net Profit" : "Potential Profit", value: formatValue(profit), icon: DollarSign },
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


  if (user?.role === 'admin' || user?.isSuperAdmin) {
      finalStats.splice(4, 0, { title: "Total Expenses", value: formatValue(totalExpenses), icon: Receipt });
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Here's a high-level overview of your financing business."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
