
"use client";

import Link from "next/link";
import { CustomerDetails } from "@/components/customers/customer-details";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { notFound, useParams } from "next/navigation";
import React from "react";
import type { Customer } from "@/types";
import { useDoc } from "@/firebase";
import { doc } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";

export default function CustomerDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const { user } = useUser();
  const firestore = useFirestore();

  const customerRef = user ? doc(firestore, `users/${user.uid}/customers`, id) : null;
  const { data: customer, isLoading, error } = useDoc<Customer>(customerRef);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (error) {
    console.error(error);
    return <div className="text-red-500">Error loading customer data.</div>
  }
  
  if (!customer) {
    return notFound();
  }

  return (
    <>
      <PageHeader title={customer.name} description={`Details for customer ID: ${customer.id}`}>
        <Link href="/customers" passHref>
            <Button variant="outline">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Customers
            </Button>
        </Link>
      </PageHeader>
      <CustomerDetails customer={customer} />
    </>
  );
}
