
"use client";

import { useMemo, useState } from "react";
import type { Customer, WithId } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO, addMonths, isBefore, startOfMonth } from "date-fns";
import { RotateCcw, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useFirestore, FirestorePermissionError, errorEmitter } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
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

const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="flex flex-col">
        <span className="text-xs text-muted-foreground uppercase font-medium">{label}</span>
        <span className="font-semibold">{value}</span>
    </div>
);

const formatCurrency = (amount: number) => `₹${Math.round(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export function CustomerDetails({ customer }: { customer: WithId<Customer> }) {
    const { user } = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isRevoking, setIsRevoking] = useState(false);

    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    const loanSummary = useMemo(() => {
        const monthlyEmi = Math.round(customer.monthlyEMI);
        const totalPayable = Math.round(customer.totalPayable);
        const totalPaid = Math.round(customer.payments?.reduce((acc, p) => acc + Math.round(p.amount), 0) || 0);
        const remainingBalance = Math.max(0, totalPayable - totalPaid);
        
        const startDate = parseISO(customer.startDate);
        const today = new Date();
        const monthStart = startOfMonth(today);

        let expectedSoFar = 0;
        for (let i = 1; i <= customer.duration; i++) {
            const emiDate = addMonths(startDate, i);
            if (isBefore(startOfMonth(emiDate), monthStart)) {
                expectedSoFar += monthlyEmi;
            }
        }
        
        expectedSoFar = Math.min(expectedSoFar, totalPayable);
        const arrears = Math.max(0, expectedSoFar - totalPaid);
        const advance = Math.max(0, totalPaid - expectedSoFar);

        return { totalPaid, remainingBalance, arrears, advance };
    }, [customer]);

    const handleRevokeLastPayment = async () => {
        if (!firestore || !isAdmin || !customer.payments || customer.payments.length === 0) return;

        setIsRevoking(true);
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
                    description: `Successfully reverted ${formatCurrency(revokedPayment?.amount || 0)} payment.`
                });
            })
            .catch(e => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: customerRef.path,
                    operation: 'update',
                    requestResourceData: updatePayload
                }));
            })
            .finally(() => setIsRevoking(false));
    };

  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="p-4 pb-0"><CardTitle className="text-xs uppercase text-muted-foreground">Total Collected</CardTitle></CardHeader>
                    <CardContent className="p-4 pt-1"><div className="text-2xl font-bold text-primary">{formatCurrency(loanSummary.totalPaid)}</div></CardContent>
                </Card>
                <Card className="bg-destructive/5 border-destructive/20">
                    <CardHeader className="p-4 pb-0"><CardTitle className="text-xs uppercase text-muted-foreground">Arrears (Overdue)</CardTitle></CardHeader>
                    <CardContent className="p-4 pt-1"><div className="text-2xl font-bold text-destructive">{formatCurrency(loanSummary.arrears)}</div></CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                    <CardHeader className="p-4 pb-0"><CardTitle className="text-xs uppercase text-muted-foreground">Outstanding Balance</CardTitle></CardHeader>
                    <CardContent className="p-4 pt-1"><div className="text-2xl font-bold text-green-700">{formatCurrency(loanSummary.remainingBalance)}</div></CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle>Financing Summary</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <DetailItem label="Phone Model" value={customer.phoneModel} />
                    <DetailItem label="Total Price" value={formatCurrency(customer.totalPrice)} />
                    <DetailItem label="Down Payment" value={formatCurrency(customer.downPayment)} />
                    <DetailItem label="Financed Amount" value={formatCurrency(customer.financedAmount)} />
                    <DetailItem label="Interest" value={formatCurrency(customer.interestAmount)} />
                    <DetailItem label="Total Payable" value={formatCurrency(customer.totalPayable)} />
                    <DetailItem label="Monthly EMI" value={formatCurrency(customer.monthlyEMI)} />
                    <DetailItem label="Duration" value={`${customer.duration} months`} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Ledger / Payment History</CardTitle>
                    <CardDescription>{customer.payments?.length || 0} installments recorded.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Mode</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {customer.payments?.length > 0 ? [...customer.payments].reverse().map((p, index) => (
                                <TableRow key={p.paymentId}>
                                    <TableCell className="font-medium">{format(parseISO(p.date), 'dd MMM yyyy')}</TableCell>
                                    <TableCell className="capitalize text-xs"><Badge variant="outline">{p.mode}</Badge></TableCell>
                                    <TableCell className="text-right font-semibold text-primary">{formatCurrency(p.amount)}</TableCell>
                                    <TableCell className="text-right font-mono text-xs">{formatCurrency(p.remainingBalance)}</TableCell>
                                    {isAdmin && (
                                        <TableCell className="text-right">
                                            {index === 0 && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" disabled={isRevoking}>
                                                            {isRevoking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Revoke this payment?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This will delete the transaction of {formatCurrency(p.amount)} and restore the customer's balance. This action is only available for the most recent payment to maintain ledger integrity.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={handleRevokeLastPayment} className="bg-destructive hover:bg-destructive/90">Confirm Revoke</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={isAdmin ? 5 : 4} className="text-center h-24 text-muted-foreground">No payments recorded yet.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <DetailItem label="Phone" value={customer.phone} />
                    <DetailItem label="Aadhar" value={customer.aadhar} />
                    <DetailItem label="Address" value={<p className="text-sm leading-relaxed">{customer.address}</p>} />
                    <DetailItem label="Status" value={<Badge className="capitalize px-4">{customer.status}</Badge>} />
                </CardContent>
            </Card>
             <Card>
                <CardHeader><CardTitle>Agent Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <DetailItem label="Name" value={customer.agent.name} />
                    <DetailItem label="Email" value={customer.agent.email} />
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
