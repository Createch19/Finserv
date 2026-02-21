"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, addMonths, parseISO, startOfMonth, isBefore } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, CheckCircle2, Clock, CalendarDays, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Progress } from "@/components/ui/progress";
import type { Customer, WithId } from "@/types";
import { useCollection, useFirestore } from "@/firebase";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where } from "firebase/firestore";
import { cn } from "@/lib/utils";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

        // Loop from Month 0: EMI #1 is due in the month of start.
        for (let i = 0; i < customer.duration; i++) {
            const dueDate = addMonths(parseISO(customer.startDate), i);
            const amount = monthlyEmi;
            const paidForThisEmi = Math.min(amount, Math.max(0, remainingToAllocate));
            remainingToAllocate -= paidForThisEmi;

            let status: EmiStatus = "upcoming";
            if (paidForThisEmi >= amount) status = "paid";
            else if (paidForThisEmi > 0) status = "partial";
            else if (isBeforeToday(dueDate)) status = "due";

            emis.push({ number: i + 1, dueDate, amount, paidAmount: paidForThisEmi, status });
        }

        return { ...customer, emis, totalPaid, totalPayable };
    }).filter(loan => {
        const searchMatch = loan.name.toLowerCase().includes(searchTerm.toLowerCase()) || loan.phoneModel.toLowerCase().includes(searchTerm.toLowerCase());
        const statusMatch = statusFilter === 'all' || loan.status === statusFilter;
        return searchMatch && statusMatch;
    });
  }, [customers, searchTerm, statusFilter]);

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

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
                        <AccordionContent className="p-4 pt-0 space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
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
    return isBefore(startOfMonth(date), startOfMonth(new Date()));
}

function getStatusIcon(status: EmiStatus) {
    switch (status) {
        case "paid": return <CheckCircle2 className="h-4 w-4 text-green-600" />;
        case "partial": return <Clock className="h-4 w-4 text-orange-500" />;
        case "due": return <AlertCircle className="h-4 w-4 text-destructive" />;
        default: return <CalendarDays className="h-4 w-4 text-muted-foreground" />;
    }
}
