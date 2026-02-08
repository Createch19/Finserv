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

export function CollectionDetailsReport({ customers, dateRange }: ReportProps) {
    const reportData = useMemo(() => {
        const payments = customers.flatMap(c => 
            c.payments.map(p => ({...p, customerName: c.name, customerId: c.id}))
        );

        const dateFilter = (date: string) => !dateRange?.from || isWithinInterval(parseISO(date), { start: dateRange.from, end: dateRange.to || new Date() });
        
        return payments.filter(p => dateFilter(p.date)).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    }, [customers, dateRange]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Collection Details</CardTitle>
                <CardDescription>Line-item list of all payments in the selected period.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Payment Date</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Payment Mode</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reportData.length > 0 ? reportData.map(p => (
                            <TableRow key={p.paymentId}>
                                <TableCell>{format(parseISO(p.date), 'dd MMM, yyyy')}</TableCell>
                                <TableCell>{p.customerName}</TableCell>
                                <TableCell className="capitalize">{p.mode}</TableCell>
                                <TableCell className="text-right">{formatCurrency(p.amount)}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={4} className="text-center h-24">No payments in this period.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
