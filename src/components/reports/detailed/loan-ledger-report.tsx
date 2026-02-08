'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Customer, WithId } from '@/types';
import { parseISO, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const formatCurrency = (amount: number) => `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const getStatusBadgeVariant = (status: Customer['status']) => {
  switch (status) {
    case 'active': return 'default';
    case 'completed': return 'secondary';
    case 'overdue': return 'destructive';
    case 'pending': return 'outline'
    default: return 'outline';
  }
};

interface ReportProps {
    customers: WithId<Customer>[];
}

export function LoanLedgerReport({ customers }: ReportProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Loan Ledger</CardTitle>
                <CardDescription>A complete list of all loans matching your filters.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Financed Amount</TableHead>
                            <TableHead className="text-right">Total Payable</TableHead>
                            <TableHead className="text-right">Remaining Balance</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {customers.length > 0 ? customers.map(c => {
                            const remaining = c.totalPayable - c.payments.reduce((s,p) => s + p.amount, 0);
                            return (
                            <TableRow key={c.id}>
                                <TableCell>{c.name}</TableCell>
                                <TableCell>{format(parseISO(c.startDate), 'dd MMM, yyyy')}</TableCell>
                                <TableCell><Badge variant={getStatusBadgeVariant(c.status)} className="capitalize">{c.status}</Badge></TableCell>
                                <TableCell className="text-right">{formatCurrency(c.financedAmount)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(c.totalPayable)}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(remaining)}</TableCell>
                            </TableRow>
                        )}) : (
                            <TableRow><TableCell colSpan={6} className="text-center h-24">No loans match the current filters.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
