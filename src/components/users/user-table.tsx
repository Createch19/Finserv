
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
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { collection, query, where } from 'firebase/firestore';

const ITEMS_PER_PAGE = 10;

export function UserTable({ searchTerm }: { searchTerm: string }) {
  const [currentPage, setCurrentPage] = useState(1);
  const { user: authUser } = useAuth();
  const firestore = useFirestore();

  // Query customers to derive user list
  const customersQuery = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    // Admins see all customers to build a full user list
    // Agents only see their own customers, so their user list will just be themselves
    if (authUser.role === 'admin') {
        return collection(firestore, 'customers');
    }
    return query(collection(firestore, 'customers'), where('agent.uid', '==', authUser.uid));
  }, [firestore, authUser]);

  const { data: customers, isLoading } = useCollection<WithId<Customer>>(customersQuery);

  // Derive unique users from the customers list
  const users = useMemo(() => {
    if (!customers) return [];
    const userMap = new Map<string, User>();
    customers.forEach(customer => {
        if (customer.agent && !userMap.has(customer.agent.uid)) {
            userMap.set(customer.agent.uid, {
                uid: customer.agent.uid,
                name: customer.agent.name,
                email: customer.agent.email,
                // We derive role from the logged in user, or default to agent
                role: customer.agent.uid === authUser?.uid ? authUser.role : 'agent',
            });
        }
    });

    // If the admin has no customers, they won't appear. Add them manually.
    if(authUser?.role === 'admin' && !userMap.has(authUser.uid)) {
        userMap.set(authUser.uid, authUser);
    }
    
    return Array.from(userMap.values());
  }, [customers, authUser]);

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
              <TableHead className="text-right">Customers</TableHead>
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
