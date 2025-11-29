
"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Customer, WithdrawalRequest, WithId } from "@/types";
import { format, parseISO, startOfMonth } from "date-fns";

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

export function CapitalFlowTable({
  customers,
  withdrawals,
}: {
  customers: WithId<Customer>[];
  withdrawals: WithId<WithdrawalRequest>[];
}) {
  const capitalFlowData = useMemo(() => {
    const monthlyFlows: Record<string, { collected: number; financed: number; withdrawn: number; commission: number }> = {};

    const ensureMonth = (key: string) => {
        if (!monthlyFlows[key]) {
            monthlyFlows[key] = { collected: 0, financed: 0, withdrawn: 0, commission: 0 };
        }
    };

    (customers || []).forEach((customer) => {
        // Outflow: New loan financed
        const startMonthKey = format(startOfMonth(parseISO(customer.startDate)), "yyyy-MM");
        ensureMonth(startMonthKey);
        monthlyFlows[startMonthKey].financed += customer.financedAmount;

        // Inflow: Payments collected
        (customer.payments || []).forEach((payment) => {
            const paymentMonthKey = format(startOfMonth(parseISO(payment.date)), "yyyy-MM");
            ensureMonth(paymentMonthKey);
            monthlyFlows[paymentMonthKey].collected += payment.amount;
        });

        // Outflow: Agent commission on completion
        if (customer.status === 'completed' && customer.commissionSettled && customer.payments?.length > 0) {
            const lastPayment = customer.payments[customer.payments.length - 1];
            const commissionMonthKey = format(startOfMonth(parseISO(lastPayment.date)), "yyyy-MM");
            ensureMonth(commissionMonthKey);
            const commissionAmount = customer.interestAmount * (customer.agentCommissionRate || 0) / 100;
            monthlyFlows[commissionMonthKey].commission += commissionAmount;
        }
    });

    // Outflow: Approved withdrawals
    (withdrawals || []).forEach((withdrawal) => {
        if (withdrawal.processedAt) {
            const withdrawalMonthKey = format(startOfMonth(parseISO(withdrawal.processedAt)), "yyyy-MM");
            ensureMonth(withdrawalMonthKey);
            monthlyFlows[withdrawalMonthKey].withdrawn += withdrawal.amount;
        }
    });

    let runningBalance = 0;
    const sortedData = Object.entries(monthlyFlows)
      .map(([monthKey, flows]) => ({ monthKey, ...flows }))
      .sort((a, b) => new Date(a.monthKey).getTime() - new Date(b.monthKey).getTime())
      .map((data) => {
        const netFlow = data.collected - data.financed - data.withdrawn - data.commission;
        runningBalance += netFlow;
        return {
          month: format(new Date(data.monthKey), "MMM yyyy"),
          collected: data.collected,
          financed: data.financed,
          withdrawn: data.withdrawn,
          commission: data.commission,
          netFlow: netFlow,
          capitalPool: runningBalance,
        };
      });
      
    return sortedData.reverse(); // Show most recent months first
  }, [customers, withdrawals]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capital Reinvestment Flow</CardTitle>
        <CardDescription>
          Monthly breakdown of capital collected vs. new capital financed and withdrawn.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Collected (Inflow)</TableHead>
              <TableHead className="text-right">Financed (Outflow)</TableHead>
              <TableHead className="text-right">Withdrawn (Outflow)</TableHead>
              <TableHead className="text-right">Commissions (Outflow)</TableHead>
              <TableHead className="text-right">Net Flow</TableHead>
              <TableHead className="text-right">Capital Pool</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {capitalFlowData.map((row) => (
              <TableRow key={row.month}>
                <TableCell>{row.month}</TableCell>
                <TableCell className="text-right text-green-600">{formatCurrency(row.collected)}</TableCell>
                <TableCell className="text-right text-red-600">{formatCurrency(row.financed)}</TableCell>
                <TableCell className="text-right text-red-600">{formatCurrency(row.withdrawn)}</TableCell>
                <TableCell className="text-right text-red-600">{formatCurrency(row.commission)}</TableCell>
                <TableCell className={`text-right font-medium ${row.netFlow >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(row.netFlow)}
                </TableCell>
                <TableCell className="text-right font-bold text-primary">
                  {formatCurrency(row.capitalPool)}
                </TableCell>
              </TableRow>
            ))}
            {capitalFlowData.length === 0 && (
                <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">
                        No financial activity recorded yet.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

    