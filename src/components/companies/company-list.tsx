
"use client";

import { useState } from "react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { deleteDoc, doc } from "firebase/firestore";
import type { Company, WithId } from "@/types";
import { FirestorePermissionError, errorEmitter } from "@/firebase";
import { Badge } from "@/components/ui/badge";

interface CompanyListProps {
    companies: WithId<Company>[] | null;
    isLoading: boolean;
}

export function CompanyList({ companies, isLoading }: CompanyListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleDelete = (companyId: string) => {
    if (!firestore) return;
    setDeletingId(companyId);
    const docRef = doc(firestore, "companies", companyId);

    deleteDoc(docRef)
      .then(() => {
        toast({
          title: "Company Deleted",
          description: "The company has been successfully deleted.",
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
        <CardTitle>Existing Companies</CardTitle>
        <CardDescription>A list of all tenant companies.</CardDescription>
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
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies && companies.length > 0 ? (
                companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">
                      {company.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={company.status === 'active' ? 'success' : 'secondary'} className="capitalize">{company.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(company.createdAt), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deletingId === company.id}
                          >
                            {deletingId === company.id ? (
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
                              This action cannot be undone. This will permanently delete the company.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(company.id)}
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
                  <TableCell colSpan={4} className="h-24 text-center">
                    No companies found.
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
