
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
    const monthlyFlows = (customers || []).reduce(
      (acc, customer) => {
        // Outflow: New loan financed
        const startMonthKey = format(
          startOfMonth(parseISO(customer.startDate)),
          "yyyy-MM"
        );
        acc[startMonthKey] = acc[startMonthKey] || { collected: 0, financed: 0, withdrawn: 0 };
        acc[startMonthKey].financed += customer.financedAmount;

        // Inflow: Payments collected
        (customer.payments || []).forEach((payment) => {
          const paymentMonthKey = format(
            startOfMonth(parseISO(payment.date)),
            "yyyy-MM"
          );
          acc[paymentMonthKey] = acc[paymentMonthKey] || {
            collected: 0,
            financed: 0,
            withdrawn: 0
          };
          acc[paymentMonthKey].collected += payment.amount;
        });

        return acc;
      },
      {} as Record<string, { collected: number; financed: number; withdrawn: number }>
    );

    // Outflow: Approved withdrawals
    (withdrawals || []).forEach((withdrawal) => {
        if (withdrawal.processedAt) {
            const withdrawalMonthKey = format(
                startOfMonth(parseISO(withdrawal.processedAt)),
                "yyyy-MM"
            );
            monthlyFlows[withdrawalMonthKey] = monthlyFlows[withdrawalMonthKey] || { collected: 0, financed: 0, withdrawn: 0 };
            monthlyFlows[withdrawalMonthKey].withdrawn += withdrawal.amount;
        }
    });

    let runningBalance = 0;
    const sortedData = Object.entries(monthlyFlows)
      .map(([monthKey, flows]) => ({ monthKey, ...flows }))
      .sort((a, b) => new Date(a.monthKey).getTime() - new Date(b.monthKey).getTime())
      .map((data) => {
        const netFlow = data.collected - data.financed - data.withdrawn;
        runningBalance += netFlow;
        return {
          month: format(new Date(data.monthKey), "MMM yyyy"),
          collected: data.collected,
          financed: data.financed,
          withdrawn: data.withdrawn,
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
                    <TableCell colSpan={6} className="text-center h-24">
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
