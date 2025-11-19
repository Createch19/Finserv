
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Loader2, MoreVertical, Building } from 'lucide-react';
import type { Company, Customer, User, WithId } from '@/types';
import { useCollection, useFirestore, FirestorePermissionError, errorEmitter } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";

const ITEMS_PER_PAGE = 10;

export function UserTable({ searchTerm }: { searchTerm: string }) {
  const [currentPage, setCurrentPage] = useState(1);
  const { user: authUser } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const usersQuery = useMemo(() => {
    if (!firestore || !authUser || (authUser.role !== 'superadmin' && authUser.role !== 'admin')) return null;

    if (authUser.role === 'superadmin') {
      return collection(firestore, 'users');
    }

    if (!authUser.companyId) return null;
    return query(collection(firestore, 'users'), where('companyId', '==', authUser.companyId));

  }, [firestore, authUser]);

  const { data: usersData, isLoading: usersLoading } = useCollection<WithId<User>>(usersQuery);
  
  const customersQuery = useMemo(() => {
    if (!firestore || !authUser) return null;

    if (authUser.role === 'superadmin') {
        return collection(firestore, 'customers');
    }
    
    if (!authUser.companyId) return null;
    return query(collection(firestore, 'customers'), where('companyId', '==', authUser.companyId));
  }, [firestore, authUser]);
  
  const { data: customers, isLoading: customersLoading } = useCollection<WithId<Customer>>(customersQuery);
  
  const companiesQuery = useMemo(() => {
    if (!firestore || authUser?.role !== 'superadmin') return null;
    return collection(firestore, 'companies');
  }, [firestore, authUser]);

  const { data: companies, isLoading: companiesLoading } = useCollection<WithId<Company>>(companiesQuery);
  
  const isLoading = usersLoading || customersLoading || companiesLoading;

  const users = useMemo(() => {
     if (!authUser || (authUser.role !== 'superadmin' && authUser.role !== 'admin')) {
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

  const handleAssignCompany = async (userId: string, companyId: string) => {
    if (!firestore) return;

    const userDocRef = doc(firestore, 'users', userId);
    try {
        await updateDoc(userDocRef, { companyId: companyId });
        toast({
            title: "User Updated",
            description: "User has been assigned to the new company."
        })
    } catch(serverError) {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'update',
          requestResourceData: { companyId },
        });
        errorEmitter.emit('permission-error', permissionError);
    }
  }
  
  if (isLoading) {
      return (
          <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
          </div>
      )
  }

  const getCompanyName = (companyId: string) => {
    return companies?.find(c => c.id === companyId)?.name || 'Unknown Company';
  }

  return (
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              {authUser?.role === 'superadmin' && <TableHead>Company</TableHead>}
              <TableHead className="text-right">Customers Managed</TableHead>
              {authUser?.role === 'superadmin' && <TableHead className="text-right">Actions</TableHead>}
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
                    <Badge variant={user.role === 'admin' || user.role === 'superadmin' ? 'default' : 'secondary'} className="capitalize">
                      {user.role}
                    </Badge>
                  </TableCell>
                  {authUser?.role === 'superadmin' && (
                    <TableCell>
                      {user.companyId ? getCompanyName(user.companyId) : (
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">Assign Company</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {companies?.map(company => (
                                    <DropdownMenuItem key={company.id} onSelect={() => handleAssignCompany(user.uid, company.id)}>
                                        {company.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    {customers?.filter(c => c.agent?.uid === user.uid).length ?? 0}
                  </TableCell>
                  {authUser?.role === 'superadmin' && (
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Assign Company</DropdownMenuLabel>
                                {companies?.map(company => (
                                    <DropdownMenuItem key={company.id} onSelect={() => handleAssignCompany(user.uid, company.id)}>
                                        {company.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={authUser?.role === 'superadmin' ? 5 : 3} className="h-24 text-center">
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
