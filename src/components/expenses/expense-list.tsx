
"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
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
import { Button } from "@/components/ui/button";
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
import { Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useCollection, useFirestore } from "@/firebase";
import { collection, deleteDoc, doc, orderBy, query } from "firebase/firestore";
import type { Expense, WithId } from "@/types";
import { FirestorePermissionError, errorEmitter } from "@/firebase";
import { Badge } from "@/components/ui/badge";

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;

export function ExpenseList() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const expensesQuery = useMemo(() => {
    if (!firestore || user?.role !== "admin") return null;
    return query(collection(firestore, "expenses"), orderBy("date", "desc"));
  }, [firestore, user]);

  const { data: expenses, isLoading } =
    useCollection<WithId<Expense>>(expensesQuery);

  const handleDelete = (expenseId: string) => {
    if (!firestore) return;
    setDeletingId(expenseId);
    const docRef = doc(firestore, "expenses", expenseId);

    deleteDoc(docRef)
      .then(() => {
        toast({
          title: "Expense Deleted",
          description: "The expense has been successfully deleted.",
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: "delete",
        });
        errorEmitter.emit("permission-error", permissionError);
      })
      .finally(() => {
        setDeletingId(null);
      });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense History</CardTitle>
        <CardDescription>A list of all recorded expenses.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses && expenses.length > 0 ? (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      {format(new Date(expense.date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{expense.type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {expense.notes}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deletingId === expense.id}
                          >
                            {deletingId === expense.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Are you absolutely sure?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will
                              permanently delete this expense.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(expense.id)}
                            >
                              Continue
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No expenses recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
