
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
  console.log("[CustomerDetailPage] Rendering with customer ID:", id);


  const { user, loading: isUserLoading } = useAuth();
  const firestore = useFirestore();

  console.log("[CustomerDetailPage] Auth state: isUserLoading:", isUserLoading, "user:", user);

  const customerRef = useMemoFirebase(() => {
      if (firestore && id) {
          console.log("[CustomerDetailPage] Creating customer document reference for ID:", id);
          return doc(firestore, `customers`, id);
      }
      console.log("[CustomerDetailPage] Firestore or ID not available, cannot create customer ref.");
      return null;
    }, [firestore, id]);

  const { data: customer, isLoading: isCustomerLoading, error } = useDoc<WithId<Customer>>(customerRef);
  console.log("[CustomerDetailPage] Firestore hook state: isCustomerLoading:", isCustomerLoading, "customer:", customer, "error:", error);
  
  const isLoading = isUserLoading || isCustomerLoading;
  console.log("[CustomerDetailPage] Overall loading state:", isLoading);


  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }
  
  console.log("[CustomerDetailPage] Finished loading. Checking conditions for 404.");

  if (!user) {
    console.error("[CustomerDetailPage] 404 Triggered: User object is null or undefined after loading.");
    notFound();
  }

  if (!customer) {
    console.error("[CustomerDetailPage] 404 Triggered: Customer object is null or undefined after loading. The document might not exist or rules are denying access.");
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
