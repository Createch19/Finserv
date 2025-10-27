
"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, ChevronLeft, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import type { Customer } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { useCollection, useFirestore, useUser, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, deleteDoc, doc } from 'firebase/firestore';

const getStatusBadgeVariant = (status: Customer['status']) => {
  switch (status) {
    case 'active':
      return 'default';
    case 'completed':
      return 'secondary';
    case 'overdue':
      return 'destructive';
    default:
      return 'outline';
  }
};

const ITEMS_PER_PAGE = 10;

export function CustomerTable({ searchTerm }: { searchTerm: string }) {
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const customersRef = user && firestore ? collection(firestore, `users/${user.uid}/customers`) : null;
  const { data: customers, isLoading } = useCollection<Customer>(customersRef);

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    const lowercasedFilter = searchTerm.toLowerCase();
    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(lowercasedFilter) ||
        customer.phone.includes(searchTerm)
      );
    });
  }, [searchTerm, customers]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentCustomers = filteredCustomers.slice(startIndex, endIndex);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleDelete = (customerId: string) => {
    if (!user || !firestore) return;
    const docRef = doc(firestore, `users/${user.uid}/customers`, customerId);
    
    deleteDoc(docRef).then(() => {
      toast({
        title: "Customer Deleted",
        description: "The customer has been successfully deleted.",
      });
    }).catch(serverError => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
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
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden md:table-cell">Phone Model</TableHead>
              <TableHead className="hidden lg:table-cell">Financed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentCustomers.length > 0 ? (
              currentCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-sm text-muted-foreground">{customer.phone}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{customer.phoneModel}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div>{`₹${customer.financedAmount.toLocaleString()}`}</div>
                    <div className="text-sm text-muted-foreground">{`${customer.duration} months`}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(customer.status)} className="capitalize">
                      {customer.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Link href={`/customers/${customer.id}`} passHref>
                      <Button variant="outline" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                           <Trash2 className="mr-2 h-4 w-4" />
                           Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this
                            customer's data from our servers.
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
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No customers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-muted-foreground">
            Showing {filteredCustomers.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredCustomers.length)} of {filteredCustomers.length} customers.
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

    