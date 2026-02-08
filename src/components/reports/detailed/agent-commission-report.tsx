'use client';
import { useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Customer, User, WithId } from '@/types';
import { isWithinInterval, parseISO, format } from 'date-fns';

const formatCurrency = (amount: number) => `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

interface ReportProps {
    customers: WithId<Customer>[];
    users: WithId<User>[];
    dateRange?: DateRange;
}

export function AgentCommissionReport({ customers, users, dateRange }: ReportProps) {
    const reportData = useMemo(() => {
        const dateFilter = (date: string) => !dateRange?.from || isWithinInterval(parseISO(date), { start: dateRange.from, end: dateRange.to || new Date() });
        
        const agentCommissions: Record<string, { agentName: string, totalCommission: number, loans: any[] }> = {};

        customers
            .filter(c => c.status === 'completed' && c.commissionSettled && c.payments.length > 0 && dateFilter(c.payments[c.payments.length - 1].date))
            .forEach(c => {
                const agentId = c.agent.uid;
                if (!agentCommissions[agentId]) {
                    agentCommissions[agentId] = { agentName: c.agent.name, totalCommission: 0, loans: [] };
                }
                const commissionAmount = c.interestAmount * (c.agentCommissionRate / 100);
                agentCommissions[agentId].totalCommission += commissionAmount;
                agentCommissions[agentId].loans.push({
                    customerName: c.name,
                    completionDate: c.payments[c.payments.length-1].date,
                    commissionAmount,
                });
            });

        return Object.values(agentCommissions).sort((a,b) => b.totalCommission - a.totalCommission);
    }, [customers, dateRange]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Agent Commission Statement</CardTitle>
                <CardDescription>Commissions paid to agents in the selected period.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                     <TableHeader>
                        <TableRow>
                            <TableHead>Agent</TableHead>
                            <TableHead>Completed Customer</TableHead>
                            <TableHead>Completion Date</TableHead>
                            <TableHead className="text-right">Commission Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reportData.length > 0 ? reportData.map(agent => (
                            agent.loans.map((loan, index) => (
                                <TableRow key={`${agent.agentName}-${loan.customerName}`}>
                                    {index === 0 && <TableCell rowSpan={agent.loans.length} className="font-medium align-top">{agent.agentName}</TableCell>}
                                    <TableCell>{loan.customerName}</TableCell>
                                    <TableCell>{format(parseISO(loan.completionDate), 'dd MMM, yyyy')}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(loan.commissionAmount)}</TableCell>
                                </TableRow>
                            ))
                        )) : (
                            <TableRow><TableCell colSpan={4} className="text-center h-24">No commissions paid in this period.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
