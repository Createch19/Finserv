
"use client";

import Link from "next/link";
import { CustomerDetails } from "@/components/customers/customer-details";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { notFound, useParams } from "next/navigation";
import React, { useEffect } from "react";
import type { Customer, WithId } from "@/types";
import { doc } from "firebase/firestore";
import { useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { useAuth } from "@/hooks/use-auth";

export default function CustomerDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  console.log("[CustomerDetailPage] Rendering with ID:", id);

  const { user, loading: isUserLoading } = useAuth();
  const firestore = useFirestore();

  const customerRef = useMemoFirebase(() => {
      if (firestore && id) {
          console.log(`[CustomerDetailPage] Creating Firestore doc reference for customers/${id}`);
          return doc(firestore, `customers`, id);
      }
      console.log("[CustomerDetailPage] Firestore or ID not available, cannot create doc ref.");
      return null;
    }, [firestore, id]);

  const { data: customer, isLoading: isCustomerLoading, error } = useDoc<WithId<Customer>>(customerRef);
  
  const isLoading = isUserLoading || isCustomerLoading;

  useEffect(() => {
    console.log(`[CustomerDetailPage] Auth State: user is ${user ? 'defined' : 'null'}, loading is ${isUserLoading}`);
  }, [user, isUserLoading]);

  useEffect(() => {
    console.log(`[CustomerDetailPage] Customer Data State: customer is ${customer ? 'defined' : 'null'}, loading is ${isCustomerLoading}, error is ${error ? error.message : 'null'}`);
  }, [customer, isCustomerLoading, error]);

  console.log(`[CustomerDetailPage] Combined loading state: ${isLoading}`);

  if (isLoading) {
    console.log("[CustomerDetailPage] Showing loading spinner.");
    return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }
  
  console.log("[CustomerDetailPage] Loading complete. Checking condition for 404.");
  if (!user || !customer) {
    console.error("[CustomerDetailPage] Condition for 404 met. user:", user, "customer:", customer);
    notFound();
  }

  console.log("[CustomerDetailPage] Data is available. Rendering customer details for:", customer.name);
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
