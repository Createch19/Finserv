"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DollarSign, Users, TrendingUp, Loader2, Receipt, Award, ChevronLeft, ChevronRight } from "lucide-react";
import { MonthlyCollectionChart, MonthlyCountChart } from "@/components/reports/charts";
import { Separator } from "@/components/ui/separator";
import { useCollection, useFirestore } from "@/firebase";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where } from "firebase/firestore";
import type { Customer, WithId, User, Expense, Company, WithdrawalRequest } from "@/types";
import { startOfMonth, endOfMonth, addMonths, format, isBefore, parseISO, isSameMonth, isAfter } from "date-fns";
import { CapitalFlowTable } from "@/components/dashboard/capital-flow-table";
import { CompanyDataOverview } from "@/components/dashboard/company-data-overview";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DashboardPage() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const userRole = user?.role;
  const userCompanyId = user?.companyId;

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));

  const allCompaniesQuery = useMemo(() => (firestore && userRole === 'superadmin') ? collection(firestore, 'companies') : null, [firestore, userRole]);
  const { data: allCompanies, isLoading: allCompaniesLoading } = useCollection<WithId<Company>>(allCompaniesQuery);
  
  const allUsersQuery = useMemo(() => (firestore && userRole === 'superadmin' && selectedCompanyId === 'all') ? collection(firestore, 'users') : null, [firestore, userRole, selectedCompanyId]);
  const { data: allUsers, isLoading: allUsersLoading } = useCollection<WithId<User>>(allUsersQuery);

  const customersQuery = useMemo(() => {
    if (!firestore || !userRole) return null;
    const baseQuery = collection(firestore, 'customers');
    if (userRole === 'superadmin') {
      if (selectedCompanyId === 'all') return baseQuery;
      return query(baseQuery, where("companyId", "==", selectedCompanyId));
    }
    return userCompanyId ? query(baseQuery, where("companyId", "==", userCompanyId)) : null;
  }, [firestore, userRole, userCompanyId, selectedCompanyId]);
  const { data: customers, isLoading: customersLoading } = useCollection<WithId<Customer>>(customersQuery);
  
  const expensesQuery = useMemo(() => {
    if (!firestore || (userRole !== 'admin' && userRole !== 'superadmin')) return null;
    const baseQuery = collection(firestore, 'expenses');
    if (userRole === 'superadmin') {
      if (selectedCompanyId === 'all') return baseQuery;
      return query(baseQuery, where("companyId", "==", selectedCompanyId));
    }
    return userCompanyId ? query(baseQuery, where("companyId", "==", userCompanyId)) : null;
  }, [firestore, userRole, userCompanyId, selectedCompanyId]);
  const { data: expenses, isLoading: expensesLoading } = useCollection<WithId<Expense>>(expensesQuery);

  const withdrawalsQuery = useMemo(() => {
    if (!firestore || (userRole !== 'admin' && userRole !== 'superadmin')) return null;
    const baseQuery = query(collection(firestore, "withdrawalRequests"), where('status', '==', 'approved'));
    if (userRole === 'superadmin') {
      if (selectedCompanyId === 'all') return baseQuery;
      return query(baseQuery, where("companyId", "==", selectedCompanyId));
    }
    return userCompanyId ? query(baseQuery, where("companyId", "==", userCompanyId)) : null;
  }, [firestore, userRole, userCompanyId, selectedCompanyId]);
  const { data: withdrawals, isLoading: withdrawalsLoading } = useCollection<WithId<WithdrawalRequest>>(withdrawalsQuery);
  
  const allCustomers = useCollection<WithId<Customer>>(useMemo(() => (firestore && userRole === 'superadmin' && selectedCompanyId === 'all') ? collection(firestore, 'customers') : null, [firestore, userRole, selectedCompanyId]));
  const allExpenses = useCollection<WithId<Expense>>(useMemo(() => (firestore && userRole === 'superadmin' && selectedCompanyId === 'all') ? collection(firestore, 'expenses') : null, [firestore, userRole, selectedCompanyId]));

  const isLoading = customersLoading || expensesLoading || withdrawalsLoading || allCompaniesLoading || (userRole === 'superadmin' && selectedCompanyId === 'all' && (allCustomers.isLoading || allUsersLoading || allExpenses.isLoading));

  const monthlyStats = useMemo(() => {
    if (!customers) return { expectedAmount: 0, expectedCount: 0, collectedAmount: 0, collectedCount: 0, pendingAmount: 0, newFiles: 0, completingFiles: 0, completedFiles: 0 };
    
    let expectedAmount = 0;
    let expectedCount = 0;
    let collectedAmount = 0;
    let collectedCount = 0;
    let newFiles = 0;
    let completingFiles = 0;
    let completedFiles = 0;

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    customers.filter(c => c.status !== 'pending').forEach(customer => {
        const startDate = parseISO(customer.startDate);
        const monthlyEmi = Math.round(customer.monthlyEMI);
        const totalPayable = Math.round(customer.totalPayable);
        const totalPaidAllTime = Math.round(customer.payments?.reduce((s, p) => s + Math.round(p.amount), 0) || 0);
        
        // Cashflow calculation: money received in this month
        const paidInThisMonth = Math.round(customer.payments?.filter(p => {
            const pDate = parseISO(p.date);
            return (isAfter(pDate, monthStart) || isSameMonth(pDate, monthStart)) && (isBefore(pDate, monthEnd) || isSameMonth(pDate, monthEnd));
        }).reduce((s, p) => s + Math.round(p.amount), 0) || 0);

        let expectedSoFar = 0;
        let expectedBeforeThisMonth = 0;

        for (let i = 1; i <= customer.duration; i++) {
            const emiDueDate = addMonths(startDate, i);
            if (isBefore(emiDueDate, monthStart)) {
                expectedBeforeThisMonth += monthlyEmi;
            }
            if (isBefore(emiDueDate, monthEnd)) {
                expectedSoFar += monthlyEmi;
            }
        }

        expectedSoFar = Math.min(expectedSoFar, totalPayable);
        expectedBeforeThisMonth = Math.min(expectedBeforeThisMonth, totalPayable);

        const paidBeforeThisMonth = Math.round(customer.payments?.filter(p => isBefore(parseISO(p.date), monthStart)).reduce((s, p) => s + Math.round(p.amount), 0) || 0);
        const arrears = Math.max(0, expectedBeforeThisMonth - paidBeforeThisMonth);
        const currentMonthTarget = Math.min(monthlyEmi, Math.max(0, expectedSoFar - expectedBeforeThisMonth));
        const totalDueThisMonth = arrears + currentMonthTarget;

        if (totalDueThisMonth > 0 || paidInThisMonth > 0) {
            expectedAmount += totalDueThisMonth;
            if (totalDueThisMonth > 0) expectedCount += 1;
            
            collectedAmount += paidInThisMonth;
            
            // Ledger-based count: did the customer settle their debt for this month?
            if (totalPaidAllTime >= expectedSoFar && totalDueThisMonth > 0) collectedCount++;
        }

        // New Files: Start date within this month
        if (isSameMonth(startDate, currentMonth)) newFiles++;

        // Completing Files
        const isLastMonthOfTerm = isSameMonth(addMonths(startDate, customer.duration), currentMonth);
        if (isLastMonthOfTerm) {
            completingFiles++;
            if (totalPaidAllTime >= totalPayable) completedFiles++;
        }
    });

    return {
        expectedAmount: Math.round(expectedAmount),
        expectedCount,
        collectedAmount: Math.round(collectedAmount),
        collectedCount,
        pendingAmount: Math.max(0, Math.round(expectedAmount - collectedAmount)),
        newFiles,
        completingFiles,
        completedFiles,
    };
  }, [customers, currentMonth]);

  if (isLoading || !user) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const totalFinanced = Math.round((customers || []).reduce((acc, c) => acc + c.financedAmount, 0));
  const totalInterest = Math.round((customers || []).reduce((acc, c) => acc + c.interestAmount, 0));
  const totalExpenses = Math.round((expenses || []).reduce((acc, e) => acc + e.amount, 0));
  const totalCommission = Math.round((customers || []).filter(c => c.status === 'completed' && c.commissionSettled).reduce((acc, c) => acc + (c.interestAmount * (c.agentCommissionRate || 0) / 100), 0));
  const profit = totalInterest - totalExpenses - totalCommission;
  const activeLoans = (customers || []).filter(c => c.status === 'active' || c.status === 'overdue').length;

  const formatValue = (v: number) => {
    const val = Math.round(v);
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const overallStats = [
      { title: "Total Financed", value: formatValue(totalFinanced), icon: TrendingUp },
      { title: "Active Loans", value: activeLoans, icon: Users },
      { title: (userRole === 'admin' || userRole === 'superadmin') ? "Net Profit" : "Potential Profit", value: formatValue(profit), icon: DollarSign },
      { title: "Total Expenses", value: formatValue(totalExpenses), icon: Receipt },
      { title: "Commissions Paid", icon: Award, value: formatValue(totalCommission) }
  ];
  
  return (
    <>
      <PageHeader title="Dashboard" description="Overview of your financing business.">
        {userRole === 'superadmin' && allCompanies && (
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select a company" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {allCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
            </Select>
        )}
      </PageHeader>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mt-6">
        {overallStats.slice(0, (userRole === 'admin' || userRole === 'superadmin') ? 5 : 3).map((stat, index) => (
          <Card key={index}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">{stat.title}</CardTitle><stat.icon className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-xl font-bold">{stat.value}</div></CardContent></Card>
        ))}
      </div>

      <Separator className="my-8" />
      
      {userRole === 'superadmin' && selectedCompanyId === 'all' && (
        <><CompanyDataOverview companies={allCompanies} customers={allCustomers.data} users={allUsers} expenses={allExpenses.data} /><Separator className="my-8" /></>
      )}

      <Card className="border-primary/20 shadow-sm">
        <CardHeader>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div><CardTitle>Monthly Overview</CardTitle><CardDescription>Collection performance based on cash received vs. total targets.</CardDescription></div>
                <div className="flex items-center gap-2 p-1 border rounded-md bg-background self-start md:self-center">
                    <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(prev => addMonths(prev, -1))}><ChevronLeft className="h-4 w-4" /></Button>
                    <div className="text-sm font-semibold w-32 text-center text-primary">{format(currentMonth, "MMMM yyyy")}</div>
                    <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
             <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 mb-6">
                <Card className="bg-primary/5 border-primary/10"><CardHeader className="p-3 pb-0"><CardTitle className="text-[10px] uppercase font-semibold text-muted-foreground">Monthly Collection</CardTitle></CardHeader><CardContent className="p-3 pt-1"><div className="text-lg font-bold">{formatValue(monthlyStats.collectedAmount)} / {formatValue(monthlyStats.expectedAmount)}</div></CardContent></Card>
                <Card className="bg-destructive/5 border-destructive/10"><CardHeader className="p-3 pb-0"><CardTitle className="text-[10px] uppercase font-semibold text-muted-foreground">Pending Shortfall</CardTitle></CardHeader><CardContent className="p-3 pt-1 text-destructive"><div className="text-lg font-bold">{formatValue(monthlyStats.pendingAmount)}</div></CardContent></Card>
                <Card className="bg-primary/5 border-primary/10"><CardHeader className="p-3 pb-0"><CardTitle className="text-[10px] uppercase font-semibold text-muted-foreground">Files Settled</CardTitle></CardHeader><CardContent className="p-3 pt-1"><div className="text-lg font-bold">{monthlyStats.collectedCount} / {monthlyStats.expectedCount}</div></CardContent></Card>
                <Card className="bg-primary/5 border-primary/10"><CardHeader className="p-3 pb-0"><CardTitle className="text-[10px] uppercase font-semibold text-muted-foreground">Full Loans Completed</CardTitle></CardHeader><CardContent className="p-3 pt-1"><div className="text-lg font-bold">{monthlyStats.completedFiles} / {monthlyStats.completingFiles}</div></CardContent></Card>
                <Card className="bg-primary/5 border-primary/10"><CardHeader className="p-3 pb-0"><CardTitle className="text-[10px] uppercase font-semibold text-muted-foreground">New Files Started</CardTitle></CardHeader><CardContent className="p-3 pt-1"><div className="text-lg font-bold">{monthlyStats.newFiles}</div></CardContent></Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card><CardHeader><CardTitle className="text-sm">Collection Trend</CardTitle></CardHeader><CardContent><MonthlyCollectionChart stats={monthlyStats} /></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm">EMI Volume</CardTitle></CardHeader><CardContent><MonthlyCountChart stats={monthlyStats} /></CardContent></Card>
            </div>
        </CardContent>
      </Card>
      
      <Separator className="my-8" />
      <CapitalFlowTable customers={customers || []} withdrawals={withdrawals || []} />
    </>
  );
}