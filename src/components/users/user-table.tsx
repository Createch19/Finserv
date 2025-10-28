
"use client";

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { Customer, User, WithId } from '@/types';
import { useCollection, useFirestore } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { collection, query, where } from 'firebase/firestore';

const ITEMS_PER_PAGE = 10;

export function UserTable({ searchTerm }: { searchTerm: string }) {
  const [currentPage, setCurrentPage] = useState(1);
  const { user: authUser } = useAuth();
  const firestore = useFirestore();

  // In this new model, we can query the `users` collection directly.
  const usersQuery = useMemo(() => {
    if (!firestore || !authUser || authUser.role !== 'admin') return null;
    return collection(firestore, 'users');
  }, [firestore, authUser]);

  // We only fetch users if the logged-in user is an admin.
  const { data: usersData, isLoading: usersLoading } = useCollection<WithId<User>>(usersQuery);

  // We still need customers to show the customer count for each user.
  const customersQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'customers');
  }, [firestore]);
  
  const { data: customers, isLoading: customersLoading } = useCollection<WithId<Customer>>(customersQuery);
  
  const isLoading = usersLoading || customersLoading;

  const users = useMemo(() => {
     if (authUser?.role !== 'admin') {
         return authUser ? [authUser] : [];
     }
     return usersData || [];
  }, [authUser, usersData]);


  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const lowercasedFilter = searchTerm.toLowerCase();
    return users.filter((user) => {
      return (
        user.name.toLowerCase().includes(lowercasedFilter) ||
        user.email.toLowerCase().includes(lowercasedFilter)
      );
    });
  }, [searchTerm, users]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

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
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Customers Managed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentUsers.length > 0 ? (
              currentUsers.map((user) => (
                <TableRow key={user.uid}>
                  <TableCell>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {customers?.filter(c => c.agent?.uid === user.uid).length ?? 0}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-muted-foreground">
            Showing {filteredUsers.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users.
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
