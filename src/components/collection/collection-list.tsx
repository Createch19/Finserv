
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, addMonths, isBefore, startOfMonth, endOfMonth, parseISO, isSameMonth, isAfter } from "date-fns";
import { Button } from "../ui/button";
import { Loader2, CalendarIcon, CheckCircle2, Search, AlertCircle, ChevronLeft, ChevronRight, Clock, MessageCircle, Send } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import type { Customer, Payment, WithId, AppSettings } from "@/types";
import { useCollection, useFirestore, FirestorePermissionError, errorEmitter, useDoc } from "@/firebase";
import { useAuth } from "@/hooks/use-auth";
import { collection, doc, updateDoc, arrayUnion, query, where } from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';
import { cn } from "@/lib/utils";
import { Label } from "../ui/label";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getWhatsAppPaymentLink, getWhatsAppReminderLink } from "@/lib/whatsapp-utils";

type EmiEntry = {
  customerName: string;
  customerId: string;
  emiAmount: number;
  openingArrears: number;
  remainingArrears: number;
  monthlyTarget: number;
  remainingMonthlyTarget: number;
  totalNetTarget: number;
  remainingTotalNetTarget: number;
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
  
  const [successInfo, setSuccessInfo] = useState<{
    customer: WithId<Customer>;
    amount: number;
    balance: number;
    date: string;
    emiInfo: string;
  } | null>(null);

  const realCurrentMonth = startOfMonth(new Date());
  const isPastMonth = isBefore(currentMonth, realCurrentMonth);
  const isCurrentMonth = isSameMonth(currentMonth, realCurrentMonth);
  const isFutureMonth = isAfter(currentMonth, realCurrentMonth);

  const settingsRef = useMemo(() => firestore ? doc(firestore, 'settings', 'defaults') : null, [firestore]);
  const { data: appSettings } = useDoc<AppSettings>(settingsRef);

  const customersQuery = useMemo(() => {
    if (!firestore || !user) return null;
    if (user.role === 'superadmin') return collection(firestore, 'customers');
    if (!user.companyId) return null;
    return query(collection(firestore, 'customers'), where('companyId', '==', user.companyId));
  }, [user, firestore]);

  const { data: customersData, isLoading: customersLoading } = useCollection<WithId<Customer>>(customersQuery);
  
  const customers = useMemo(() => customersData || [], [customersData]);

  const monthlyData = useMemo(() => {
    if (!customers) return { emis: [], stats: { expected: 0, actual: 0, shortfall: 0, collectedCount: 0, expectedCount: 0, totalArrears: 0 } };
    
    const allEntries: EmiEntry[] = [];
    let totalMonthlyTarget = 0;
    let totalActualCollectedInMonth = 0;
    let totalShortfall = 0;
    let totalRemainingArrears = 0;
    let expectedCount = 0;
    let collectedCount = 0;

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    customers.filter(c => c.status !== 'pending').forEach(customer => {
        const startDate = startOfMonth(parseISO(customer.startDate));
        const emiAmount = Math.round(customer.monthlyEMI);
        const totalPayable = Math.round(customer.totalPayable);
        
        const payments = customer.payments || [];
        const totalPaidToDate = Math.round(payments.reduce((s, p) => s + Math.round(p.amount), 0) || 0);
        
        const paidThisMonth = Math.round(payments.filter(p => {
            const pDate = parseISO(p.date);
            return (pDate >= monthStart && pDate <= monthEnd);
        }).reduce((s, p) => s + Math.round(p.amount), 0));

        const paidBeforeThisMonth = Math.round(payments.filter(p => isBefore(parseISO(p.date), monthStart)).reduce((s, p) => s + Math.round(p.amount), 0));
        const totalPaidByEndOfSelectedMonth = paidBeforeThisMonth + paidThisMonth;

        let expectedBeforeThisMonth = 0;
        let expectedByEndOfMonth = 0;

        for (let i = 1; i <= customer.duration; i++) {
            const dueDate = startOfMonth(addMonths(startDate, i));
            if (isBefore(dueDate, monthStart)) {
                expectedBeforeThisMonth += emiAmount;
            }
            if (isBefore(dueDate, monthEnd) || isSameMonth(dueDate, monthEnd)) {
                expectedByEndOfMonth += emiAmount;
            }
        }

        expectedBeforeThisMonth = Math.min(expectedBeforeThisMonth, totalPayable);
        expectedByEndOfMonth = Math.min(expectedByEndOfMonth, totalPayable);

        const openingArrears = Math.max(0, expectedBeforeThisMonth - paidBeforeThisMonth);
        const monthlyTarget = Math.max(0, expectedByEndOfMonth - expectedBeforeThisMonth);
        const totalNetTarget = openingArrears + monthlyTarget;

        const remainingArrears = Math.max(0, openingArrears - paidThisMonth);
        const remainingMonthlyTarget = Math.max(0, monthlyTarget - Math.max(0, paidThisMonth - openingArrears));
        const remainingTotalNetTarget = remainingArrears + remainingMonthlyTarget;

        const isPaidInFullForMonth = totalPaidToDate >= expectedByEndOfMonth;
        const isPartiallyPaid = !isPaidInFullForMonth && totalPaidToDate > expectedBeforeThisMonth;
        
        const shortfallAtEndOfMonth = Math.max(0, expectedByEndOfMonth - totalPaidByEndOfSelectedMonth);

        const isEmiDueByNow = isBefore(startOfMonth(addMonths(startDate, 1)), monthEnd) || isSameMonth(startOfMonth(addMonths(startDate, 1)), monthEnd);
        const hasRemainingBalance = totalPaidToDate < totalPayable;

        if (isEmiDueByNow && (hasRemainingBalance || paidThisMonth > 0)) {
            totalActualCollectedInMonth += paidThisMonth;
            
            if (totalNetTarget > 0 || paidThisMonth > 0) {
                totalMonthlyTarget += monthlyTarget;
                totalRemainingArrears += remainingArrears;
                totalShortfall += shortfallAtEndOfMonth;
                
                if (totalNetTarget > 0) {
                    expectedCount++;
                    if (totalPaidByEndOfSelectedMonth >= expectedByEndOfMonth) collectedCount++;
                }

                allEntries.push({
                    customerName: customer.name,
                    customerId: customer.id,
                    emiAmount: emiAmount,
                    openingArrears: openingArrears,
                    remainingArrears: remainingArrears,
                    monthlyTarget: monthlyTarget,
                    remainingMonthlyTarget: remainingMonthlyTarget,
                    totalNetTarget: totalNetTarget,
                    remainingTotalNetTarget: remainingTotalNetTarget,
                    isPaidInFullForMonth,
                    isPartiallyPaid,
                    nextEmiNumber: Math.min(customer.duration, Math.floor(totalPaidToDate / emiAmount) + 1),
                    totalEmis: customer.duration
                });
            }
        }
    });

    return {
        emis: allEntries,
        stats: {
            expected: totalMonthlyTarget,
            actual: totalActualCollectedInMonth,
            shortfall: totalShortfall,
            collectedCount,
            expectedCount,
            totalArrears: totalRemainingArrears
        }
    };
  }, [customers, currentMonth]);

  const filteredEmis = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return monthlyData.emis
        .filter(e => e.customerName.toLowerCase().includes(lowerSearch))
        .sort((a, b) => {
            if (a.isPaidInFullForMonth !== b.isPaidInFullForMonth) return a.isPaidInFullForMonth ? 1 : -1;
            return b.remainingArrears - a.remainingArrears;
        });
  }, [monthlyData.emis, searchTerm]);

  const handleOpenPayment = (emi: EmiEntry) => {
    setSelectedEmiForPayment(emi);
    setPaymentAmount(Math.round(emi.remainingTotalNetTarget).toString());
  };

  const handleRecordPayment = async () => {
    const amount = Math.round(parseFloat(paymentAmount));
    if (!selectedEmiForPayment || isNaN(amount) || amount < 0 || !paymentDate) return;

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
        
        const emiNumber = Math.floor((currentTotalPaid + amount) / Math.round(customer.monthlyEMI));
        const emiInfo = `EMI #${emiNumber} of ${customer.duration}`;

        setSuccessInfo({
            customer: customer,
            amount: amount,
            balance: newRemainingBalance,
            date: format(paymentDate, 'dd MMM yyyy'),
            emiInfo: emiInfo
        });
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
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <TooltipProvider>
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 p-4 md:px-6 md:pt-6 border-b">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(prev => startOfMonth(addMonths(prev, -1)))}><ChevronLeft className="h-4 w-4" /></Button>
                <h2 className="text-xl font-bold text-primary w-48 text-center">{format(currentMonth, "MMMM yyyy")}</h2>
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(prev => startOfMonth(addMonths(prev, 1)))}><ChevronRight className="h-4 w-4" /></Button>
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
                    <div className="text-[10px] text-muted-foreground">Outstanding before {format(currentMonth, 'MMM')}</div>
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
                    <div className="text-[10px]">Unpaid for this period</div>
                </CardContent>
            </Card>
            <Card className="border-primary/20 shadow-none">
                <CardHeader className="p-3 pb-0"><CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Files Settled</CardTitle></CardHeader>
                <CardContent className="p-3 pt-1">
                    <div className="text-xl font-bold">{monthlyData.stats.collectedCount} / {monthlyData.stats.expectedCount}</div>
                    <div className="text-[10px] text-muted-foreground">Customers cleared</div>
                </CardContent>
            </Card>
            <div className="hidden xl:block">
                <Card className="bg-muted/50 border-none shadow-none">
                    <CardHeader className="p-3 pb-0"><CardTitle className="text-[10px] uppercase text-muted-foreground">Status</CardTitle></CardHeader>
                    <CardContent className="p-3 pt-1">
                        <div className="text-sm font-medium">{isPastMonth ? "Historical View" : isFutureMonth ? "Future Period" : "Active Period"}</div>
                        <div className="text-[10px] text-muted-foreground">{isCurrentMonth ? "Accepting payments" : "Payments disabled"}</div>
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
                <div className="flex gap-1 items-center">
                    {!emi.isPaidInFullForMonth && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                            onClick={() => {
                                const customer = customersData?.find(c => c.id === emi.customerId);
                                if (customer) {
                                    window.open(getWhatsAppReminderLink(
                                        customer.phone,
                                        customer.name,
                                        emi.remainingTotalNetTarget,
                                        customer.phoneModel,
                                        customer.totalPayable - (customer.payments?.reduce((s, p) => s + Math.round(p.amount), 0) || 0),
                                        format(currentMonth, "dd MMM yyyy"),
                                        appSettings as AppSettings
                                    ), '_blank');
                                }
                            }}
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    )}
                    {!emi.isPaidInFullForMonth && isCurrentMonth && (
                        <Button size="sm" className="h-8 px-3" onClick={() => handleOpenPayment(emi)}>Pay</Button>
                    )}
                    {!emi.isPaidInFullForMonth && !isCurrentMonth && (
                        <div className="text-[10px] font-bold flex items-center gap-1 uppercase">
                            {isPastMonth ? (
                                <span className="text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Overdue</span>
                            ) : (
                                <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Future</span>
                            )}
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
                <div className="flex justify-between items-end">
                    <div className="text-xs text-muted-foreground">Remaining Target</div>
                    <div className="text-lg font-bold text-primary">{formatCurrency(emi.remainingTotalNetTarget)}</div>
                </div>
                <div className="space-y-1 pt-2 border-t text-[11px]">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Current EMI:</span>
                        <span>{formatCurrency(emi.remainingMonthlyTarget)}</span>
                    </div>
                    {emi.remainingArrears > 0 && (
                        <div className="flex justify-between text-destructive font-medium">
                            <span>Past Arrears:</span>
                            <span>{formatCurrency(emi.remainingArrears)}</span>
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
                    Review the debt breakdown below. Payments clear historical arrears first (FIFO).
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Past Arrears</Label>
                    <div className="col-span-3 font-medium text-destructive">{formatCurrency(selectedEmiForPayment?.remainingArrears || 0)}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Current Due</Label>
                    <div className="col-span-3 font-medium">{formatCurrency(selectedEmiForPayment?.remainingMonthlyTarget || 0)}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4 border-t pt-2">
                    <Label className="text-right font-bold">Total Amount</Label>
                    <div className="col-span-3 font-bold text-primary">{formatCurrency(selectedEmiForPayment?.remainingTotalNetTarget || 0)}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Collect (₹)</Label>
                    <Input 
                        className="col-span-3" 
                        type="number" 
                        min="0"
                        value={paymentAmount} 
                        onChange={e => {
                            const val = e.target.value;
                            if (parseFloat(val) < 0) return;
                            setPaymentAmount(val);
                        }} 
                    />
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

      <Dialog open={!!successInfo} onOpenChange={o => !o && setSuccessInfo(null)}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-6 w-6" />
                    Payment Successful
                </DialogTitle>
                <DialogDescription>
                    The collection has been recorded in the system.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Customer:</span> <span className="font-bold uppercase">{successInfo?.customer.name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Amount:</span> <span className="font-bold">{formatCurrency(successInfo?.amount || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Balance:</span> <span className="font-bold text-primary">{formatCurrency(successInfo?.balance || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Installment:</span> <span className="font-bold">{successInfo?.emiInfo}</span></div>
                </div>
                <Button 
                    className="w-full bg-[#25D366] hover:bg-[#20bd5c] text-white" 
                    onClick={() => {
                        if (successInfo) {
                            window.open(getWhatsAppPaymentLink(
                                successInfo.customer.phone,
                                successInfo.customer.name,
                                successInfo.amount,
                                successInfo.customer.phoneModel,
                                successInfo.balance,
                                successInfo.date,
                                successInfo.emiInfo,
                                appSettings as AppSettings
                            ), '_blank');
                        }
                    }}
                >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Send WhatsApp Receipt
                </Button>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setSuccessInfo(null)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

