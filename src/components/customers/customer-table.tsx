
"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Eye, ChevronLeft, ChevronRight, Trash2, Loader2, MoreVertical, Pencil } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Customer, WithId, User } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { useCollection, useFirestore } from '@/firebase';
import { FirestorePermissionError, errorEmitter } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { collection, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';

const getStatusBadgeVariant = (status: Customer['status']) => {
  switch (status) {
    case 'active':
      return 'default';
    case 'completed':
      return 'secondary';
    case 'overdue':
      return 'destructive';
    case 'pending':
        return 'outline';
    default:
      return 'outline';
  }
};

const ITEMS_PER_PAGE = 10;

const formatCurrency = (amount: number) => `₹${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;


export function CustomerTable({ searchTerm }: { searchTerm: string }) {
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const { user, loading: userLoading } = useAuth();
  const firestore = useFirestore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const customersQuery = useMemo(() => {
    if (!firestore || !user) {
        return null;
    }
    
    // Admins and Agents fetch all customers.
    // We will filter out 'pending' customers on the client-side.
    return query(collection(firestore, 'customers'), orderBy('name', 'asc'));
    
  }, [firestore, user]);

  const { data: customersData, isLoading: customersLoading, error } = useCollection<WithId<Customer>>(customersQuery);
  
  const customers = useMemo(() => {
    if (!customersData) return [];
    // Filter out pending customers on the client.
    // This correctly handles old documents that don't have a status field.
    return customersData.filter(c => c.status !== 'pending');
  }, [customersData]);

  const isLoading = userLoading || (customersLoading && !error);
  
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
    if (!firestore) return;
    const docRef = doc(firestore, 'customers', customerId);
    setDeletingId(customerId);
    
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
    }).finally(() => {
        setDeletingId(null);
    });
  };
  
  if (isLoading) {
      return (
          <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
          </div>
      )
  }
  
  if (!customers || customers.length === 0) {
      return (
          <div className="text-center py-10 text-muted-foreground">
              <p>No approved customers found.</p>
          </div>
      )
  }
  
  return (
    <>
        {/* Mobile View: Card List */}
        <div className="md:hidden space-y-4">
            {currentCustomers.map(customer => (
                <Card key={customer.id} className="relative hover:bg-muted/50">
                    <div className="absolute top-2 right-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href={`/customers/${customer.id}`}>
                                        <Eye className="mr-2 h-4 w-4" /> View
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href={`/customers/${customer.id}/edit`}>
                                        <Pencil className="mr-2 h-4 w-4" /> Edit
                                    </Link>
                                </DropdownMenuItem>
                                {user?.role === 'admin' && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4" /> 
                                                <span>Delete</span>
                                            </DropdownMenuItem>
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
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <Link href={`/customers/${customer.id}`} className="block cursor-pointer">
                        <CardHeader>
                            <CardTitle>{customer.name}</CardTitle>
                            <div className="text-sm text-muted-foreground">{customer.phone}</div>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between">
                            <Badge variant={getStatusBadgeVariant(customer.status)} className="capitalize">
                                {customer.status || 'Active'}
                            </Badge>
                            <div className="text-right">
                                <div className="font-medium">{formatCurrency(customer.financedAmount)}</div>
                                <div className="text-xs text-muted-foreground">{`${customer.duration} months`}</div>
                            </div>
                        </CardContent>
                    </Link>
                </Card>
            ))}
        </div>
        
        {/* Desktop View: Table */}
        <div className="hidden md:block">
            <Card>
            <CardContent className="p-0">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone Model</TableHead>
                    <TableHead>Financed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {currentCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                        <TableCell>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-muted-foreground">{customer.phone}</div>
                        </TableCell>
                        <TableCell>{customer.phoneModel}</TableCell>
                        <TableCell>
                            <div>{formatCurrency(customer.financedAmount)}</div>
                            <div className="text-sm text-muted-foreground">{`${customer.duration} months`}</div>
                        </TableCell>
                        <TableCell>
                            <Badge variant={getStatusBadgeVariant(customer.status)} className="capitalize">
                            {customer.status || 'Active'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                            <Link href={`/customers/${customer.id}`} passHref>
                            <Button variant="outline" size="sm">
                                <Eye className="mr-2 h-4 w-4" />
                                View
                            </Button>
                            </Link>
                            {user?.role === 'admin' && (
                                <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" disabled={deletingId === customer.id}>
                                        {deletingId === customer.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
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
                            )}
                        </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                </Table>
            </CardContent>
            </Card>
        </div>

        {/* Pagination */}
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
    </>
  );
}

    