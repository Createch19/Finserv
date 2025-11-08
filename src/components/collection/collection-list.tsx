
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isBefore, startOfDay, addMonths, isSameMonth, parseISO, subMonths } from "date-fns";
import Link from 'next/link';
import { Button, buttonVariants } from "../ui/button";
import { Loader2, CalendarIcon, CheckCircle2, XCircle, Clock, CalendarDays, Undo2, Check, ChevronLeft, ChevronRight, MoreVertical, Banknote, ListChecks, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import type { Customer, Payment, WithId, User } from "@/types";
import { useCollection, useFirestore, FirestorePermissionError, errorEmitter } from "@/firebase";
import { useAuth } from "@/hooks/use-auth";
import { collection, doc, updateDoc, arrayUnion, arrayRemove, query, orderBy } from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';
import { cn } from "@/lib/utils";
import { Label } from "../ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type EmiStatus = "paid" | "due" | "overdue" | "upcoming" | "pending";

type EmiEntry = {
  customerName: string;
  customerId: string;
  emiAmount: number;
  dueDate: Date;
  status: EmiStatus;
  emiNumber: number;
  totalEmis: number;
  isPaid: boolean;
  isLastPaid: boolean;
  canBePaid: boolean;
  paidDate?: Date | null;
  overdueDays?: number;
};

const getEmiStatus = (dueDate: Date, isPaid: boolean, canBePaid: boolean): EmiStatus => {
  if (isPaid) return "paid";
  if (!canBePaid) return "pending"; // Not the next due EMI
  const today = startOfDay(new Date());
  if (isBefore(startOfDay(dueDate), today)) return "overdue";
  if (isSameMonth(startOfDay(dueDate), today)) return "due";
  return "upcoming";
};

const getStatusAttributes = (status: EmiStatus) => {
    switch (status) {
        case "paid": return { icon: <CheckCircle2 />, className: "text-green-500", variant: "secondary", text: "Paid" };
        case "overdue": return { icon: <XCircle />, className: "text-destructive", variant: "destructive", text: "Overdue" };
        case "due": return { icon: <Clock />, className: "text-primary", variant: "default", text: "Due" };
        case "upcoming": return { icon: <CalendarDays />, className: "text-muted-foreground", variant: "outline", text: "Upcoming" };
        case "pending": return { icon: <MoreVertical />, className: "text-muted-foreground", variant: "outline", text: "Pending" };
    }
}

const formatCurrency = (amount: number) => amount.toLocaleString('en-IN', { maximumFractionDigits: 0, style: 'currency', currency: 'INR' });


export function CollectionList() {
  const { user, loading: userLoading } = useAuth();
  const firestore = useFirestore();

  const customersQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'customers'), orderBy('name', 'asc'));
  }, [user, firestore]);

  const { data: customersData, isLoading: customersLoading } = useCollection<WithId<Customer>>(customersQuery);
  const customers = useMemo(() => customersData?.filter(c => c.status !== 'pending') || [], [customersData]);

  const [currentMonth, setCurrentMonth] = useState(startOfDay(new Date()));
  const [selectedEmiForPayment, setSelectedEmiForPayment] = useState<EmiEntry | null>(null);
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [selectedEmiForRevoke, setSelectedEmiForRevoke] = useState<EmiEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const isLoading = userLoading || (customersLoading);

  const monthlyEmis = useMemo(() => {
    if (!customers) return [];
    
    const allEmis: EmiEntry[] = [];
    customers.forEach(customer => {
        const paymentsCount = customer.payments?.length || 0;
        for (let i = 0; i < customer.duration; i++) {
          const dueDate = addMonths(new Date(customer.startDate), i + 1);

          if (isSameMonth(dueDate, currentMonth)) {
            const isPaid = i < paymentsCount;
            const canBePaid = i === paymentsCount;
            const status = getEmiStatus(dueDate, isPaid, canBePaid);
            const isLastPaid = isPaid && i === paymentsCount - 1;
            
            let paidDate: Date | null = null;
            if (isPaid && customer.payments && customer.payments[i]) {
                paidDate = parseISO(customer.payments[i].date);
            }

            let overdueDays: number | undefined = undefined;
            if (status === 'overdue') {
                overdueDays = isBefore(startOfDay(dueDate), startOfDay(new Date())) ? Math.abs(Math.floor((startOfDay(dueDate).getTime() - startOfDay(new Date()).getTime()) / (1000 * 3600 * 24))) : 0;
            }

            allEmis.push({
              customerName: customer.name,
              customerId: customer.id,
              emiAmount: customer.monthlyEMI,
              dueDate: dueDate,
              status: status,
              emiNumber: i + 1,
              totalEmis: customer.duration,
              isPaid,
              isLastPaid,
              canBePaid,
              paidDate,
              overdueDays,
            });
          }
        }
    });

    return allEmis.sort((a, b) => a.dueDate.getDate() - b.dueDate.getDate());

  }, [customers, currentMonth]);

    const filteredEmis = useMemo(() => {
        if (!monthlyEmis) return [];
        const lowercasedFilter = searchTerm.toLowerCase();
        return monthlyEmis.filter(emi => 
            emi.customerName.toLowerCase().includes(lowercasedFilter)
        );
    }, [monthlyEmis, searchTerm]);

    const monthlyStats = useMemo(() => {
        const expectedAmount = monthlyEmis.reduce((sum, emi) => sum + emi.emiAmount, 0);
        const collectedAmount = monthlyEmis.filter(e => e.isPaid).reduce((sum, emi) => sum + emi.emiAmount, 0);
        const expectedCount = monthlyEmis.length;
        const collectedCount = monthlyEmis.filter(e => e.isPaid).length;
        
        return {
            expectedAmount,
            collectedAmount,
            expectedCount,
            collectedCount
        }
    }, [monthlyEmis]);


  const handleRecordPayment = async () => {
    if (!selectedEmiForPayment || !user || !firestore || !paymentDate) return;

    const customer = customers?.find(c => c.id === selectedEmiForPayment.customerId);
    if (!customer) return;

    if (!selectedEmiForPayment.canBePaid) {
        toast({
            variant: "destructive",
            title: "Invalid Payment",
            description: "You can only pay the next due EMI for a customer.",
        });
        setSelectedEmiForPayment(null);
        return;
    }

    const currentTotalPaid = customer.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;

    const newPayment: Payment = {
      paymentId: uuidv4(),
      date: paymentDate.toISOString(),
      amount: selectedEmiForPayment.emiAmount,
      mode: 'cash',
      remainingBalance: customer.totalPayable - currentTotalPaid - selectedEmiForPayment.emiAmount,
    };
    
    const customerDocRef = doc(firestore, `customers`, selectedEmiForPayment.customerId);
    
    const newStatus = (customer.payments?.length || 0) + 1 === customer.duration ? 'completed' : 'active';
    
    const updatePayload = {
      payments: arrayUnion(newPayment),
      status: newStatus
    };

    updateDoc(customerDocRef, updatePayload).then(() => {
        toast({
            title: "Payment Recorded",
            description: `Payment of ${formatCurrency(selectedEmiForPayment?.emiAmount)} for ${selectedEmiForPayment?.customerName} has been recorded.`,
        });
    }).catch(serverError => {
        const permissionError = new FirestorePermissionError({
          path: customerDocRef.path,
          operation: 'update',
          requestResourceData: updatePayload,
        });
        errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
        setSelectedEmiForPayment(null);
        setPaymentDate(new Date());
    });
  };

  const handleRevokePayment = async () => {
    if (!selectedEmiForRevoke || !firestore) return;

    const customer = customers?.find(c => c.id === selectedEmiForRevoke.customerId);
    if (!customer || !customer.payments || customer.payments.length === 0) return;

    const lastPayment = customer.payments[customer.payments.length - 1];
    
    const customerDocRef = doc(firestore, 'customers', selectedEmiForRevoke.customerId);
    const newStatus = customer.status === 'completed' ? 'active' : customer.status;

    const updatePayload = {
      payments: arrayRemove(lastPayment),
      status: newStatus,
    };

    updateDoc(customerDocRef, updatePayload).then(() => {
      toast({
        title: "Payment Revoked",
        description: `Last payment for ${customer.name} has been successfully revoked.`,
      });
    }).catch(serverError => {
      const permissionError = new FirestorePermissionError({
        path: customerDocRef.path,
        operation: 'update',
        requestResourceData: updatePayload,
      });
      errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
      setSelectedEmiForRevoke(null);
    });
  };
  
  const changeMonth = (amount: number) => {
    setCurrentMonth(prev => addMonths(prev, amount));
  }

  if (isLoading) {
      return (
        <div className="flex-1 p-4 md:p-6">
          <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      )
  }

  return (
    <TooltipProvider>
    <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 p-4 md:px-6 md:pt-6 border-b">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
            <div className="flex justify-center items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-semibold text-center w-48">{format(currentMonth, "MMMM yyyy")}</h2>
                <Button variant="outline" size="icon" onClick={() => changeMonth(1)}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
            <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by customer..."
                    className="w-full rounded-lg bg-background pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Collection</CardTitle>
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(monthlyStats.collectedAmount)} / <span className="text-muted-foreground">{formatCurrency(monthlyStats.expectedAmount)}</span></div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">EMIs Collected</CardTitle>
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{monthlyStats.collectedCount} / <span className="text-muted-foreground">{monthlyStats.expectedCount} EMIs</span></div>
                </CardContent>
            </Card>
        </div>
    </div>
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredEmis.length > 0 ? filteredEmis.map((emi) => {
                const statusInfo = getStatusAttributes(emi.status);
                return (
                <Card key={`${emi.customerId}-${emi.emiNumber}`} className={cn("flex flex-col justify-between", statusInfo.variant === 'destructive' && "border-destructive/50", statusInfo.variant === 'paid' && "bg-muted/40")}>
                    <CardHeader className="p-4">
                        <div className="flex justify-between items-start">
                             <div className="text-center">
                                <p className={cn("text-2xl font-bold", statusInfo.className)}>{format(emi.dueDate, 'dd')}</p>
                                <p className="text-xs text-muted-foreground">{format(emi.dueDate, 'MMM')}</p>
                            </div>
                            <div className={cn("flex items-center justify-center h-8 w-8 rounded-full bg-background", statusInfo.className)}>
                                {statusInfo.icon}
                            </div>
                        </div>
                         <CardTitle className="text-base pt-2 truncate">
                            <Link href={`/customers/${emi.customerId}`} passHref>
                                <span className="hover:underline">{emi.customerName}</span>
                            </Link>
                         </CardTitle>
                        <CardDescription className="text-xs">
                             EMI {emi.emiNumber}/{emi.totalEmis}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                         <p className="text-lg font-semibold">{formatCurrency(emi.emiAmount)}</p>
                         <p className="text-xs text-muted-foreground">
                            {emi.isPaid && emi.paidDate ? `Paid on ${format(emi.paidDate, 'dd MMM yyyy')}` : `Due on ${format(emi.dueDate, 'dd MMM yyyy')}`}
                            {emi.status === 'overdue' && emi.overdueDays && ` (${emi.overdueDays} days overdue)`}
                        </p>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex gap-2">
                        {emi.canBePaid && !emi.isPaid && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full" onClick={() => setSelectedEmiForPayment(emi)}>
                                        <Check className="h-4 w-4 mr-2" /> Record
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Record Payment</p></TooltipContent>
                            </Tooltip>
                        )}
                        {emi.isLastPaid && (
                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="destructive" size="sm" className="w-full" onClick={() => setSelectedEmiForRevoke(emi)}>
                                        <Undo2 className="h-4 w-4 mr-2" /> Revoke
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Revoke Payment</p></TooltipContent>
                            </Tooltip>
                        )}
                    </CardFooter>
                </Card>
            )}) : (
                 <div className="text-center py-20 text-muted-foreground col-span-full">
                    <p>No EMIs for {format(currentMonth, "MMMM yyyy")} match your search.</p>
                </div>
            )}
        </div>
    </div>


    <AlertDialog open={!!selectedEmiForPayment} onOpenChange={(open) => !open && setSelectedEmiForPayment(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
              <AlertDialogDescription>
                  Record a payment of <strong>{formatCurrency(selectedEmiForPayment?.emiAmount || 0)}</strong> for <strong>{selectedEmiForPayment?.customerName}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="payment-date" className="text-right">
                        Payment Date
                    </Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                "col-span-3 justify-start text-left font-normal",
                                !paymentDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={paymentDate}
                                onSelect={setPaymentDate}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRecordPayment}>Confirm Payment</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={!!selectedEmiForRevoke} onOpenChange={(open) => !open && setSelectedEmiForRevoke(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke Payment</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to revoke the last payment for <strong>{selectedEmiForRevoke?.customerName}</strong>? This will remove the payment record and update the loan status.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRevokePayment} className={cn(buttonVariants({ variant: "destructive" }))}>Revoke</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </TooltipProvider>
  );
}

    