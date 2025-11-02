"use client";

import { PageHeader } from "@/components/page-header";
import { AddCustomerForm } from "@/components/customers/add-customer-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function AddCustomerPage() {
  return (
    <>
      <PageHeader
        title="Add New Customer"
        description="Fill out the form to add a new financing record."
      >
        <Link href="/customers" passHref>
            <Button variant="outline">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Customers
            </Button>
        </Link>
      </PageHeader>
      <div className="max-w-4xl mx-auto">
        <AddCustomerForm />
      </div>
    </>
  );
}
