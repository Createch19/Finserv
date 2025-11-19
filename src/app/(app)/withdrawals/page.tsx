
"use client";

import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WithdrawalForm } from "@/components/withdrawals/withdrawal-form";
import { WithdrawalHistory } from "@/components/withdrawals/withdrawal-history";
import { WithdrawalApprovalList } from "@/components/withdrawals/withdrawal-approval-list";

export default function WithdrawalsPage() {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isSuperAdmin = user.role === 'superadmin';
  const isAdmin = user.role === 'admin';

  if (!isSuperAdmin && !isAdmin) {
    return (
      <>
        <PageHeader title="Withdrawals" />
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-destructive" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>You do not have permission to access this page.</p>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Fund Withdrawals"
        description={
          isSuperAdmin
            ? "Review and approve withdrawal requests from companies."
            : "Request a withdrawal and view your company's history."
        }
      />

      {isSuperAdmin ? (
        <WithdrawalApprovalList />
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <WithdrawalForm />
          </div>
          <div className="lg:col-span-2">
            <WithdrawalHistory />
          </div>
        </div>
      )}
    </>
  );
}
