
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
import { DollarSign, Users, TrendingUp, HandCoins, Loader2, Receipt } from "lucide-react";
import { CollectionChart, ProfitChart, CollectionCountChart } from "@/components/reports/charts";
import { Separator } from "@/components/ui/separator";
import { useCollection, useFirestore } from "@/firebase";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where } from "firebase/firestore";
import type { Customer, WithId, User, Expense } from "@/types";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";

function getCustomersQuery(firestore: any, user: User | null) {
    if (!firestore || !user) return null;
    
    // Fetch all customers for both admins and agents.
    return collection(firestore, 'customers');
}

function getExpensesQuery(firestore: any, user: User | null) {
    if (!firestore || !user || user.role !== 'admin') return null;
    return collection(firestore, 'expenses');
}

export default function DashboardPage() {
  const { user } = useAuth();
  const firestore = useFirestore();

  const customersQuery = useMemo(() => getCustomersQuery(firestore, user), [user, firestore]);
  const { data: customers, isLoading: customersLoading } = useCollection<WithId<Customer>>(customersQuery);

  const expensesQuery = useMemo(() => getExpensesQuery(firestore, user), [user, firestore]);
  const { data: expenses, isLoading: expensesLoading } = useCollection<WithId<Expense>>(expensesQuery);
  
  const isLoading = customersLoading || expensesLoading;

  if (isLoading || !customers) {
      return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
  }

  const today = new Date();
  const startOfCurrentMonth = startOfMonth(today);
  const endOfCurrentMonth = endOfMonth(today);

  const totalFinanced = customers.reduce((acc, c) => acc + c.financedAmount, 0);
  const monthlyCollected = customers
    .flatMap(c => c.payments || [])
    .filter(p => isWithinInterval(parseISO(p.date), { start: startOfCurrentMonth, end: endOfCurrentMonth }))
    .reduce((acc, p) => acc + p.amount, 0);
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
      { title: "Monthly Collection", value: formatValue(monthlyCollected), icon: HandCoins },
      { title: "Active Loans", value: activeLoans, icon: Users },
      { title: user?.role === 'admin' ? "Net Profit" : "Potential Profit", value: formatValue(profit), icon: DollarSign },
  ];

  if (user?.role === 'admin') {
      stats.splice(3, 0, { title: "Total Expenses", value: formatValue(totalExpenses), icon: Receipt });
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Here's a high-level overview of your financing business."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
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
            <CollectionChart customers={customers} height={250} />
          </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Monthly EMI Collection Count</CardTitle>
                <CardDescription>Number of EMIs collected each month vs expected.</CardDescription>
            </CardHeader>
            <CardContent>
                <CollectionCountChart customers={customers} height={250} />
            </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Profit Analysis</CardTitle>
             <CardDescription>Comparison of interest earned against the principal amount collected and expenses.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfitChart customers={customers} expenses={expenses} isAdmin={user?.role === 'admin'}/>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
