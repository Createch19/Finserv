
"use client";

import { useState, useMemo } from "react";
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useCollection, useDoc, useFirestore } from "@/firebase";
import { collection, doc, query, updateDoc, where } from "firebase/firestore";
import type { Customer, WithId, AppSettings } from "@/types";
import { FirestorePermissionError, errorEmitter } from "@/firebase";
import { Badge } from "@/components/ui/badge";

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

interface CommissionEntry {
    customerId: string;
    customerName: string;
    agentName: string;
    agentId: string;
    completionDate: string;
    commissionAmount: number;
    commissionSettled: boolean;
}

export function CommissionList() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedCommission, setSelectedCommission] = useState<CommissionEntry | null>(null);
  const { toast } = useToast();

  const settingsRef = useMemo(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'defaults');
  }, [firestore]);
  const { data: defaultSettings, isLoading: settingsLoading } = useDoc<AppSettings>(settingsRef);

  const completedCustomersQuery = useMemo(() => {
    if (!firestore || !user || (user.role !== 'admin' && user.role !== 'superadmin')) {
        return null;
    }

    const baseQuery = query(collection(firestore, "customers"), where('status', '==', 'completed'));
    
    if (user.role === 'superadmin') {
        return baseQuery;
    }

    if (user.companyId) {
        return query(baseQuery, where('companyId', '==', user.companyId));
    }
    
    return null;
  }, [firestore, user]);

  const { data: completedCustomers, isLoading: customersLoading } = useCollection<WithId<Customer>>(completedCustomersQuery);
  
  const isLoading = customersLoading || settingsLoading;

  const { pending, history } = useMemo(() => {
    if (!completedCustomers) return { pending: [], history: [] };

    const fallbackCommissionRate = defaultSettings?.agentCommissionRate || 10;

    const commissions: CommissionEntry[] = completedCustomers.map(customer => {
        const commissionRate = customer.agentCommissionRate ?? fallbackCommissionRate;
        const commissionAmount = customer.interestAmount * commissionRate / 100;
        const lastPaymentDate = customer.payments.length > 0
            ? customer.payments[customer.payments.length - 1].date
            : customer.startDate;

        return {
            customerId: customer.id,
            customerName: customer.name,
            agentName: customer.agent.name,
            agentId: customer.agent.uid,
            completionDate: lastPaymentDate,
            commissionAmount: commissionAmount,
            commissionSettled: !!customer.commissionSettled
        };
    });
    
    const pending = commissions.filter(c => !c.commissionSettled);
    const history = commissions.filter(c => c.commissionSettled);

    return { pending, history };

  }, [completedCustomers, defaultSettings]);
  

  const handleSettleCommission = async (commission: CommissionEntry | null) => {
    if (!firestore || !user || !commission) return;
    setProcessingId(commission.customerId);
    const docRef = doc(firestore, "customers", commission.customerId);

    const updatePayload = { commissionSettled: true };

    updateDoc(docRef, updatePayload)
      .then(() => {
        toast({
          title: "Commission Settled",
          description: `Commission for ${commission.customerName} has been marked as paid.`,
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: updatePayload,
        });
        errorEmitter.emit("permission-error", permissionError);
      })
      .finally(() => {
        setProcessingId(null);
        setSelectedCommission(null);
      });
  };

  if (isLoading) {
      return (
          <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
          </div>
      )
  }

  const CommissionTable = ({ commissions, isHistory = false }: { commissions: CommissionEntry[], isHistory?: boolean }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Agent</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Completion Date</TableHead>
          <TableHead className="text-right">Commission</TableHead>
          {!isHistory && <TableHead className="text-center">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {commissions.length > 0 ? (
          commissions.map((comm) => (
            <TableRow key={comm.customerId}>
              <TableCell>{comm.agentName}</TableCell>
              <TableCell>{comm.customerName}</TableCell>
              <TableCell>{format(parseISO(comm.completionDate), "dd MMM yyyy")}</TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(comm.commissionAmount)}</TableCell>
              {!isHistory && (
                <TableCell className="text-center">
                   <Button size="sm" variant="outline" onClick={() => setSelectedCommission(comm)} disabled={processingId === comm.customerId}>
                        {processingId === comm.customerId ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle className="h-4 w-4" />}
                         <span className="ml-2">Settle</span>
                    </Button>
                </TableCell>
              )}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={isHistory ? 4 : 5} className="h-24 text-center">
              No commissions in this category.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <>
        <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pending">
                    <Award className="mr-2 h-4 w-4" />
                    Pending Settlement
                </TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="pending">
                <Card>
                    <CardHeader>
                        <CardTitle>Pending Commissions</CardTitle>
                        <CardDescription>These commissions are due to be paid to agents.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CommissionTable commissions={pending} />
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="history">
                <Card>
                    <CardHeader>
                        <CardTitle>Settlement History</CardTitle>
                        <CardDescription>A log of all previously paid commissions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CommissionTable commissions={history} isHistory />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>

        <AlertDialog open={!!selectedCommission} onOpenChange={(open) => !open && setSelectedCommission(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Confirm Settlement</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to mark the commission of <strong>{formatCurrency(selectedCommission?.commissionAmount || 0)}</strong> for agent <strong>{selectedCommission?.agentName}</strong> as settled? This action cannot be undone.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleSettleCommission(selectedCommission)}>
                    Confirm
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
