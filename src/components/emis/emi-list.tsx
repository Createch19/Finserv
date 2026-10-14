
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, addMonths, parseISO, startOfMonth, isBefore, isSameMonth } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, CheckCircle2, Clock, CalendarDays, AlertCircle, RotateCcw, History, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Customer, WithId } from "@/types";
import { useCollection, useFirestore, FirestorePermissionError, errorEmitter } from "@/firebase";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where, doc, updateDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getWhatsAppPaymentLink } from "@/lib/whatsapp-utils";

type EmiStatus = "paid" | "partial" | "due" | "upcoming";

type EmiDetail = {
    number: number;
    dueDate: Date;
    amount: number;
    paidAmount: number;
    status: EmiStatus;
};

const formatCurrency = (amount: number) => Math.round(amount).toLocaleString('en-IN', { maximumFractionDigits: 0, style: 'currency', currency: 'INR' });

export function EmiList() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isRevoking, setIsRevoking] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const customersQuery = useMemo(() => {
    if (!firestore || !user) return null;
    if (user.role === 'superadmin') return collection(firestore, 'customers');
    if (!user.companyId) return null;
    return query(collection(firestore, 'customers'), where('companyId', '==', user.companyId));
  }, [user, firestore]);

  const { data: customersData, isLoading } = useCollection<WithId<Customer>>(customersQuery);
  const customers = useMemo(() => customersData?.filter(c => c.status !== 'pending') || [], [customersData]);

  const processedLoans = useMemo(() => {
    return customers.map(customer => {
        const emis: EmiDetail[] = [];
        const monthlyEmi = Math.round(customer.monthlyEMI);
        const totalPayable = Math.round(customer.totalPayable);
        const totalPaid = Math.round(customer.payments?.reduce((s, p) => s + Math.round(p.amount), 0) || 0);
        let remainingToAllocate = totalPaid;

        const startDate = startOfMonth(parseISO(customer.startDate));

        for (let i = 1; i <= customer.duration; i++) {
            const dueDate = addMonths(startDate, i);
            const amount = i === customer.duration ? (totalPayable - (monthlyEmi * (i - 1))) : monthlyEmi;
            const paidForThisEmi = Math.min(amount, Math.max(0, remainingToAllocate));
            remainingToAllocate -= paidForThisEmi;

            let status: EmiStatus = "upcoming";
            if (paidForThisEmi >= amount) status = "paid";
            else if (paidForThisEmi > 0) status = "partial";
            else if (isBeforeToday(dueDate)) status = "due";

            emis.push({ number: i, dueDate, amount, paidAmount: paidForThisEmi, status });
        }

        return { ...customer, emis, totalPaid, totalPayable };
    }).filter(loan => {
        const searchMatch = loan.name.toLowerCase().includes(searchTerm.toLowerCase()) || loan.phoneModel.toLowerCase().includes(searchTerm.toLowerCase());
        const statusMatch = statusFilter === 'all' || loan.status === statusFilter;
        return searchMatch && statusMatch;
    });
  }, [customers, searchTerm, statusFilter]);

  const handleRevokeLastPayment = async (customer: WithId<Customer>) => {
    if (!firestore || !isAdmin || !customer.payments || customer.payments.length === 0) return;

    setIsRevoking(customer.id);
    const newPayments = [...customer.payments];
    const revokedPayment = newPayments.pop();
    
    const customerRef = doc(firestore, 'customers', customer.id);
    const updatePayload = {
        payments: newPayments,
        status: customer.status === 'completed' ? 'active' : customer.status
    };

    updateDoc(customerRef, updatePayload)
        .then(() => {
            toast({
                title: "Payment Revoked",
                description: `Successfully reverted ${formatCurrency(revokedPayment?.amount || 0)} payment for ${customer.name}.`
            });
        })
        .catch(e => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: customerRef.path,
                operation: 'update',
                requestResourceData: updatePayload
            }));
        })
        .finally(() => setIsRevoking(null));
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col h-full">
        <div className="p-4 md:p-6 border-b bg-background/95 backdrop-blur sticky top-0 z-10 flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search name or model..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Loans</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <div className="p-4 md:p-6 flex-1 overflow-y-auto">
            <Accordion type="single" collapsible className="space-y-4">
                {processedLoans.map(loan => (
                    <AccordionItem key={loan.id} value={loan.id} className="border rounded-lg bg-card overflow-hidden">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 transition-colors">
                            <div className="flex flex-1 items-center justify-between gap-4 text-left">
                                <div>
                                    <div className="font-bold text-sm uppercase">{loan.name}</div>
                                    <div className="text-xs text-muted-foreground">{loan.phoneModel}</div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="hidden md:block text-right">
                                        <div className="text-xs font-medium">{formatCurrency(loan.totalPaid)} Paid</div>
                                        <Progress value={(loan.totalPaid / loan.totalPayable) * 100} className="h-1.5 w-24 mt-1" />
                                    </div>
                                    <Badge variant={loan.status === 'completed' ? 'secondary' : (loan.status === 'overdue' ? 'destructive' : 'default')} className="capitalize w-20 justify-center">
                                        {loan.status}
                                    </Badge>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-0">
                            <div className="space-y-6 mt-4">
                                <div>
                                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                                        <CalendarDays className="h-3 w-3" />
                                        EMI Schedule
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {loan.emis.map(emi => (
                                            <div key={emi.number} className={cn("flex items-center justify-between p-3 rounded-md border text-xs", emi.status === 'paid' ? "bg-green-50/50 border-green-100" : "bg-muted/30")}>
                                                <div className="flex items-center gap-3">
                                                    {getStatusIcon(emi.status)}
                                                    <div>
                                                        <div className="font-semibold">EMI #{emi.number} • {formatCurrency(emi.amount)}</div>
                                                        <div className="text-muted-foreground">{format(emi.dueDate, "dd MMM yyyy")}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    {emi.status === 'partial' && <Badge className="bg-orange-500 mb-1 text-[10px] h-4">Partial</Badge>}
                                                    {emi.status === 'paid' && <Badge className="bg-green-600 mb-1 text-[10px] h-4">Paid</Badge>}
                                                    <div className="font-mono">{formatCurrency(emi.paidAmount)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {loan.payments && loan.payments.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                                            <History className="h-3 w-3" />
                                            Recent Transactions
                                        </h4>
                                        <div className="rounded-md border bg-muted/10 overflow-hidden">
                                            {[...loan.payments].reverse().map((payment, idx) => (
                                                <div key={payment.paymentId} className="flex items-center justify-between p-3 border-b last:border-0 bg-background/50 text-xs">
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-medium text-muted-foreground">{format(parseISO(payment.date), "dd MMM yyyy")}</span>
                                                        <span className="font-bold text-primary">{formatCurrency(payment.amount)}</span>
                                                        <Badge variant="outline" className="text-[9px] uppercase h-4 px-1">{payment.mode}</Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                            onClick={() => window.open(getWhatsAppPaymentLink(
                                                                loan.phone,
                                                                loan.name,
                                                                payment.amount,
                                                                loan.phoneModel,
                                                                payment.remainingBalance,
                                                                format(parseISO(payment.date), 'dd MMM yyyy')
                                                            ), '_blank')}
                                                        >
                                                            <MessageCircle className="h-4 w-4" />
                                                        </Button>
                                                        {idx === 0 && isAdmin && (
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={isRevoking === loan.id}>
                                                                        {isRevoking === loan.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3 w-3 mr-1" />}
                                                                        Revoke
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AccordionContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Revoke Last Payment?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            This will undo the payment of <strong>{formatCurrency(payment.amount)}</strong> recorded on {format(parseISO(payment.date), "PPP")}. The loan balance will be increased accordingly.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => handleRevokeLastPayment(loan)} className="bg-destructive hover:bg-destructive/90">Confirm Revoke</AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AccordionContent>
                                                            </AlertDialog>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
            {processedLoans.length === 0 && <div className="py-20 text-center text-muted-foreground font-medium">No records found matching filters.</div>}
        </div>
    </div>
  );
}

function isBeforeToday(date: Date) {
    const todayStart = startOfMonth(new Date());
    return isBefore(startOfMonth(date), todayStart);
}

function getStatusIcon(status: EmiStatus) {
    switch (status) {
        case "paid": return <CheckCircle2 className="h-4 w-4 text-green-600" />;
        case "partial": return <Clock className="h-4 w-4 text-orange-500" />;
        case "due": return <AlertCircle className="h-4 w-4 text-destructive" />;
        default: return <CalendarDays className="h-4 w-4 text-muted-foreground" />;
    }
}
