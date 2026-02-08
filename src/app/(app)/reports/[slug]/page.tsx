"use client";

import { useState, useMemo } from "react";
import { useParams, notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { useCollection, useFirestore } from "@/firebase";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where } from "firebase/firestore";
import type { Customer, Expense, WithId, User } from "@/types";
import { Loader2 } from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { DateRange } from "react-day-picker";
import { DetailedReportFilters } from "@/components/reports/detailed/detailed-report-filters";
import { DetailedReportRenderer } from "@/components/reports/detailed/detailed-report-renderer";


const reportDetails: Record<string, { title: string; description: string }> = {
    'profit-and-loss': { title: 'Profit & Loss (P&L) Report', description: 'Analyze revenue, costs, and net profit.' },
    'collection-details': { title: 'Detailed Collection Report', description: 'View a line-by-line list of all EMI payments received.' },
    'overdue-accounts': { title: 'Overdue Accounts Report', description: 'Track all customers with overdue payments.' },
    'loan-ledger': { title: 'Full Loan Ledger', description: 'A complete overview of all loans in the system.' },
    'agent-commission-statement': { title: 'Agent Commission Statement', description: 'Review commissions earned by agents.' },
    'new-customer-acquisition': { title: 'New Customer Acquisition', description: 'Report of new customers added over time.' },
};


export default function DetailedReportPage() {
    const params = useParams();
    const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
    const reportInfo = reportDetails[slug];

    const { user } = useAuth();
    const firestore = useFirestore();
    
    // State for filters
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [selectedCustomer, setSelectedCustomer] = useState<string>('all');

    // --- Data Fetching ---
    const customersQuery = useMemo(() => {
        if (!firestore || !user) return null;
        const baseQuery = collection(firestore, 'customers');
        if (user.role === 'superadmin') {
            return baseQuery;
        }
        if (!user.companyId) return null;
        return query(baseQuery, where('companyId', '==', user.companyId));
    }, [firestore, user]);
    const { data: customersData, isLoading: customersLoading } = useCollection<WithId<Customer>>(customersQuery);

    const expensesQuery = useMemo(() => {
        if (!firestore || !user || (user.role !== 'admin' && user.role !== 'superadmin')) return null;
        const baseQuery = collection(firestore, 'expenses');
        if (user.role === 'superadmin') {
            return baseQuery;
        }
        if (!user.companyId) return null;
        return query(baseQuery, where("companyId", '==', user.companyId));
    }, [firestore, user]);
    const { data: expenses, isLoading: expensesLoading } = useCollection<WithId<Expense>>(expensesQuery);
    
    const usersQuery = useMemo(() => {
        if (!firestore || !user) return null;
        const baseQuery = collection(firestore, 'users');
        if (user.role === 'superadmin') {
            return baseQuery;
        }
        if (!user.companyId) return null;
        return query(baseQuery, where('companyId', '==', user.companyId));
    }, [firestore, user]);
    const {data: users, isLoading: usersLoading} = useCollection<WithId<User>>(usersQuery);
    // --- End Data Fetching ---


    // --- Filtering Logic ---
    const filteredCustomers = useMemo(() => {
        if (!customersData) return [];
        return customersData.filter(customer => {
            const statusMatch = selectedStatus === 'all' || customer.status === selectedStatus;
            const customerMatch = selectedCustomer === 'all' || customer.id === selectedCustomer;
            
            // For date range, logic depends on the report. This is a generic pre-filter.
            // Specific reports will handle date logic more granularly.
            const dateMatch = !dateRange?.from || new Date(customer.startDate) >= dateRange.from;

            return statusMatch && customerMatch && dateMatch;
        });
    }, [customersData, selectedStatus, selectedCustomer, dateRange]);


    const isLoading = customersLoading || expensesLoading || usersLoading || !user;

    if (!reportInfo) {
        notFound();
    }
    
    const resetFilters = () => {
        setDateRange(undefined);
        setSelectedStatus('all');
        setSelectedCustomer('all');
    }

    return (
        <>
            <PageHeader title={reportInfo.title} description={reportInfo.description}>
                <Link href="/reports" passHref>
                    <Button variant="outline">
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back to Reports
                    </Button>
                </Link>
            </PageHeader>
            
            {isLoading ? (
                 <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-6">
                    <DetailedReportFilters 
                        customers={customersData || []}
                        dateRange={dateRange}
                        setDateRange={setDateRange}
                        selectedStatus={selectedStatus}
                        setSelectedStatus={setSelectedStatus}
                        selectedCustomer={selectedCustomer}
                        setSelectedCustomer={setSelectedCustomer}
                        resetFilters={resetFilters}
                        slug={slug}
                    />
                    <DetailedReportRenderer 
                        slug={slug}
                        customers={filteredCustomers}
                        expenses={expenses || []}
                        users={users || []}
                        dateRange={dateRange}
                    />
                </div>
            )}
        </>
    )
}
