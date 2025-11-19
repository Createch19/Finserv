
"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { CollectionChart, ProfitChart, LoanStatusChart, CollectionCountChart, NewCustomersChart, ExpenseByTypeChart, CapitalFlowChart } from "@/components/reports/charts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCollection, useFirestore } from "@/firebase";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where } from "firebase/firestore";
import type { Customer, Expense, WithId, User } from "@/types";
import { Loader2 } from "lucide-react";

function getCustomersQuery(firestore: any, user: User | null) {
    if (!firestore || !user) return null;
    
    if (user.role === 'superadmin') {
        return collection(firestore, 'customers');
    }

    if (!user.companyId) return null;
    return query(collection(firestore, 'customers'), where('companyId', '==', user.companyId));
}

function getExpensesQuery(firestore: any, user: User | null) {
    if (!firestore || !user) return null;

    if (user.role === 'superadmin') {
        return collection(firestore, 'expenses');
    }
    
    if (!user.companyId || user.role !== 'admin') return null;
    
    return query(collection(firestore, "expenses"), where('companyId', '==', user.companyId));
}


export default function ReportsPage() {
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
        <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>New Customers by Month</CardTitle>
                    <CardDescription>Count of new customers approved each month.</CardDescription>
                </CardHeader>
                <CardContent>
                    <NewCustomersChart customers={customers} height={350} />
                </CardContent>
            </Card>
            {(user?.role === 'admin' || user?.role === 'superadmin') && expenses && expenses.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Expenses by Type</CardTitle>
                        <CardDescription>Breakdown of expenses by category.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ExpenseByTypeChart expenses={expenses} height={300} />
                    </CardContent>
                </Card>
            )}
        </div>
         <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Profit vs Principal</CardTitle>
                    <CardDescription>Comparison of interest earned against the principal amount collected.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ProfitChart customers={customers} expenses={expenses} isAdmin={user?.role === 'admin' || user?.role === 'superadmin'} height={300} />
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
        <Card>
            <CardHeader>
                <CardTitle>Capital Reinvestment Flow</CardTitle>
                <CardDescription>Tracks the flow of collected EMIs being reinvested into new loans.</CardDescription>
            </CardHeader>
            <CardContent>
                <CapitalFlowChart customers={customers} height={350} />
            </CardContent>
        </Card>
      </div>
    </>
  );
}
