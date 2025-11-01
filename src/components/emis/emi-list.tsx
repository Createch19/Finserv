
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isBefore, differenceInDays, startOfDay, addMonths, isWithinInterval, parseISO } from "date-fns";
import Link from 'next/link';
import { Button, buttonVariants } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarIcon, Search } from "lucide-react";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import type { Customer, Payment, WithId, User } from "@/types";
import { useCollection, useFirestore, FirestorePermissionError, errorEmitter } from "@/firebase";
import { useAuth } from "@/hooks/use-auth";
import { collection, doc, updateDoc, arrayUnion, arrayRemove, query, where, orderBy } from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Label } from "../ui/label";

type EmiStatus = "paid" | "due" | "overdue" | "upcoming";

type EmiEntry = {
  customerName: string;
  customerId: string;
  emiAmount: number;
  dueDate: Date;
  status: EmiStatus;
  emiNumber: number;
  isPaid: boolean;
  isLastPaid: boolean;
  paidDate?: Date | null;
  overdueDays?: number;
};

const getEmiStatus = (dueDate: Date, isPaid: boolean): EmiStatus => {
  if (isPaid) return "paid";
  const today = startOfDay(new Date());
  if (isBefore(startOfDay(dueDate), today)) return "overdue";
  if (differenceInDays(startOfDay(dueDate), today) <= 7) return "due";
  return "upcoming";
};

const getStatusBadgeVariant = (status: EmiStatus | ReturnType<typeof getOverallLoanStatus>) => {
  switch (status) {
    case "paid": return "success";
    case "due": return "default";
    case "overdue": return "destructive";
    case "upcoming": return "outline";
    case "active": return "default";
    case "completed": return "success";
    default: return "outline";
  }
};

const getOverallLoanStatus = (emis: EmiEntry[]) => {
    if (emis.every(e => e.isPaid)) return 'completed';
    if (emis.some(e => e.status === 'overdue')) return 'overdue';
    return 'active';
}

const formatCurrency = (amount: number) => amount.toLocaleString(undefined, { maximumFractionDigits: 0 });

