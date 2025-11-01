
"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { CollectionChart, ProfitChart, LoanStatusChart, InterestRateChart, CollectionCountChart } from "@/components/reports/charts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCollection, useFirestore } from "@/firebase";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where } from "firebase/firestore";
import type { Customer, Expense, WithId, User } from "@/types";
import { Loader2 } from "lucide-react";

function getCustomersQuery(firestore: any, user: User | null) {
    if (!firestore || !user) return null;
    
    // Fetch all approved customers for both admins and agents.
    return query(collection(firestore, 'customers'), where('status', '!=', 'pending'));
}

function getExpensesQuery(firestore: any, user: User | null) {
    if (!firestore || !user || user.role !== 'admin') return null;
    return collection(firestore, 'expenses');
}

export default function ReportsPage() {
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

  return (
    <>
      <PageHeader
        title="Reports"
        description="Visualize your business performance with insightful charts."
      />
      <div className="grid gap-6">
        <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Monthly Collection Trend</CardTitle>
                    <CardDescription>Total EMI amount collected each month vs expected.</CardDescription>
                </CardHeader>
                <CardContent>
                    <CollectionChart customers={customers} height={350} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Monthly EMI Collection Count</CardTitle>
                    <CardDescription>Number of EMIs collected each month vs expected.</CardDescription>
                </CardHeader>
                <CardContent>
                    <CollectionCountChart customers={customers} height={350} />
                </CardContent>
            </Card>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Monthly Interest Rate</CardTitle>
                <CardDescription>Average interest rate for new loans created each month.</CardDescription>
            </CardHeader>
            <CardContent>
                <InterestRateChart customers={customers} height={350} />
            </CardContent>
        </Card>
         <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Profit vs Principal</CardTitle>
                    <CardDescription>Comparison of interest earned against the principal amount collected.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ProfitChart customers={customers} expenses={expenses} isAdmin={user?.role === 'admin'} height={300} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Loan Status</CardTitle>
                    <CardDescription>Distribution of active, completed, and overdue loans.</CardDescription>
                </CardHeader>
                <CardContent>
                    <LoanStatusChart customers={customers} height={300} />
                </CardContent>
            </Card>
         </div>
      </div>
    </>
  );
}
