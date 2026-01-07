
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
import { DollarSign, Users, TrendingUp, HandCoins, Loader2, Receipt, ListChecks, Award, ChevronLeft, ChevronRight, Hourglass } from "lucide-react";
import { MonthlyCollectionChart, MonthlyCountChart } from "@/components/reports/charts";
import { Separator } from "@/components/ui/separator";
import { useCollection, useFirestore } from "@/firebase";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where, Query } from "firebase/firestore";
import type { Customer, WithId, User, Expense, Company, WithdrawalRequest } from "@/types";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, eachMonthOfInterval, addMonths, subMonths, format, isSameMonth } from "date-fns";
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

  // State for company and month selection
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));

  // --- START: Data Fetching ---

  const allCompaniesQuery = useMemo(() => {
    if (firestore && userRole === 'superadmin') {
      return collection(firestore, 'companies');
    }
    return null;
  }, [firestore, userRole]);
  const { data: allCompanies, isLoading: allCompaniesLoading } = useCollection<WithId<Company>>(allCompaniesQuery);
  
  const allUsersQuery = useMemo(() => {
    if (firestore && userRole === 'superadmin' && selectedCompanyId === 'all') {
      return collection(firestore, 'users');
    }
    return null;
  }, [firestore, userRole, selectedCompanyId]);
  const { data: allUsers, isLoading: allUsersLoading } = useCollection<WithId<User>>(allUsersQuery);

  const customersQuery = useMemo(() => {
    if (!firestore || !userRole) return null;
    const baseQuery = collection(firestore, 'customers');

    if (userRole === 'superadmin') {
      if (selectedCompanyId === 'all') return baseQuery;
      return query(baseQuery, where("companyId", "==", selectedCompanyId));
    }
    
    if (userCompanyId) {
      return query(baseQuery, where("companyId", "==", userCompanyId));
    }
    return null;
  }, [firestore, userRole, userCompanyId, selectedCompanyId]);
  
  const { data: customers, isLoading: customersLoading } = useCollection<WithId<Customer>>(customersQuery);
  
  const expensesQuery = useMemo(() => {
    if (!firestore || (userRole !== 'admin' && userRole !== 'superadmin')) return null;
    const baseQuery = collection(firestore, 'expenses');
    
    if (userRole === 'superadmin') {
      if (selectedCompanyId === 'all') return baseQuery;
      return query(baseQuery, where("companyId", "==", selectedCompanyId));
    }
    
    if (userCompanyId) {
      return query(baseQuery, where("companyId", "==", userCompanyId));
    }
    return null;
  }, [firestore, userRole, userCompanyId, selectedCompanyId]);
  const { data: expenses, isLoading: expensesLoading } = useCollection<WithId<Expense>>(expensesQuery);

  const withdrawalsQuery = useMemo(() => {
    if (!firestore || (userRole !== 'admin' && userRole !== 'superadmin')) return null;
    const baseQuery = collection(firestore, "withdrawalRequests");
    const approvedQuery = query(baseQuery, where('status', '==', 'approved'));

    if (userRole === 'superadmin') {
      if (selectedCompanyId === 'all') return approvedQuery;
      return query(approvedQuery, where("companyId", "==", selectedCompanyId));
    }
    if (userCompanyId) {
      return query(approvedQuery, where("companyId", "==", userCompanyId));
    }
    return null;
  }, [firestore, userRole, userCompanyId, selectedCompanyId]);
  const { data: withdrawals, isLoading: withdrawalsLoading } = useCollection<WithId<WithdrawalRequest>>(withdrawalsQuery);
  
  const allCustomers = useCollection<WithId<Customer>>(useMemo(() => (firestore && userRole === 'superadmin' && selectedCompanyId === 'all') ? collection(firestore, 'customers') : null, [firestore, userRole, selectedCompanyId]));
  const allExpenses = useCollection<WithId<Expense>>(useMemo(() => (firestore && userRole === 'superadmin' && selectedCompanyId === 'all') ? collection(firestore, 'expenses') : null, [firestore, userRole, selectedCompanyId]));

  const isLoading = customersLoading || expensesLoading || withdrawalsLoading || allCompaniesLoading || (userRole === 'superadmin' && selectedCompanyId === 'all' && (allCustomers.isLoading || allUsersLoading || allExpenses.isLoading));
  
  // --- END: Data Fetching ---

  const changeMonth = (amount: number) => {
    setCurrentMonth(prev => addMonths(prev, amount));
  };


  const monthlyStats = useMemo(() => {
    if (!customers) return { expectedAmount: 0, expectedCount: 0, collectedAmount: 0, collectedCount: 0, pendingAmount: 0 };
    
    const startOfSelectedMonth = startOfMonth(currentMonth);
    const endOfSelectedMonth = endOfMonth(currentMonth);

    let expectedAmount = 0;
    let expectedCount = 0;
    let collectedCount = 0;

    customers.forEach(customer => {
        if (!customer.startDate || customer.duration <= 0) return;
        const paymentsCount = customer.payments?.length || 0;
        
        for (let i = 0; i < customer.duration; i++) {
          const dueDate = addMonths(new Date(customer.startDate), i + 1);
          if (isSameMonth(dueDate, currentMonth)) {
            expectedAmount += customer.monthlyEMI;
            expectedCount += 1;
            if (i < paymentsCount) {
                collectedCount += 1;
            }
          }
        }
    });

    const collectedAmount = (customers || [])
        .flatMap(c => c.payments || [])
        .filter(p => isWithinInterval(parseISO(p.date), { start: startOfSelectedMonth, end: endOfSelectedMonth }))
        .reduce((acc, p) => acc + p.amount, 0);

    const pendingAmount = expectedAmount - collectedAmount;

    return {
        expectedAmount,
        expectedCount,
        collectedAmount,
        collectedCount,
        pendingAmount
    };
}, [customers, currentMonth]);

  if (isLoading || !user) {
      return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
  }

  const totalFinanced = (customers || []).reduce((acc, c) => acc + c.financedAmount, 0);
  const totalInterest = (customers || []).reduce((acc, c) => acc + c.interestAmount, 0);
  const totalExpenses = (expenses || []).reduce((acc, e) => acc + e.amount, 0);
  const totalCommission = (customers || [])
        .filter(c => c.status === 'completed' && c.commissionSettled)
        .reduce((acc, c) => acc + (c.interestAmount * (c.agentCommissionRate || 0) / 100), 0);

  const profit = totalInterest - totalExpenses - totalCommission;

  const activeLoans = (customers || []).filter(c => c.status === 'active' || c.status === 'overdue').length;

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

  const overallStats = [
      { title: "Total Financed", value: formatValue(totalFinanced), icon: TrendingUp },
      { title: "Active Loans", value: activeLoans, icon: Users },
      { title: (user?.role === 'admin' || user?.role === 'superadmin') ? "Net Profit" : "Potential Profit", value: formatValue(profit), icon: DollarSign },
  ];
  
  if (user?.role === 'admin' || user?.role === 'superadmin') {
      overallStats.push({ title: "Total Expenses", value: formatValue(totalExpenses), icon: Receipt });
      overallStats.push({ title: "Commissions Paid", value: formatValue(totalCommission), icon: Award });
  }
  
  const isAllCompaniesSelected = userRole === 'superadmin' && selectedCompanyId === 'all';
  
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Here's a high-level overview of your financing business."
      >
        <div className="flex items-center gap-2">
            {userRole === 'superadmin' && allCompanies && (
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {allCompanies.map(company => (
                    <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                ))}
                </SelectContent>
            </Select>
            )}
        </div>
      </PageHeader>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mt-6">
        {overallStats.map((stat, index) => (
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
      
      {isAllCompaniesSelected && (
        <>
          <CompanyDataOverview
            companies={allCompanies}
            customers={allCustomers.data}
            users={allUsers}
            expenses={allExpenses.data}
          />
          <Separator className="my-6 md:my-8" />
        </>
      )}

      <Card className="border-primary/20">
        <CardHeader>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
                <div>
                    <CardTitle>Monthly Overview</CardTitle>
                    <CardDescription>Performance metrics for the selected month.</CardDescription>
                </div>
                 <div className="flex items-center gap-2 p-1 border rounded-md bg-background self-start md:self-center">
                    <Button variant="ghost" size="icon" onClick={() => changeMonth(-1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm font-semibold text-center w-28 text-primary">{format(currentMonth, "MMMM yyyy")}</div>
                    <Button variant="ghost" size="icon" onClick={() => changeMonth(1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Collection</CardTitle>
                    <HandCoins className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-xl font-bold">{`${formatValue(monthlyStats.collectedAmount)} / ${formatValue(monthlyStats.expectedAmount)}`}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
                        <Hourglass className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatValue(monthlyStats.pendingAmount)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monthly EMIs</CardTitle>
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-xl font-bold">{`${monthlyStats.collectedCount} / ${monthlyStats.expectedCount} EMIs`}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Collection Amount</CardTitle>
                  <CardDescription>Collected vs. Expected amount for {format(currentMonth, "MMMM yyyy")}.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <MonthlyCollectionChart stats={monthlyStats} />
                </CardContent>
              </Card>
              <Card>
                  <CardHeader>
                      <CardTitle>Monthly EMI Count</CardTitle>
                      <CardDescription>Collected vs. Expected EMIs for {format(currentMonth, "MMMM yyyy")}.</CardDescription>
                  </CardHeader>
                  <CardContent className="pl-2">
                      <MonthlyCountChart stats={monthlyStats} />
                  </CardContent>
              </Card>
            </div>
        </CardContent>
      </Card>
      
      <Separator className="my-6 md:my-8" />
      <CapitalFlowTable customers={customers || []} withdrawals={withdrawals || []} />
    </>
  );
}

    

    

