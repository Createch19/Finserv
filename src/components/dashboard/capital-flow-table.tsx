
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
import type { Customer, WithId } from "@/types";
import { format, parseISO, startOfMonth } from "date-fns";

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

export function CapitalFlowTable({
  customers,
}: {
  customers: WithId<Customer>[];
}) {
  const capitalFlowData = useMemo(() => {
    const monthlyFlows = (customers || []).reduce(
      (acc, customer) => {
        // Outflow: New loan financed
        const startMonthKey = format(
          startOfMonth(parseISO(customer.startDate)),
          "MMM yyyy"
        );
        acc[startMonthKey] = acc[startMonthKey] || { collected: 0, financed: 0 };
        acc[startMonthKey].financed += customer.financedAmount;

        // Inflow: Payments collected
        (customer.payments || []).forEach((payment) => {
          const paymentMonthKey = format(
            startOfMonth(parseISO(payment.date)),
            "MMM yyyy"
          );
          acc[paymentMonthKey] = acc[paymentMonthKey] || {
            collected: 0,
            financed: 0,
          };
          acc[paymentMonthKey].collected += payment.amount;
        });

        return acc;
      },
      {} as Record<string, { collected: number; financed: number }>
    );

    let runningBalance = 0;
    return Object.entries(monthlyFlows)
      .map(([month, flows]) => ({ month, ...flows }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .map((data) => {
        const netFlow = data.collected - data.financed;
        runningBalance += netFlow;
        return {
          month: data.month,
          collected: data.collected,
          financed: data.financed,
          netFlow: netFlow,
          capitalPool: runningBalance,
        };
      })
      .reverse(); // Show most recent months first
  }, [customers]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capital Reinvestment Flow</CardTitle>
        <CardDescription>
          Monthly breakdown of capital collected vs. new capital financed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Collected (Inflow)</TableHead>
              <TableHead className="text-right">Financed (Outflow)</TableHead>
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
                    <TableCell colSpan={5} className="text-center h-24">
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
