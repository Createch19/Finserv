
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
import { DollarSign, Users, TrendingUp, HandCoins, Loader2, Receipt, ListChecks } from "lucide-react";
import { CollectionChart, CollectionCountChart } from "@/components/reports/charts";
import { Separator } from "@/components/ui/separator";
import { useCollection, useFirestore } from "@/firebase";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where, Query } from "firebase/firestore";
import type { Customer, WithId, User, Expense, Company, WithdrawalRequest } from "@/types";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, eachMonthOfInterval, addMonths } from "date-fns";
import { CapitalFlowTable } from "@/components/dashboard/capital-flow-table";
import { CompanyDataOverview } from "@/components/dashboard/company-data-overview";
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

  // New state for super admin's company selection
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');

  // --- START: Data Fetching ---

  // Queries for Super Admin data overview and company selector
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

  // General data fetching logic based on role and selection
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
  
  const { data: rawCustomers, isLoading: customersLoading } = useCollection<WithId<Customer>>(customersQuery);
  
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
  
  // Data for the 'all companies' overview table doesn't need to be re-fetched, just filtered.
  const allCustomers = useCollection<WithId<Customer>>(useMemo(() => (firestore && userRole === 'superadmin' && selectedCompanyId === 'all') ? collection(firestore, 'customers') : null, [firestore, userRole, selectedCompanyId]));
  const allExpenses = useCollection<WithId<Expense>>(useMemo(() => (firestore && userRole === 'superadmin' && selectedCompanyId === 'all') ? collection(firestore, 'expenses') : null, [firestore, userRole, selectedCompanyId]));

  const isLoading = customersLoading || expensesLoading || withdrawalsLoading || allCompaniesLoading || (userRole === 'superadmin' && selectedCompanyId === 'all' && (allCustomers.isLoading || allUsersLoading || allExpenses.isLoading));
  
  // --- END: Data Fetching ---
  
  const customers = useMemo(() => {
    if (!rawCustomers) return [];
    return rawCustomers.filter(c => c.status !== 'pending');
  }, [rawCustomers]);


  const monthlyStats = useMemo(() => {
    if (!customers) return { expectedAmount: 0, expectedCount: 0, collectedAmount: 0, collectedCount: 0 };
    const today = new Date();
    const startOfCurrentMonth = startOfMonth(today);
    const endOfCurrentMonth = endOfMonth(today);
    let expectedAmount = 0;
    let expectedCount = 0;

    customers.forEach(customer => {
        if (!customer.startDate) return; 
        const startDate = parseISO(customer.startDate);
        if (customer.duration <= 0) return;
        const loanMonths = eachMonthOfInterval({ start: startDate, end: addMonths(startDate, customer.duration - 1) });

        loanMonths.forEach((_, index) => {
            const emiDueDate = addMonths(startDate, index + 1);
            if (isWithinInterval(emiDueDate, { start: startOfCurrentMonth, end: endOfCurrentMonth })) {
                if (customer.status === 'active' || customer.status === 'overdue') {
                    expectedAmount += customer.monthlyEMI;
                    expectedCount += 1;
                }
            }
        });
    });

    const collectedAmount = (customers || [])
        .flatMap(c => c.payments || [])
        .filter(p => isWithinInterval(parseISO(p.date), { start: startOfCurrentMonth, end: endOfCurrentMonth }))
        .reduce((acc, p) => acc + p.amount, 0);

    const collectedCount = (customers || [])
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
  const profit = totalInterest - totalExpenses;

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
      >
        {userRole === 'superadmin' && allCompanies && (
          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
            <SelectTrigger className="w-[200px]">
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
      </PageHeader>
      
      {user?.role === 'superadmin' && selectedCompanyId === 'all' && (
        <CompanyDataOverview
          companies={allCompanies}
          customers={allCustomers.data}
          users={allUsers}
          expenses={allExpenses.data}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-6">
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
            <CollectionChart customers={customers || []} />
          </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Monthly EMI Collection Count</CardTitle>
                <CardDescription>Number of EMIs collected each month vs expected.</CardDescription>
            </CardHeader>
            <CardContent>
                <CollectionCountChart customers={customers || []} />
            </CardContent>
        </Card>
      </div>
      <Separator className="my-6 md:my-8" />
      <CapitalFlowTable customers={customers || []} withdrawals={withdrawals || []} />
    </>
  );
}

    