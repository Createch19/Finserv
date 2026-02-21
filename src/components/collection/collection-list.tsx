
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, addMonths, isBefore, startOfMonth, endOfMonth, parseISO, isSameMonth } from "date-fns";
import { Button } from "../ui/button";
import { Loader2, CalendarIcon, CheckCircle2, Search, History, AlertCircle } from "lucide-react";
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
import { TooltipProvider } from "@/components/ui/tooltip";

type EmiEntry = {
  customerName: string;
  customerId: string;
  emiAmount: number;
  arrears: number;
  currentDue: number;
  totalDue: number;
  isPaidInFullForMonth: boolean;
  isPartiallyPaid: boolean;
  nextEmiNumber: number;
  totalEmis: number;
};

const formatCurrency = (amount: number) => Math.round(amount).toLocaleString('en-IN', { maximumFractionDigits: 0, style: 'currency', currency: 'INR' });

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

  const realCurrentMonth = startOfMonth(new Date());
  const isPastMonth = isBefore(currentMonth, realCurrentMonth);

  const customersQuery = useMemo(() => {
    if (!firestore || !user) return null;
    if (user.role === 'superadmin') return collection(firestore, 'customers');
    if (!user.companyId) return null;
    return query(collection(firestore, 'customers'), where('companyId', '==', user.companyId));
  }, [user, firestore]);

  const { data: customersData, isLoading: customersLoading } = useCollection<WithId<Customer>>(customersQuery);
  
  const customers = useMemo(() => customersData?.filter(c => c.status !== 'pending') || [], [customersData]);

  const monthlyData = useMemo(() => {
    if (!customers) return { emis: [], stats: { expected: 0, actual: 0, shortfall: 0, collectedCount: 0, expectedCount: 0, totalArrears: 0 } };
    
    const allEntries: EmiEntry[] = [];
    let totalMonthlyNetTarget = 0;
    let totalActualCollectedInMonth = 0;
    let totalShortfallForCurrentEMIs = 0;
    let collectedCount = 0;
    let expectedCount = 0;
    let totalArrearsCarriedForward = 0;

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    customers.forEach(customer => {
        const startDate = parseISO(customer.startDate);
        const monthlyEmi = Math.round(customer.monthlyEMI);
        const totalPayable = Math.round(customer.totalPayable);
        
        const paidThisMonth = Math.round(customer.payments?.filter(p => {
            const pDate = parseISO(p.date);
            return (isSameMonth(pDate, currentMonth) || (pDate >= monthStart && pDate <= monthEnd));
        }).reduce((s, p) => s + Math.round(p.amount), 0) || 0);

        const totalPaidAllTime = Math.round(customer.payments?.reduce((s, p) => s + Math.round(p.amount), 0) || 0);
        const paidBeforeThisMonth = Math.round(customer.payments?.filter(p => isBefore(parseISO(p.date), monthStart)).reduce((s, p) => s + Math.round(p.amount), 0) || 0);

        let expectedBeforeThisMonth = 0;
        let expectedByEndOfMonth = 0;

        // EMI #1 is due month AFTER start
        for (let i = 1; i <= customer.duration; i++) {
            const dueDate = addMonths(startDate, i);
            const dueMonthStart = startOfMonth(dueDate);
            
            if (isBefore(dueMonthStart, monthStart)) {
                expectedBeforeThisMonth += monthlyEmi;
            }
            if (isBefore(dueMonthStart, monthEnd) || isSameMonth(dueMonthStart, monthEnd)) {
                expectedByEndOfMonth += monthlyEmi;
            }
        }

        expectedBeforeThisMonth = Math.min(expectedBeforeThisMonth, totalPayable);
        expectedByEndOfMonth = Math.min(expectedByEndOfMonth, totalPayable);

        const arrearsAtStart = Math.max(0, expectedBeforeThisMonth - paidBeforeThisMonth);
        const netTargetForMonth = Math.max(0, expectedByEndOfMonth - paidBeforeThisMonth);
        const currentMonthEmiComponent = Math.max(0, netTargetForMonth - arrearsAtStart);

        const isPaidInFullForMonth = totalPaidAllTime >= expectedByEndOfMonth;
        const isPartiallyPaid = !isPaidInFullForMonth && totalPaidAllTime > expectedBeforeThisMonth;

        const wasActive = isBefore(startOfMonth(addMonths(startDate, 1)), monthEnd) || isSameMonth(startOfMonth(addMonths(startDate, 1)), monthEnd);
        const hasBalance = totalPaidAllTime < totalPayable;

        if (wasActive && (hasBalance || paidThisMonth > 0)) {
            totalActualCollectedInMonth += paidThisMonth;
            
            if (netTargetForMonth > 0 || paidThisMonth > 0) {
                totalMonthlyNetTarget += netTargetForMonth;
                totalArrearsCarriedForward += arrearsAtStart;
                
                const individualShortfall = Math.max(0, netTargetForMonth - paidThisMonth);
                totalShortfallForCurrentEMIs += individualShortfall;
                
                if (netTargetForMonth > 0) {
                    expectedCount++;
                    if (isPaidInFullForMonth) collectedCount++;
                }

                allEntries.push({
                    customerName: customer.name,
                    customerId: customer.id,
                    emiAmount: monthlyEmi,
                    arrears: arrearsAtStart,
                    currentDue: currentMonthEmiComponent,
                    totalDue: netTargetForMonth,
                    isPaidInFullForMonth,
                    isPartiallyPaid,
                    nextEmiNumber: Math.min(customer.duration, Math.floor(totalPaidAllTime / monthlyEmi) + 1),
                    totalEmis: customer.duration
                });
            }
        }
    });

    return {
        emis: allEntries,
        stats: {
            expected: totalMonthlyNetTarget,
            actual: totalActualCollectedInMonth,
            shortfall: totalShortfallForCurrentEMIs,
            collectedCount,
            expectedCount,
            totalArrears: totalArrearsCarriedForward
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
    setPaymentAmount(Math.round(emi.totalDue).toString());
  };

  const handleRecordPayment = async () => {
    const amount = Math.round(parseFloat(paymentAmount));
    if (!selectedEmiForPayment || isNaN(amount) || amount <= 0 || !paymentDate) return;

    const customer = customersData?.find(c => c.id === selectedEmiForPayment.customerId);
    if (!customer) return;

    const totalPayable = Math.round(customer.totalPayable);
    const currentTotalPaid = Math.round(customer.payments?.reduce((s, p) => s + Math.round(p.amount), 0) || 0);
    const maxAllowed = Math.max(0, totalPayable - currentTotalPaid);

    if (amount > maxAllowed) {
        toast({ variant: "destructive", title: "Invalid Amount", description: "You cannot collect more than the remaining loan balance." });
        return;
    }

    setIsSubmitting(true);
    const customerDocRef = doc(firestore!, 'customers', customer.id);
    
    const newRemainingBalance = Math.max(0, totalPayable - currentTotalPaid - amount);

    const newPayment: Payment = {
        paymentId: uuidv4(),
        date: paymentDate.toISOString(),
        amount: amount,
        mode: 'cash',
        remainingBalance: newRemainingBalance
    };

    const isFullyPaid = newRemainingBalance <= 0;
    const updatePayload = {
        payments: arrayUnion(newPayment),
        status: isFullyPaid ? 'completed' : customer.status
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

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            <Card className="border-primary/20 bg-primary/5 shadow-none">
                <CardHeader className="p-3 pb-0"><CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Carry Forward (Arrears)</CardTitle></CardHeader>
                <CardContent className="p-3 pt-1">
                    <div className="text-xl font-bold text-primary">{formatCurrency(monthlyData.stats.totalArrears)}</div>
                    <div className="text-[10px] text-muted-foreground">Historical debt</div>
                </CardContent>
            </Card>
            <Card className="border-primary/20 shadow-none">
                <CardHeader className="p-3 pb-0"><CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Monthly Collection</CardTitle></CardHeader>
                <CardContent className="p-3 pt-1">
                    <div className="text-xl font-bold">{formatCurrency(monthlyData.stats.actual)}</div>
                    <div className="text-[10px] text-muted-foreground">Target: {formatCurrency(monthlyData.stats.expected)}</div>
                </CardContent>
            </Card>
            <Card className="border-destructive/20 bg-destructive/5 shadow-none">
                <CardHeader className="p-3 pb-0"><CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Pending Shortfall</CardTitle></CardHeader>
                <CardContent className="p-3 pt-1 text-destructive">
                    <div className="text-xl font-bold">{formatCurrency(monthlyData.stats.shortfall)}</div>
                    <div className="text-[10px]">Total missed this month</div>
                </CardContent>
            </Card>
            <Card className="border-primary/20 shadow-none">
                <CardHeader className="p-3 pb-0"><CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Files Settled</CardTitle></CardHeader>
                <CardContent className="p-3 pt-1">
                    <div className="text-xl font-bold">{monthlyData.stats.collectedCount} / {monthlyData.stats.expectedCount}</div>
                    <div className="text-[10px] text-muted-foreground">Customers cleared for Dec</div>
                </CardContent>
            </Card>
            <div className="hidden xl:block">
                <Card className="bg-muted/50 border-none shadow-none">
                    <CardHeader className="p-3 pb-0"><CardTitle className="text-[10px] uppercase text-muted-foreground">Status</CardTitle></CardHeader>
                    <CardContent className="p-3 pt-1">
                        <div className="text-sm font-medium">{isPastMonth ? "Historical View" : "Active Period"}</div>
                        <div className="text-[10px] text-muted-foreground">{isPastMonth ? "Payments locked" : "Accepting payments"}</div>
                    </CardContent>
                </Card>
            </div>
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
                {!emi.isPaidInFullForMonth && !isPastMonth && (
                    <Button size="sm" className="h-8 px-3" onClick={() => handleOpenPayment(emi)}>Pay</Button>
                )}
                {isPastMonth && !emi.isPaidInFullForMonth && (
                    <div className="text-[10px] font-bold text-destructive flex items-center gap-1 uppercase mt-2">
                        <AlertCircle className="h-3 w-3" />
                        Missed
                    </div>
                )}
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
                <div className="flex justify-between items-end">
                    <div className="text-xs text-muted-foreground">Month's Target</div>
                    <div className="text-lg font-bold text-primary">{formatCurrency(emi.totalDue)}</div>
                </div>
                <div className="space-y-1 pt-2 border-t text-[11px]">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Current EMI:</span>
                        <span>{formatCurrency(emi.currentDue)}</span>
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
        {filteredEmis.length === 0 && <div className="col-span-full py-20 text-center text-muted-foreground">No records for this period.</div>}
      </div>

      <AlertDialog open={!!selectedEmiForPayment} onOpenChange={o => !o && setSelectedEmiForPayment(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Record Payment: {selectedEmiForPayment?.customerName}</AlertDialogTitle>
                <AlertDialogDescription>
                    Enter the amount collected. Previous missed payments (arrears) will be cleared first.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Due Now</Label>
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
