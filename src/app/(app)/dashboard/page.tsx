import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DollarSign, Users, TrendingUp, HandCoins } from "lucide-react";
import { customers } from "@/lib/demo-data";
import { CollectionChart, ProfitChart } from "@/components/reports/charts";
import { Separator } from "@/components/ui/separator";

// In a real app, these calculations would be done on the server or with database queries.
const totalFinanced = customers.reduce((acc, c) => acc + c.financedAmount, 0);
const totalCollected = customers.flatMap(c => c.payments).reduce((acc, p) => acc + p.amount, 0);
const totalInterest = customers.reduce((acc, c) => acc + c.interestAmount, 0);
const profit = totalCollected - (totalFinanced - (totalInterest - customers.flatMap(c => c.payments.filter(p => p.date >= '2024-01-01T00:00:00.000Z')).reduce((acc,p) => acc + p.amount, 0) ));

const activeLoans = customers.filter(c => c.status === 'active' || c.status === 'overdue').length;

const isDueThisWeek = (dateStr: string) => {
  const due = new Date(dateStr);
  const today = new Date();
  const nextWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
  return due >= today && due <= nextWeek;
}

// A simplified due payments logic
const dueThisWeekCount = customers.filter(c => {
    if (c.status !== 'active') return false;
    const nextDueDate = new Date(c.startDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + c.payments.length);
    return isDueThisWeek(nextDueDate.toISOString());
}).length;


const stats = [
    { title: "Total Financed", value: `₹${(totalFinanced / 1000).toFixed(1)}k`, icon: TrendingUp },
    { title: "Total Collected", value: `₹${(totalCollected / 1000).toFixed(1)}k`, icon: HandCoins },
    { title: "Active Loans", value: activeLoans, icon: Users },
    { title: "Total Profit", value: `₹${(profit / 1000).toFixed(1)}k`, icon: DollarSign },
];

export default function DashboardPage() {
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
              <p className="text-xs text-muted-foreground">
                {stat.title === "Total Profit" ? "All time profit" : `+${(Math.random() * 5).toFixed(1)}% from last month`}
              </p>
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
            <CollectionChart />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Profit Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfitChart />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
