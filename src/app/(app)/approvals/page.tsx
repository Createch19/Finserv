
"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { ApprovalList } from "@/components/approvals/approval-list";
import { useCollection, useFirestore } from "@/firebase";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where } from "firebase/firestore";
import type { Customer, WithId } from "@/types";
import { Loader2, Users, Banknote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ApprovalsPage() {
  const { user } = useAuth();
  const firestore = useFirestore();

  const pendingCustomersQuery = useMemo(() => {
    if (!firestore || !user) return null;

    if (user.role === 'superadmin') {
      // Super admin can see all pending approvals.
      return query(collection(firestore, "customers"), where("status", "==", "pending"));
    }
    
    // For other roles, companyId is required.
    if (!user.companyId) return null;

    // Admins and agents can only see pending approvals for their own company.
    return query(
      collection(firestore, "customers"),
      where("status", "==", "pending"),
      where("companyId", "==", user.companyId)
    );
  }, [firestore, user]);

  const {
    data: pendingCustomers,
    isLoading,
    error,
  } = useCollection<WithId<Customer>>(pendingCustomersQuery);

  const stats = useMemo(() => {
    if (!pendingCustomers) {
      return {
        count: 0,
        totalFinanced: 0,
      };
    }
    return {
      count: pendingCustomers.length,
      totalFinanced: pendingCustomers.reduce((acc, c) => acc + c.financedAmount, 0),
    };
  }, [pendingCustomers]);

  const formatValue = (value: number) => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)}Cr`;
    }
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`;
    }
    return `₹${value.toLocaleString('en-IN')}`;
  };

  return (
    <>
      <PageHeader
        title="Customer Approvals"
        description="Review and approve new customer financing requests."
      />

      {isLoading ? (
         <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Waiting for Approval</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">{stats.count}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Financed Amount</CardTitle>
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">{formatValue(stats.totalFinanced)}</div>
                    </CardContent>
                </Card>
            </div>
            <ApprovalList pendingCustomers={pendingCustomers} isLoading={isLoading} error={error} />
        </>
      )}
    </>
  );
}
