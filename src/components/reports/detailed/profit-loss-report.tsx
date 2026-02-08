'use client';

import { useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Customer, Expense, WithId } from '@/types';
import { isWithinInterval, parseISO } from 'date-fns';

const formatCurrency = (amount: number) => `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

interface ReportProps {
    customers: WithId<Customer>[];
    expenses: WithId<Expense>[];
    dateRange?: DateRange;
}

export function ProfitLossReport({ customers, expenses, dateRange }: ReportProps) {
    const reportData = useMemo(() => {
        const dateFilter = (date: string) => !dateRange?.from || isWithinInterval(parseISO(date), { start: dateRange.from, end: dateRange.to || new Date() });

        const totalInterest = customers.flatMap(c => c.payments)
            .filter(p => dateFilter(p.date))
            .reduce((sum, p) => sum + (p.amount * (c.interestAmount / c.totalPayable))), 0);
        
        const totalExpenses = expenses
            .filter(e => dateFilter(e.date))
            .reduce((sum, e) => sum + e.amount, 0);
            
        const totalCommission = customers
            .filter(c => c.status === 'completed' && c.commissionSettled && c.payments.length > 0 && dateFilter(c.payments[c.payments.length - 1].date))
            .reduce((sum, c) => sum + (c.interestAmount * (c.agentCommissionRate / 100)), 0);
            
        const netProfit = totalInterest - totalExpenses - totalCommission;

        return {
            totalInterest,
            totalExpenses,
            totalCommission,
            netProfit
        };
    }, [customers, expenses, dateRange]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Profit & Loss Summary</CardTitle>
                <CardDescription>A summary of revenue and costs for the selected period.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-medium">Total Interest Revenue</TableCell>
                            <TableCell className="text-right text-green-600">{formatCurrency(reportData.totalInterest)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium text-red-600 pl-8">Total Expenses</TableCell>
                            <TableCell className="text-right text-red-600">({formatCurrency(reportData.totalExpenses)})</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium text-red-600 pl-8">Total Commissions Paid</TableCell>
                            <TableCell className="text-right text-red-600">({formatCurrency(reportData.totalCommission)})</TableCell>
                        </TableRow>
                         <TableRow className="border-t-2 border-primary">
                            <TableCell className="font-bold text-lg">Net Profit</TableCell>
                            <TableCell className={`text-right font-bold text-lg ${reportData.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(reportData.netProfit)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
