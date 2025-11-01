
"use client";

import { PageHeader } from "@/components/page-header";
import { ApprovalList } from "@/components/approvals/approval-list";

export default function ApprovalsPage() {
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
