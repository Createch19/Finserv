
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isBefore, differenceInDays, startOfDay, addMonths } from "date-fns";
import Link from 'next/link';
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import type { Customer, Payment, WithId, User } from "@/types";
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

const getOverallLoanStatus = (emis: EmiEntry[]) => {
    if (emis.every(e => e.status === 'paid')) return 'completed';
    if (emis.some(e => e.status === 'overdue')) return 'overdue';
    return 'active';
}

function getCustomersQuery(firestore: any, user: User | null) {
    if (!firestore || !user) return null;
    return collection(firestore, 'customers');
}

export function EmiList() {
  const { user } = useUser();
  const firestore = useFirestore();
  const customersQuery = useMemoFirebase(() => getCustomersQuery(firestore, user), [user, firestore]);
  const { data: customers, isLoading } = useCollection<WithId<Customer>>(customersQuery);

  const [loanStatusFilter, setLoanStatusFilter] = useState<"all" | "active" | "overdue" | "completed">("all");
  const [selectedEmi, setSelectedEmi] = useState<EmiEntry | null>(null);
  const { toast } = useToast();

  const loans = useMemo(() => {
    if (!customers) return [];
    
    return customers.map(customer => {
        const emis: EmiEntry[] = [];
        const startDate = new Date(customer.startDate);
        for (let i = 0; i < customer.duration; i++) {
          const dueDate = addMonths(startDate, i + 1);
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
        
        const paidCount = emis.filter(e => e.isPaid).length;
        const overallStatus = getOverallLoanStatus(emis);

        return {
            ...customer,
            emis,
            paidCount,
            overallStatus
        };
    }).sort((a,b) => (a.overallStatus === 'overdue' ? -1 : 1)); // Bring overdue to top

  }, [customers]);

  const filteredLoans = useMemo(() => {
      if (loanStatusFilter === 'all') return loans;
      return loans.filter(loan => loan.overallStatus === loanStatusFilter);
  }, [loans, loanStatusFilter]);
  
  const handleRecordPayment = async () => {
    if (!selectedEmi || !user || !firestore) return;

    const customer = customers?.find(c => c.id === selectedEmi.customerId);
    if (!customer) return;

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
      paymentId: uuidv4(),
      date: new Date().toISOString(),
      amount: selectedEmi.emiAmount,
      mode: 'cash',
      remainingBalance: customer.totalPayable - currentTotalPaid - selectedEmi.emiAmount,
    };
    
    const customerDocRef = doc(firestore, `customers`, selectedEmi.customerId);
    
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
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <Select value={loanStatusFilter} onValueChange={(value) => setLoanStatusFilter(value as any)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Loans</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
            </Select>
            {loanStatusFilter !== 'all' && (
                <Button variant="ghost" onClick={() => setLoanStatusFilter('all')}>
                    Clear Filter
                </Button>
            )}
        </div>
        <Accordion type="single" collapsible className="w-full">
            {filteredLoans.map(loan => (
                <AccordionItem value={loan.id} key={loan.id}>
                    <AccordionTrigger className="hover:bg-muted/50 px-4 rounded-md">
                        <div className="flex flex-col md:flex-row md:items-center justify-between w-full">
                           <div className="flex-1 text-left">
                             <Link href={`/customers/${loan.id}`} className="font-medium hover:underline">{loan.name}</Link>
                             <p className="text-sm text-muted-foreground">{loan.phoneModel}</p>
                           </div>
                           <div className="flex items-center gap-4 mt-2 md:mt-0">
                                <div className="text-sm text-muted-foreground w-28 text-right">
                                    {loan.paidCount} / {loan.duration} Paid
                                </div>
                                <Progress value={(loan.paidCount / loan.duration) * 100} className="w-24 h-2" />
                                <Badge variant={getOverallLoanStatus(loan.emis) === 'overdue' ? 'destructive' : 'default'} className="capitalize w-24 justify-center">
                                    {loan.overallStatus}
                                </Badge>
                           </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pt-2 pb-4 border-t">
                        <div className="space-y-2 mt-4">
                            {loan.emis.map(emi => (
                                <div key={emi.emiNumber} className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 rounded-lg border bg-card hover:bg-secondary/50 transition-colors">
                                    <div className="flex-1 mb-2 md:mb-0">
                                        <p className="font-medium text-sm">
                                            EMI #{emi.emiNumber}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                           Due on {format(emi.dueDate, "PPP")}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <span className="font-semibold">₹{emi.emiAmount.toLocaleString()}</span>
                                        <Badge variant={getStatusBadgeVariant(emi.status)} className="capitalize w-20 justify-center">
                                        {emi.status}
                                        </Badge>
                                        <Button variant="outline" size="sm" onClick={() => setSelectedEmi(emi)} disabled={emi.isPaid}>
                                            Record Payment
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
         {filteredLoans.length === 0 && (
             <div className="text-center py-10 text-muted-foreground">
                <p>No loans match the current filters.</p>
            </div>
          )}
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
