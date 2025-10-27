
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isBefore, differenceInDays, startOfDay, isWithinInterval } from "date-fns";
import Link from 'next/link';
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { Customer, Payment } from "@/types";
import { useUser, useCollection, useFirestore, FirestorePermissionError, errorEmitter, useMemoFirebase } from "@/firebase";
import { collection, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';

type EmiStatus = "paid" | "due" | "overdue" | "upcoming";

type EmiEntry = {
  customerName: string;
  customerId: string;
  emiAmount: number;
  dueDate: Date;
  status: EmiStatus;
  emiNumber: number;
  isPaid: boolean;
};

const getEmiStatus = (dueDate: Date, isPaid: boolean): EmiStatus => {
  if (isPaid) return "paid";
  const today = startOfDay(new Date());
  if (isBefore(startOfDay(dueDate), today)) return "overdue";
  if (differenceInDays(startOfDay(dueDate), today) <= 7) return "due";
  return "upcoming";
};

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
  const { user } = useUser();
  const firestore = useFirestore();
  const customersRef = useMemoFirebase(() => user && firestore ? collection(firestore, `users/${user.uid}/customers`) : null, [user, firestore]);
  const { data: customers, isLoading } = useCollection<Customer>(customersRef);

  const [statusFilter, setStatusFilter] = useState<"all" | EmiStatus>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedEmi, setSelectedEmi] = useState<EmiEntry | null>(null);
  const { toast } = useToast();


  const allEmis = useMemo(() => {
    if (!customers) return [];
    return customers
      .flatMap((customer) => {
        if (!customer.duration) return [];
        const emis: EmiEntry[] = [];
        for (let i = 0; i < customer.duration; i++) {
          const dueDate = new Date(customer.startDate);
          dueDate.setMonth(dueDate.getMonth() + i + 1);
          const isPaid = i < (customer.payments?.length || 0);
          emis.push({
            customerName: customer.name,
            customerId: customer.id,
            emiAmount: customer.monthlyEMI,
            dueDate: dueDate,
            status: getEmiStatus(dueDate, isPaid),
            emiNumber: i + 1,
            isPaid,
          });
        }
        return emis;
      })
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [customers]);

  const filteredEmis = useMemo(() => {
    return allEmis.filter(emi => {
      const statusMatch = statusFilter === 'all' || emi.status === statusFilter;
      const dateMatch = !dateRange || !dateRange.from || isWithinInterval(emi.dueDate, { start: dateRange.from, end: dateRange.to || dateRange.from });
      return statusMatch && dateMatch;
    });
  }, [allEmis, statusFilter, dateRange]);
  
  const handleRecordPayment = async () => {
    if (!selectedEmi || !user || !firestore) return;

    const customer = customers?.find(c => c.id === selectedEmi.customerId);
    if (!customer) return;

     // Check if payment for this EMI is already recorded
    if (customer.payments?.length >= selectedEmi.emiNumber) {
        toast({
            variant: "destructive",
            title: "Payment Already Recorded",
            description: `EMI #${selectedEmi.emiNumber} has already been paid.`,
        });
        setSelectedEmi(null);
        return;
    }

    const currentTotalPaid = customer.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;

    const newPayment: Payment = {
      id: uuidv4(),
      date: new Date().toISOString(),
      amount: selectedEmi.emiAmount,
      mode: 'cash',
      remainingBalance: customer.totalPayable - currentTotalPaid - selectedEmi.emiAmount,
    };
    
    const customerDocRef = doc(firestore, `users/${user.uid}/customers`, selectedEmi.customerId);
    
    const newStatus = (customer.payments?.length || 0) + 1 === customer.duration ? 'completed' : 'active';

    const updatePayload = {
      payments: arrayUnion(newPayment),
      status: newStatus
    };

    updateDoc(customerDocRef, updatePayload).then(() => {
        toast({
            title: "Payment Recorded",
            description: `Payment of ₹${selectedEmi?.emiAmount.toLocaleString()} for ${selectedEmi?.customerName} has been recorded.`,
        });
    }).catch(serverError => {
        const permissionError = new FirestorePermissionError({
          path: customerDocRef.path,
          operation: 'update',
          requestResourceData: updatePayload,
        });
        errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
        setSelectedEmi(null);
    });
  };

  if (isLoading) {
      return (
          <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
          </div>
      )
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>EMI Tracker</CardTitle>
        <CardDescription>View, filter, and manage all customer EMIs.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="due">Due</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
            </Select>

            <Popover>
                <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className="w-full sm:w-[300px] justify-start text-left font-normal"
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                    dateRange.to ? (
                        `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`
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
            
            {(statusFilter !== 'all' || dateRange) && (
                <Button variant="ghost" onClick={() => { setStatusFilter('all'); setDateRange(undefined); }}>
                    Clear Filters
                </Button>
            )}

        </div>
        <div className="space-y-4">
          {filteredEmis.map((emi) => (
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
                <Button variant="outline" size="sm" onClick={() => setSelectedEmi(emi)} disabled={emi.isPaid}>
                    Record Payment
                </Button>
              </div>
            </div>
          ))}
          {filteredEmis.length === 0 && (
             <div className="text-center py-10 text-muted-foreground">
                <p>No EMIs match the current filters.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>

    <AlertDialog open={!!selectedEmi} onOpenChange={(open) => !open && setSelectedEmi(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
            <AlertDialogDescription>
                Are you sure you want to record a payment of <strong>₹{selectedEmi?.emiAmount.toLocaleString()}</strong> for <strong>{selectedEmi?.customerName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRecordPayment}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
