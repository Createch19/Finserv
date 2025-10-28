"use client";

import { PageHeader } from "@/components/page-header";
import { AddCustomerForm } from "@/components/customers/add-customer-form";

export default function AddCustomerPage() {
  return (
    <>
      <PageHeader
        title="Add New Customer"
        description="Fill out the form to add a new financing record."
      />
      <div className="max-w-4xl mx-auto">
        <AddCustomerForm />
      </div>
    </>
  );
}
