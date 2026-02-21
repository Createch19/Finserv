
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isBefore, startOfDay, addMonths, isSameMonth, parseISO, endOfMonth, startOfMonth, differenceInMonths } from "date-fns";
import Link from 'next/link';
import { Button } from "../ui/button";
import { Loader2, CalendarIcon, CheckCircle2, XCircle, Clock, CalendarDays, Search, Banknote, ListChecks, Hourglass, Award, Info, History, ArrowUpRight } from "lucide-react";
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
import type { Customer, Payment, WithId } from "@/types";
import { useCollection, useFirestore, FirestorePermissionError, errorEmitter } from "@/firebase";
import { useAuth } from "@/hooks/use-auth";
import { collection, doc, updateDoc, arrayUnion, query, where } from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';
import { cn } from "@/lib/utils";
import { Label } from "../ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type EmiEntry = {
  customerName: string;
  customerId: string;
  emiAmount: number;
  arrears: number;
  currentDue: number;
  totalDue: number;
  totalPaidForThisFile: number;
  isPaidInFullForMonth: boolean;
  isPartiallyPaid: boolean;
  remainingBalance: number;
  nextEmiNumber: number;
  totalEmis: number;
};

const formatCurrency = (amount: number) => amount.toLocaleString('en-IN', { maximumFractionDigits: 0, style: 'currency', currency: 'INR' });

