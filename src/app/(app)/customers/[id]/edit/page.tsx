
"use client";

import React from "react";
import { useParams, notFound } from "next/navigation";
import { doc } from "firebase/firestore";
import Link from "next/link";

import { useFirestore, useDoc } from "@/firebase";
import type { Customer, WithId } from "@/types";

import { PageHeader } from "@/components/page-header";
import { EditCustomerForm } from "@/components/customers/edit-customer-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";

export default function EditCustomerPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const firestore = useFirestore();

  const customerRef = React.useMemo(() => {
    if (firestore && id) {
      return doc(firestore, `customers`, id);
    }
    return null;
  }, [firestore, id]);

  const { data: customer, isLoading } = useDoc<WithId<Customer>>(customerRef);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!customer) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title="Edit Customer"
        description="Update the details for an existing customer."
      >
        <Link href={`/customers/${id}`} passHref>
          <Button variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </Link>
      </PageHeader>
      <div className="max-w-4xl mx-auto">
        <EditCustomerForm customer={customer} />
      </div>
    </>
  );
}
