
"use client";

import { PageHeader } from "@/components/page-header";
import { CollectionChart, ProfitChart, LoanStatusChart } from "@/components/reports/charts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useUser, useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Customer, WithId } from "@/types";
import { Loader2 } from "lucide-react";

export default function ReportsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const customersRef = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/customers`) : null, [user, firestore]);
  const { data: customers, isLoading } = useCollection<WithId<Customer>>(customersRef);

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
        <Card>
            <CardHeader>
                <CardTitle>Monthly Collection Trend</CardTitle>
                <CardDescription>Total EMI amount collected each month.</CardDescription>
            </CardHeader>
            <CardContent>
                <CollectionChart customers={customers} height={350} />
            </CardContent>
        </Card>
         <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Profit vs Principal</CardTitle>
                    <CardDescription>Comparison of interest earned against the principal amount collected.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ProfitChart customers={customers} height={300} />
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
