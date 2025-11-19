
"use client";

import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
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
import { Button } from "@/components/ui/button";
import { Loader2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useCollection, useFirestore } from "@/firebase";
import { collection, doc, orderBy, query, updateDoc, where } from "firebase/firestore";
import type { WithdrawalRequest, WithId } from "@/types";
import { FirestorePermissionError, errorEmitter } from "@/firebase";
import { Badge } from "../ui/badge";

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const getStatusBadgeVariant = (status: WithdrawalRequest['status']) => {
  switch (status) {
    case 'approved': return 'success';
    case 'rejected': return 'destructive';
    case 'pending': return 'outline';
    default: return 'default';
  }
};

export function WithdrawalApprovalList() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  const requestsQuery = useMemo(() => {
    if (!firestore || !user || user.role !== 'superadmin') return null;
    return query(collection(firestore, "withdrawalRequests"), orderBy("requestedAt", "desc"));
  }, [firestore, user]);

  const { data: allRequests, isLoading } = useCollection<WithId<WithdrawalRequest>>(requestsQuery);

  const pendingRequests = useMemo(() => allRequests?.filter(r => r.status === 'pending'), [allRequests]);
  const processedRequests = useMemo(() => allRequests?.filter(r => r.status !== 'pending'), [allRequests]);

  const handleProcessRequest = async (requestId: string, newStatus: 'approved' | 'rejected') => {
    if (!firestore || !user) return;
    setProcessingId(requestId);
    const docRef = doc(firestore, "withdrawalRequests", requestId);

    const updatePayload = {
        status: newStatus,
        processedAt: new Date().toISOString(),
        processedBy: user.uid,
    };

    updateDoc(docRef, updatePayload)
      .then(() => {
        toast({
          title: `Request ${newStatus}`,
          description: `The request has been successfully ${newStatus}.`,
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
    <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
             <Card>
                <CardHeader>
                    <CardTitle>Pending Requests</CardTitle>
                    <CardDescription>Review and process new requests for fund withdrawals.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Requested By</TableHead>
                                <TableHead>Notes</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {pendingRequests && pendingRequests.length > 0 ? (
                            pendingRequests.map((req) => (
                            <TableRow key={req.id}>
                                <TableCell>{format(parseISO(req.requestedAt), "dd MMM yyyy")}</TableCell>
                                <TableCell>{req.companyName}</TableCell>
                                <TableCell>{req.adminName}</TableCell>
                                <TableCell>{req.notes}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(req.amount)}</TableCell>
                                <TableCell className="text-center space-x-2">
                                    <Button size="sm" variant="outline" onClick={() => handleProcessRequest(req.id, 'approved')} disabled={processingId === req.id}>
                                        {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleProcessRequest(req.id, 'rejected')} disabled={processingId === req.id}>
                                        {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4" />}
                                    </Button>
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No pending requests.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </CardContent>
             </Card>
        </TabsContent>
        <TabsContent value="history">
            <Card>
                <CardHeader>
                    <CardTitle>Processed Requests</CardTitle>
                    <CardDescription>A log of all approved and rejected withdrawal requests.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Processed</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Requested By</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {processedRequests && processedRequests.length > 0 ? (
                            processedRequests.map((req) => (
                            <TableRow key={req.id}>
                                <TableCell>{req.processedAt ? format(parseISO(req.processedAt), "dd MMM yyyy") : '-'}</TableCell>
                                <TableCell>{req.companyName}</TableCell>
                                <TableCell>{req.adminName}</TableCell>
                                <TableCell>
                                    <Badge variant={getStatusBadgeVariant(req.status)} className="capitalize">{req.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(req.amount)}</TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No processed requests yet.
                                </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </CardContent>
             </Card>
        </TabsContent>
    </Tabs>
  );
}