export function EmiList() {
  const { user, loading: userLoading } = useAuth();
  const firestore = useFirestore();

   const customersQuery = useMemo(() => {
    if (!firestore || !user) {
        return null;
    }
    // Admins and Agents fetch all customers.
    // We will filter out 'pending' customers on the client-side.
    return query(collection(firestore, 'customers'), orderBy('name', 'asc'));
  }, [user, firestore]);

  const { data: customersData, isLoading: customersLoading, error } = useCollection<WithId<Customer>>(customersQuery);
  
  const customers = useMemo(() => {
    if (!customersData) return [];
    // Filter out pending customers on the client.
    return customersData.filter(c => c.status !== 'pending');
  }, [customersData]);

  const [loanStatusFilter, setLoanStatusFilter] = useState<"all" | "active" | "overdue" | "completed">("all");
  const [selectedEmiForPayment, setSelectedEmiForPayment] = useState<EmiEntry | null>(null);
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [selectedEmiForRevoke, setSelectedEmiForRevoke] = useState<EmiEntry | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const isLoading = userLoading || (customersLoading && !error);

  const loans = useMemo(() => {
    if (!customers) return [];
    
    return customers.map(customer => {
        const emis: EmiEntry[] = [];
        const startDate = new Date(customer.startDate);
        const today = startOfDay(new Date());
        const paymentsCount = customer.payments?.length || 0;

        for (let i = 0; i < customer.duration; i++) {
          const dueDate = addMonths(startDate, i + 1);
          const isPaid = i < paymentsCount;
          const status = getEmiStatus(dueDate, isPaid);
          const isLastPaid = isPaid && i === paymentsCount - 1;
          
          let paidDate: Date | null = null;
          if (isPaid && customer.payments && customer.payments[i]) {
            paidDate = parseISO(customer.payments[i].date);
          }

          let overdueDays: number | undefined = undefined;
          if (status === 'overdue') {
            overdueDays = differenceInDays(today, startOfDay(dueDate));
          }

          emis.push({
            customerName: customer.name,
            customerId: customer.id,
            emiAmount: customer.monthlyEMI,
            dueDate: dueDate,
            status: status,
            emiNumber: i + 1,
            isPaid,
            isLastPaid,
            paidDate,
            overdueDays,
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
    }).sort((a,b) => {
        if (a.overallStatus === 'overdue' && b.overallStatus !== 'overdue') return -1;
        if (a.overallStatus !== 'overdue' && b.overallStatus === 'overdue') return 1;
        return a.name.localeCompare(b.name);
    });

  }, [customers]);

  const filteredLoans = useMemo(() => {
    if (!loans) return [];
    const lowercasedFilter = searchTerm.toLowerCase();
    return loans.filter(loan => {
      const statusMatch = loanStatusFilter === 'all' || loan.overallStatus === loanStatusFilter;
      const dateMatch = !dateRange?.from || loan.emis.some(emi => 
        !emi.isPaid && isWithinInterval(emi.dueDate, { start: dateRange.from!, end: dateRange.to || dateRange.from! })
      );
      const searchMatch = !searchTerm || loan.name.toLowerCase().includes(lowercasedFilter);
      return statusMatch && dateMatch && searchMatch;
    });
  }, [loans, loanStatusFilter, dateRange, searchTerm]);
  
  const handleRecordPayment = async () => {
    if (!selectedEmiForPayment || !user || !firestore || !paymentDate) return;

    const customer = customers?.find(c => c.id === selectedEmiForPayment.customerId);
    if (!customer) return;

    if ((customer.payments?.length || 0) >= selectedEmiForPayment.emiNumber) {
        toast({
            variant: "destructive",
            title: "Payment Already Recorded",
            description: `EMI #${selectedEmiForPayment.emiNumber} has already been paid.`,
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
            description: `Payment of ₹${formatCurrency(selectedEmiForPayment?.emiAmount)} for ${selectedEmiForPayment?.customerName} has been recorded.`,
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
    
    // If the loan was 'completed', it should become 'active' again.
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
        <div className="flex flex-col sm:flex-row gap-4 mb-4 items-center flex-wrap">
             <div className="relative w-full sm:w-auto sm:flex-grow lg:flex-grow-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by name..."
                    className="w-full rounded-lg bg-background pl-8 sm:w-[200px] lg:w-[250px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
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
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-full sm:w-[300px] justify-start text-left font-normal",
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
                    <span>Filter by due date</span>
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

            {(loanStatusFilter !== 'all' || dateRange || searchTerm) && (
                <Button variant="ghost" onClick={() => {setLoanStatusFilter('all'); setDateRange(undefined); setSearchTerm('')}}>
                    Clear Filters
                </Button>
            )}
        </div>
        <Accordion type="single" collapsible className="w-full">
            {filteredLoans.map(loan => (
                <AccordionItem value={loan.id} key={loan.id}>
                    <AccordionTrigger className="hover:no-underline hover:bg-muted/50 px-4 rounded-md">
                        <div className="flex flex-col md:flex-row md:items-center justify-between w-full">
                           <div className="flex-1 text-left">
                            <Popover>
                              <PopoverTrigger asChild>
                                 <Link href={`/customers/${loan.id}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                                    {loan.name}
                                  </Link>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <Card className="border-0 shadow-none">
                                  <CardHeader className="pb-4">
                                      <CardTitle>{loan.name}</CardTitle>
                                      <CardDescription>{loan.phoneModel}</CardDescription>
                                  </CardHeader>
                                  <CardContent>
                                      <div className="space-y-2">
                                          <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Status</span>
                                            <Badge variant={getStatusBadgeVariant(loan.overallStatus)} className="capitalize">
                                                {loan.overallStatus}
                                            </Badge>
                                          </div>
                                          <div className="space-y-1">
                                            <span className="text-sm text-muted-foreground">Progress ({loan.paidCount} / {loan.duration} Paid)</span>
                                            <Progress value={(loan.paidCount / loan.duration) * 100} className="h-2" />
                                          </div>
                                      </div>
                                  </CardContent>.
                                </Card>
                              </PopoverContent>
                            </Popover>
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
                                           {emi.isPaid && emi.paidDate 
                                                ? `Paid on ${format(emi.paidDate, "PPP")}`
                                                : `Due on ${format(emi.dueDate, "PPP")}`
                                           }
                                           {emi.status === 'overdue' && emi.overdueDays && (
                                                <span className="text-destructive"> ({emi.overdueDays} {emi.overdueDays > 1 ? 'days' : 'day'} overdue)</span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <span className="font-semibold">₹{formatCurrency(emi.emiAmount)}</span>
                                        <Badge variant={getStatusBadgeVariant(emi.status)} className="capitalize w-20 justify-center">
                                        {emi.status}
                                        </Badge>
                                        
                                        {!emi.isPaid && (
                                          <Button variant="outline" size="sm" onClick={() => setSelectedEmiForPayment(emi)} disabled={emi.isPaid}>
                                              Record Payment
                                          </Button>
                                        )}
                                        {emi.isLastPaid && (
                                          <Button variant="destructive" size="sm" onClick={() => setSelectedEmiForRevoke(emi)}>
                                              Revoke
                                          </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
         {!isLoading && filteredLoans.length === 0 && (
             <div className="text-center py-10 text-muted-foreground">
                <p>No loans match the current filters.</p>
            </div>
          )}
      </CardContent>
    </Card>

    <AlertDialog open={!!selectedEmiForPayment} onOpenChange={(open) => !open && setSelectedEmiForPayment(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
              <AlertDialogDescription>
                  Record a payment of <strong>₹{formatCurrency(selectedEmiForPayment?.emiAmount || 0)}</strong> for <strong>{selectedEmiForPayment?.customerName}</strong>.
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
    </>
  );
}

    