"use client";

import { customers } from "@/lib/demo-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isBefore, isAfter, differenceInDays } from "date-fns";
import Link from 'next/link';
import { Button } from "../ui/button";

type EmiStatus = "paid" | "due" | "overdue" | "upcoming";

type EmiEntry = {
  customerName: string;
  customerId: string;
  emiAmount: number;
  dueDate: Date;
  status: EmiStatus;
  emiNumber: number;
};

const getEmiStatus = (dueDate: Date, isPaid: boolean): EmiStatus => {
  if (isPaid) return "paid";
  const today = new Date();
  if (isBefore(dueDate, today)) return "overdue";
  if (differenceInDays(dueDate, today) <= 7) return "due";
  return "upcoming";
};

const allEmis = customers
  .flatMap((customer) => {
    const emis: EmiEntry[] = [];
    for (let i = 0; i < customer.duration; i++) {
      const dueDate = new Date(customer.startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      const isPaid = i < customer.payments.length;
      emis.push({
        customerName: customer.name,
        customerId: customer.id,
        emiAmount: customer.monthlyEMI,
        dueDate: dueDate,
        status: getEmiStatus(dueDate, isPaid),
        emiNumber: i + 1,
      });
    }
    return emis;
  })
  .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  
const activeEmis = allEmis.filter(emi => emi.status !== 'paid');

const getStatusBadgeVariant = (status: EmiStatus) => {
  switch (status) {
    case "paid": return "secondary";
    case "due": return "default";
    case "overdue": return "destructive";
    case "upcoming": return "outline";
    default: return "outline";
  }
};

export function EmiList() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active EMIs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeEmis.map((emi, index) => (
            <div key={`${emi.customerId}-${emi.emiNumber}`} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-lg border bg-card hover:bg-secondary/50 transition-colors">
              <div className="flex-1 mb-2 md:mb-0">
                <Link href={`/customers/${emi.customerId}`} className="font-medium hover:underline">{emi.customerName}</Link>
                <p className="text-sm text-muted-foreground">
                  EMI #{emi.emiNumber} due on {format(emi.dueDate, "PPP")}
                </p>
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <span className="font-semibold text-lg">₹{emi.emiAmount.toLocaleString()}</span>
                <Badge variant={getStatusBadgeVariant(emi.status)} className="capitalize w-20 justify-center">
                  {emi.status}
                </Badge>
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/customers/${emi.customerId}`}>Record Payment</Link>
                </Button>
              </div>
            </div>
          ))}
          {activeEmis.length === 0 && (
             <div className="text-center py-10 text-muted-foreground">
                <p>No active EMIs found. All payments are up to date!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
