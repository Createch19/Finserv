
"use client";

import Link from "next/link";
import { CustomerDetails } from "@/components/customers/customer-details";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { notFound, useParams } from "next/navigation";
import React from "react";
import type { Customer, WithId } from "@/types";
import { doc } from "firebase/firestore";
import { useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { useAuth } from "@/hooks/use-auth";

export default function CustomerDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const { user, loading: isUserLoading } = useAuth();
  const firestore = useFirestore();

  const customerRef = useMemoFirebase(() => {
      if (firestore && id) {
          return doc(firestore, `customers`, id);
      }
      return null;
    }, [firestore, id]);

  const { data: customer, isLoading: isCustomerLoading, error } = useDoc<WithId<Customer>>(customerRef);
  
  const isLoading = isUserLoading || isCustomerLoading;

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }
  
  if (!user) {
    // This case should be handled by the layout, but as a fallback.
    notFound();
  }

  if (!customer) {
    // This happens if the doc doesn't exist or rules deny access.
    notFound();
  }

  return (
    <>
      <PageHeader title={customer.name} description={`Details for customer`}>
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
