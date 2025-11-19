
"use client";

import { useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCollection, useFirestore } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { WithdrawalRequest, WithId } from "@/types";

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

export function WithdrawalHistory() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const companyId = user?.companyId;

  const requestsQuery = useMemo(() => {
    // CRITICAL: Ensure companyId is a valid string before creating the query.
    if (!firestore || typeof companyId !== 'string' || companyId === '') {
      return null;
    }
    
    // The query now only filters by companyId. Sorting is handled client-side.
    return query(
        collection(firestore, "withdrawalRequests"), 
        where('companyId', '==', companyId)
    );
  }, [firestore, companyId]);

  const { data: unsortedRequests, isLoading } = useCollection<WithId<WithdrawalRequest>>(requestsQuery);

  const requests = useMemo(() => {
    if (!unsortedRequests) return [];
    // Sort the requests by date client-side
    return [...unsortedRequests].sort((a, b) => 
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
  }, [unsortedRequests]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdrawal History</CardTitle>
        <CardDescription>A list of your company's withdrawal requests.</CardDescription>
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
                <TableHead>Notes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests && requests.length > 0 ? (
                requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      {format(parseISO(req.requestedAt), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {req.notes}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(req.status)} className="capitalize">{req.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(req.amount)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No withdrawal requests made yet.
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