export function CollectionList() {
  const { user, loading: userLoading } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmiForPayment, setSelectedEmiForPayment] = useState<EmiEntry | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const customersQuery = useMemo(() => {
    if (!firestore || !user) return null;
    if (user.role === 'superadmin') return collection(firestore, 'customers');
    if (!user.companyId) return null;
    return query(collection(firestore, 'customers'), where('companyId', '==', user.companyId));
  }, [user, firestore]);

  const { data: customersData, isLoading: customersLoading } = useCollection<WithId<Customer>>(customersQuery);
  const customers = useMemo(() => customersData?.filter(c => c.status !== 'pending' && c.status !== 'completed') || [], [customersData]);

  const monthlyData = useMemo(() => {
    if (!customers) return { emis: [], stats: { expected: 0, actual: 0, pending: 0, collectedCount: 0, expectedCount: 0, completingFiles: 0, completedFiles: 0 } };
    
    const allEntries: EmiEntry[] = [];
    let totalExpected = 0;
    let totalActual = 0;
    let collectedCount = 0;
    let completingFiles = 0;
    let completedFiles = 0;

    customers.forEach(customer => {
        const startDate = parseISO(customer.startDate);
        const monthlyEmi = customer.monthlyEMI;
        const totalPaid = customer.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        
        // Calculate cumulative expectation up to the end of the selected month
        const monthsFromStart = Math.max(0, differenceInMonths(endOfMonth(currentMonth), startDate));
        const cumulativeTarget = Math.min(customer.totalPayable, monthsFromStart * monthlyEmi);
        
        // Calculation for the START of the selected month (to find Arrears)
        const monthsUntilLastMonth = Math.max(0, differenceInMonths(startOfMonth(currentMonth), startDate));
        const pastTarget = Math.min(customer.totalPayable, monthsUntilLastMonth * monthlyEmi);
        
        const arrears = Math.max(0, pastTarget - totalPaid);
        const currentEmiTarget = Math.min(monthlyEmi, Math.max(0, customer.totalPayable - totalPaid - arrears));
        const totalDueThisMonth = arrears + currentEmiTarget;

        // How much of THIS month's target has been paid?
        const paidTowardsThisMonth = Math.max(0, Math.min(totalDueThisMonth, totalPaid - pastTarget));
        const isPaidInFullForMonth = paidTowardsThisMonth >= totalDueThisMonth && totalDueThisMonth > 0;
        const isPartiallyPaid = paidTowardsThisMonth > 0 && paidTowardsThisMonth < totalDueThisMonth;

        // Stats tracking
        totalExpected += totalDueThisMonth;
        totalActual += paidTowardsThisMonth;
        if (isPaidInFullForMonth) collectedCount++;

        // Completion logic
        const isLastMonth = monthsFromStart >= customer.duration;
        if (isLastMonth) {
            completingFiles++;
            if (totalPaid >= customer.totalPayable) completedFiles++;
        }

        if (totalDueThisMonth > 0 || isPaidInFullForMonth) {
            allEntries.push({
                customerName: customer.name,
                customerId: customer.id,
                emiAmount: monthlyEmi,
                arrears,
                currentDue: currentEmiTarget,
                totalDue: totalDueThisMonth,
                totalPaidForThisFile: totalPaid,
                isPaidInFullForMonth,
                isPartiallyPaid,
                remainingBalance: customer.totalPayable - totalPaid,
                nextEmiNumber: Math.floor(totalPaid / monthlyEmi) + 1,
                totalEmis: customer.duration
            });
        }
    });

    return {
        emis: allEntries,
        stats: {
            expected: totalExpected,
            actual: totalActual,
            pending: totalExpected - totalActual,
            collectedCount,
            expectedCount: allEntries.length,
            completingFiles,
            completedFiles
        }
    };
  }, [customers, currentMonth]);

  const filteredEmis = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return monthlyData.emis
        .filter(e => e.customerName.toLowerCase().includes(lowerSearch))
        .sort((a, b) => {
            if (a.isPaidInFullForMonth !== b.isPaidInFullForMonth) return a.isPaidInFullForMonth ? 1 : -1;
            return b.arrears - a.arrears;
        });
  }, [monthlyData.emis, searchTerm]);

  const handleOpenPayment = (emi: EmiEntry) => {
    setSelectedEmiForPayment(emi);
    setPaymentAmount(emi.totalDue.toString());
  };

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!selectedEmiForPayment || isNaN(amount) || amount <= 0 || !paymentDate) return;

    const customer = customersData?.find(c => c.id === selectedEmiForPayment.customerId);
    if (!customer) return;

    if (amount > selectedEmiForPayment.remainingBalance) {
        toast({ variant: "destructive", title: "Invalid Amount", description: "You cannot collect more than the remaining loan balance." });
        return;
    }

    setIsSubmitting(true);
    const customerDocRef = doc(firestore!, 'customers', customer.id);
    
    const newPayment: Payment = {
        paymentId: uuidv4(),
        date: paymentDate.toISOString(),
        amount: amount,
        mode: 'cash',
        remainingBalance: customer.totalPayable - (customer.payments?.reduce((s, p) => s + p.amount, 0) || 0) - amount
    };

    const isFullyPaid = newPayment.remainingBalance <= 0;
    const updatePayload = {
        payments: arrayUnion(newPayment),
        status: isFullyPaid ? 'completed' : (newPayment.remainingBalance < customer.totalPayable ? 'active' : customer.status)
    };

    updateDoc(customerDocRef, updatePayload).then(() => {
        toast({ title: "Payment Recorded", description: `${formatCurrency(amount)} collected from ${customer.name}.` });
        setSelectedEmiForPayment(null);
    }).catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: customerDocRef.path,
            operation: 'update',
            requestResourceData: updatePayload
        }));
    }).finally(() => setIsSubmitting(false));
  };

  if (userLoading || customersLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <TooltipProvider>
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 p-4 md:px-6 md:pt-6 border-b">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(prev => addMonths(prev, -1))}><History className="h-4 w-4" /></Button>
                <h2 className="text-xl font-bold text-primary w-48 text-center">{format(currentMonth, "MMMM yyyy")}</h2>
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}><CalendarIcon className="h-4 w-4" /></Button>
            </div>
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search customer..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-primary/20">
                <CardHeader className="p-3 pb-0"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Monthly Collection</CardTitle></CardHeader>
                <CardContent className="p-3 pt-1">
                    <div className="text-xl font-bold">{formatCurrency(monthlyData.stats.actual)}</div>
                    <div className="text-xs text-muted-foreground">Expected: {formatCurrency(monthlyData.stats.expected)}</div>
                </CardContent>
            </Card>
            <Card className="border-destructive/20">
                <CardHeader className="p-3 pb-0"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Pending Amount</CardTitle></CardHeader>
                <CardContent className="p-3 pt-1 text-destructive">
                    <div className="text-xl font-bold">{formatCurrency(monthlyData.stats.pending)}</div>
                    <div className="text-xs">Uncollected this month</div>
                </CardContent>
            </Card>
            <Card className="border-primary/20">
                <CardHeader className="p-3 pb-0"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">EMIs Collected</CardTitle></CardHeader>
                <CardContent className="p-3 pt-1">
                    <div className="text-xl font-bold">{monthlyData.stats.collectedCount} / {monthlyData.stats.expectedCount}</div>
                    <div className="text-xs text-muted-foreground">Customer files</div>
                </CardContent>
            </Card>
            <Card className="border-primary/20">
                <CardHeader className="p-3 pb-0"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Files Completed</CardTitle></CardHeader>
                <CardContent className="p-3 pt-1">
                    <div className="text-xl font-bold">{monthlyData.stats.completedFiles} / {monthlyData.stats.completingFiles}</div>
                    <div className="text-xs text-muted-foreground">Reaching end of term</div>
                </CardContent>
            </Card>
        </div>
      </div>

      <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredEmis.map((emi) => (
          <Card key={emi.customerId} className={cn("relative overflow-hidden transition-all hover:shadow-md", emi.isPaidInFullForMonth ? "bg-green-50/30 border-green-200" : "border-primary/10")}>
            <CardHeader className="p-4 pb-2 flex-row items-start justify-between">
                <div className="space-y-1">
                    <CardTitle className="text-base uppercase truncate max-w-[150px]">{emi.customerName}</CardTitle>
                    <div className="flex gap-2">
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal">EMI {emi.nextEmiNumber}/{emi.totalEmis}</Badge>
                        {emi.isPaidInFullForMonth && <Badge className="bg-green-600 h-5 text-[10px]">Settled</Badge>}
                        {emi.isPartiallyPaid && <Badge className="bg-orange-500 h-5 text-[10px]">Partial</Badge>}
                    </div>
                </div>
                {!emi.isPaidInFullForMonth && (
                    <Button size="sm" className="h-8 px-3" onClick={() => handleOpenPayment(emi)}>Pay</Button>
                )}
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
                <div className="flex justify-between items-end">
                    <div className="text-xs text-muted-foreground">Total Target</div>
                    <div className="text-lg font-bold text-primary">{formatCurrency(emi.totalDue)}</div>
                </div>
                <div className="space-y-1 pt-2 border-t text-[11px]">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Current EMI:</span>
                        <span>{formatCurrency(emi.emiAmount)}</span>
                    </div>
                    {emi.arrears > 0 && (
                        <div className="flex justify-between text-destructive font-medium">
                            <span>Past Arrears:</span>
                            <span>{formatCurrency(emi.arrears)}</span>
                        </div>
                    )}
                </div>
            </CardContent>
            {emi.isPaidInFullForMonth && (
                <div className="absolute top-0 right-0 p-1"><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
            )}
          </Card>
        ))}
        {filteredEmis.length === 0 && <div className="col-span-full py-20 text-center text-muted-foreground">No pending collections for this month.</div>}
      </div>

      <AlertDialog open={!!selectedEmiForPayment} onOpenChange={o => !o && setSelectedEmiForPayment(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Record Payment: {selectedEmiForPayment?.customerName}</AlertDialogTitle>
                <AlertDialogDescription>Enter the amount collected. Arrears are prioritized first (FIFO).</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Due Today</Label>
                    <div className="col-span-3 font-semibold text-primary">{formatCurrency(selectedEmiForPayment?.totalDue || 0)}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Collect (₹)</Label>
                    <Input className="col-span-3" type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Date</Label>
                    <div className="col-span-3">
                        <Popover>
                            <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start"><CalendarIcon className="mr-2 h-4 w-4" />{paymentDate ? format(paymentDate, "PPP") : "Pick date"}</Button></PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={paymentDate} onSelect={setPaymentDate} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                </div>
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRecordPayment} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Collection"}</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
