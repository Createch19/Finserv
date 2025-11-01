
"use client";

import { useState } from "react";
import { useFirestore } from "@/firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import type { Customer, WithId } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, CheckCircle, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FirestorePermissionError, errorEmitter } from "@/firebase";
import Link from "next/link";
import { format } from "date-fns";
import type { UseCollectionResult } from "@/firebase/firestore/use-collection";

const formatCurrency = (amount: number) => `₹${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

interface ApprovalListProps extends UseCollectionResult<Customer> {
    pendingCustomers: WithId<Customer>[] | null;
}

export function ApprovalList({ pendingCustomers, isLoading, error }: ApprovalListProps) {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleApprove = async (customerId: string) => {
    if (!firestore) return;
    setApprovingId(customerId);
    const customerDocRef = doc(firestore, "customers", customerId);

    try {
      await updateDoc(customerDocRef, { status: "active" });
      toast({
        title: "Customer Approved",
        description: "The customer has been moved to the active customer list.",
      });
    } catch (serverError) {
      const permissionError = new FirestorePermissionError({
        path: customerDocRef.path,
        operation: "update",
        requestResourceData: { status: "active" },
      });
      errorEmitter.emit("permission-error", permissionError);
    } finally {
      setApprovingId(null);
    }
  };

  const handleDelete = (customerId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'customers', customerId);
    setDeletingId(customerId);
    
    deleteDoc(docRef).then(() => {
      toast({
        title: "Request Deleted",
        description: "The approval request has been successfully deleted.",
      });
    }).catch(serverError => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
        setDeletingId(null);
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
      return (
          <div className="text-center py-10 text-destructive">
              <p>An error occurred while fetching approvals.</p>
          </div>
      )
  }

  if (!pendingCustomers || pendingCustomers.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>There are no pending customer approvals.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer Name</TableHead>
              <TableHead>Down Payment</TableHead>
              <TableHead>Financed Amount</TableHead>
              <TableHead>Interest</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Date Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingCustomers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <Link href={`/customers/${customer.id}`} passHref>
                    <span className="font-medium hover:underline cursor-pointer">{customer.name}</span>
                  </Link>
                   <div className="text-sm text-muted-foreground">{customer.phone}</div>
                </TableCell>
                <TableCell>{formatCurrency(customer.downPayment)}</TableCell>
                <TableCell>{formatCurrency(customer.financedAmount)}</TableCell>
                <TableCell>{formatCurrency(customer.interestAmount)}</TableCell>
                <TableCell>{customer.duration} months</TableCell>
                <TableCell>{format(new Date(customer.startDate), 'dd MMM yyyy')}</TableCell>
                <TableCell className="text-right space-x-2">
                  {user?.role === 'admin' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(customer.id)}
                        disabled={approvingId === customer.id || deletingId === customer.id}
                      >
                        {approvingId === customer.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="mr-2 h-4 w-4" />
                        )}
                        Approve
                      </Button>

                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" disabled={deletingId === customer.id || approvingId === customer.id}>
                                  {deletingId === customer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete this approval request.
                              </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(customer.id)}>
                                  Continue
                              </AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
