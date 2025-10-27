
"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DollarSign, Users, TrendingUp, HandCoins, Loader2 } from "lucide-react";
import { CollectionChart, ProfitChart } from "@/components/reports/charts";
import { Separator } from "@/components/ui/separator";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Customer, WithId, User } from "@/types";

function getCustomersQuery(firestore: any, user: User | null) {
    if (!firestore || !user) return null;
    
    const customersCollection = collection(firestore, 'customers');
    
    // Admins can see all customers, agents only see their own.
    if (user.role === 'admin') {
        return customersCollection;
    } else {
        return query(customersCollection, where('agentId', '==', user.uid));
    }
}

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const customersQuery = useMemoFirebase(() => getCustomersQuery(firestore, user), [user, firestore]);
  const { data: customers, isLoading } = useCollection<WithId<Customer>>(customersQuery);

  if (isLoading || !customers) {
      return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
  }

  const totalFinanced = customers.reduce((acc, c) => acc + c.financedAmount, 0);
  const totalCollected = customers.flatMap(c => c.payments || []).reduce((acc, p) => acc + p.amount, 0);
  const totalInterest = customers.reduce((acc, c) => acc + c.interestAmount, 0);
  const profit = totalInterest; // Simplified for now

  const activeLoans = customers.filter(c => c.status === 'active' || c.status === 'overdue').length;

  const stats = [
      { title: "Total Financed", value: `₹${(totalFinanced / 1000).toFixed(1)}k`, icon: TrendingUp },
      { title: "Total Collected", value: `₹${(totalCollected / 1000).toFixed(1)}k`, icon: HandCoins },
      { title: "Active Loans", value: activeLoans, icon: Users },
      { title: "Potential Profit", value: `₹${(profit / 1000).toFixed(1)}k`, icon: DollarSign },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Here's a high-level overview of your financing business."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              {/* <p className="text-xs text-muted-foreground">
                {stat.title === "Total Profit" ? "All time profit" : `+${(Math.random() * 5).toFixed(1)}% from last month`}
              </p> */}
            </CardContent>
          </Card>
        ))}
      </div>
      <Separator className="my-6 md:my-8" />
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Monthly Collection</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <CollectionChart customers={customers} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Profit Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfitChart customers={customers} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
