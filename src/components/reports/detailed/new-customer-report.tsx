'use client';
import { useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Customer, WithId } from '@/types';
import { isWithinInterval, parseISO, format } from 'date-fns';

const formatCurrency = (amount: number) => `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

interface ReportProps {
    customers: WithId<Customer>[];
    dateRange?: DateRange;
}

export function NewCustomerReport({ customers, dateRange }: ReportProps) {
    const reportData = useMemo(() => {
        const dateFilter = (date: string) => !dateRange?.from || isWithinInterval(parseISO(date), { start: dateRange.from, end: dateRange.to || new Date() });
        return customers
            .filter(c => c.status !== 'pending' && dateFilter(c.startDate))
            .sort((a,b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime());
    }, [customers, dateRange]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>New Customer Acquisition</CardTitle>
                <CardDescription>Customers added in the selected period.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Start Date</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Agent</TableHead>
                            <TableHead className="text-right">Financed Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reportData.length > 0 ? reportData.map(c => (
                            <TableRow key={c.id}>
                                <TableCell>{format(parseISO(c.startDate), 'dd MMM, yyyy')}</TableCell>
                                <TableCell>{c.name}</TableCell>
                                <TableCell>{c.agent.name}</TableCell>
                                <TableCell className="text-right">{formatCurrency(c.financedAmount)}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={4} className="text-center h-24">No new customers in this period.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
