
"use client";

import { useMemo, useState } from "react";
import { useCollection, useFirestore } from "@/firebase";
import { collection, query, where, doc, updateDoc } from "firebase/firestore";
import type { Customer, WithId, User } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, CheckCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FirestorePermissionError, errorEmitter } from "@/firebase";
import Link from "next/link";
import { format } from "date-fns";

const formatCurrency = (amount: number) => `₹${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function ApprovalList() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const pendingCustomersQuery = useMemo(() => {
    if (!firestore || !user) return null;
    // Admins and Agents both see all pending submissions
    return query(
      collection(firestore, "customers"),
      where("status", "==", "pending")
    );
  }, [firestore, user]);

  const {
    data: pendingCustomers,
    isLoading,
    error,
  } = useCollection<WithId<Customer>>(pendingCustomersQuery);

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
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer Name</TableHead>
              <TableHead>Financed Amount</TableHead>
              <TableHead>Submitted By</TableHead>
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
                <TableCell>{formatCurrency(customer.financedAmount)}</TableCell>
                <TableCell>{customer.agent.name}</TableCell>
                <TableCell>{format(new Date(customer.startDate), 'dd MMM yyyy')}</TableCell>
                <TableCell className="text-right">
                  {user?.role === 'admin' && (
                    <Button
                      size="sm"
                      onClick={() => handleApprove(customer.id)}
                      disabled={approvingId === customer.id}
                    >
                      {approvingId === customer.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      Approve
                    </Button>
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
