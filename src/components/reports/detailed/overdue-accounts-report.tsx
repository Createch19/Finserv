'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Customer, WithId } from '@/types';
import { differenceInDays, addMonths, parseISO, startOfDay } from 'date-fns';

const formatCurrency = (amount: number) => `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

interface ReportProps {
    customers: WithId<Customer>[];
}

export function OverdueAccountsReport({ customers }: ReportProps) {
    const reportData = useMemo(() => {
        return customers
            .filter(c => c.status === 'overdue')
            .map(c => {
                const paymentsMade = c.payments.length;
                const nextDueDate = addMonths(parseISO(c.startDate), paymentsMade + 1);
                const overdueDays = differenceInDays(startOfDay(new Date()), startOfDay(nextDueDate));
                const overdueAmount = c.monthlyEMI * (Math.floor(overdueDays / 30) + 1); // Simple overdue calc
                return {
                    ...c,
                    overdueDays: overdueDays > 0 ? overdueDays : 0,
                    overdueAmount,
                }
            })
            .sort((a,b) => b.overdueDays - a.overdueDays);
    }, [customers]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Overdue Accounts</CardTitle>
                <CardDescription>Actionable list of all customers with overdue payments.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead className="text-right">Overdue Days</TableHead>
                            <TableHead className="text-right">Pending Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reportData.length > 0 ? reportData.map(c => (
                            <TableRow key={c.id}>
                                <TableCell>{c.name}</TableCell>
                                <TableCell>{c.phone}</TableCell>
                                <TableCell className="text-right font-medium text-destructive">{c.overdueDays} days</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(c.totalPayable - c.payments.reduce((s,p) => s + p.amount, 0))}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={4} className="text-center h-24">No overdue accounts.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
