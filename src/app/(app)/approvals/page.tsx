
"use client";

import { PageHeader } from "@/components/page-header";
import { ApprovalList } from "@/components/approvals/approval-list";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export default function ApprovalsPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    
    if (!isAdmin) {
        return (
            <>
                <PageHeader title="Approvals" />
                <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-6 w-6 text-destructive" />
                    Access Denied
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p>You do not have permission to view this page. Please contact an administrator if you believe this is an error.</p>
                </CardContent>
                </Card>
            </>
        )
    }

  return (
    <>
      <PageHeader
        title="Customer Approvals"
        description="Review and approve new customer financing requests."
      />
      <ApprovalList />
    </>
  );
}
