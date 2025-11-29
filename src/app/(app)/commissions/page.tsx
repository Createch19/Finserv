
"use client";

import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CommissionList } from "@/components/commissions/commission-list";

export default function CommissionsPage() {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAdmin = user.role === 'admin' || user.role === 'superadmin';

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="Commissions" />
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-destructive" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>You do not have permission to view or manage agent commissions.</p>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Agent Commissions"
        description="View and settle commissions for completed loans."
      />
      <CommissionList />
    </>
  );
}

    