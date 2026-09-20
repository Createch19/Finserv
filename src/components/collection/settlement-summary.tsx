
"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCollection, useFirestore } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Customer, WithId, Payment } from "@/types";
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2, Download, Filter } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";

const formatCurrency = (amount: number) => 
  Math.round(amount).toLocaleString('en-IN', { 
    maximumFractionDigits: 0, 
    style: 'currency', 
    currency: 'INR' 
  });

export function SettlementSummary() {
  const { user } = useAuth();
  const firestore = useFirestore();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });

  const customersQuery = useMemo(() => {
    if (!firestore || !user) return null;
    if (user.role === 'superadmin') return collection(firestore, 'customers');
    if (!user.companyId) return null;
    return query(collection(firestore, 'customers'), where('companyId', '==', user.companyId));
  }, [user, firestore]);

  const { data: customers, isLoading } = useCollection<WithId<Customer>>(customersQuery);

  const settlementData = useMemo(() => {
    if (!customers || !dateRange?.from) return { payments: [], total: 0 };

    const interval = {
      start: startOfDay(dateRange.from),
      end: endOfDay(dateRange.to || dateRange.from)
    };

    const allPayments: Array<{
      payment: Payment;
      customerName: string;
      customerId: string;
      emiNumber: string;
    }> = [];

    let totalAmount = 0;

    customers.forEach(customer => {
      // We need all payments for this customer to determine the EMI sequence
      const sortedPayments = [...(customer.payments || [])].sort((a, b) => 
        parseISO(a.date).getTime() - parseISO(b.date).getTime()
      );

      const emiAmount = Math.round(customer.monthlyEMI);

      sortedPayments.forEach((p, index) => {
        const paymentDate = parseISO(p.date);
        
        if (isWithinInterval(paymentDate, interval)) {
          // Calculate EMI number logic:
          // A customer might pay EMI #1 in multiple small payments or pay multiple EMIs in one shot.
          // For simplicity, we show the "cumulative installment coverage"
          const totalPaidUpToThis = sortedPayments
            .slice(0, index + 1)
            .reduce((sum, curr) => sum + curr.amount, 0);
          
          const startInstallment = Math.floor((totalPaidUpToThis - p.amount) / emiAmount) + 1;
          const endInstallment = Math.ceil(totalPaidUpToThis / emiAmount);
          
          let emiText = "";
          if (startInstallment === endInstallment) {
            emiText = `#${startInstallment}`;
          } else {
            emiText = `#${startInstallment}-${endInstallment}`;
          }

          allPayments.push({
            payment: p,
            customerName: customer.name,
            customerId: customer.id,
            emiNumber: emiText
          });
          
          totalAmount += p.amount;
        }
      });
    });

    // Sort by most recent payment date first
    allPayments.sort((a, b) => parseISO(b.payment.date).getTime() - parseISO(a.payment.date).getTime());

    return { payments: allPayments, total: totalAmount };
  }, [customers, dateRange]);

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-background p-4 rounded-lg border shadow-sm">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Filter className="h-3 w-3" /> Filter Period
          </h3>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[280px] justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        <Card className="bg-primary/5 border-primary/20 shadow-none min-w-[200px]">
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Total Period Collection</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-2xl font-bold text-primary">{formatCurrency(settlementData.total)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Collection Ledger</CardTitle>
            <CardDescription>Line-by-line audit of payments received in the selected range.</CardDescription>
          </div>
          {settlementData.payments.length > 0 && (
            <Button variant="ghost" size="sm" className="hidden sm:flex" onClick={() => window.print()}>
              <Download className="mr-2 h-4 w-4" /> Export Report
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>EMI Attribution</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead className="text-right">Amount Collected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlementData.payments.map((entry, idx) => (
                <TableRow key={`${entry.payment.paymentId}-${idx}`}>
                  <TableCell className="font-medium">
                    {format(parseISO(entry.payment.date), "dd MMM yyyy")}
                    <div className="text-[10px] text-muted-foreground">{format(parseISO(entry.payment.date), "hh:mm a")}</div>
                  </TableCell>
                  <TableCell className="uppercase font-semibold text-xs">
                    {entry.customerName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      EMI {entry.emiNumber}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-muted text-muted-foreground hover:bg-muted uppercase text-[9px] px-1.5">
                      {entry.payment.mode}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    {formatCurrency(entry.payment.amount)}
                  </TableCell>
                </TableRow>
              ))}
              {settlementData.payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No collection records found for the selected period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
