
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
import { useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase";

function CustomerDataFetcher({ customerId, userId }: { customerId: string, userId: string }) {
    console.log("CustomerDataFetcher rendered with customerId:", customerId, "and userId:", userId);
    const firestore = useFirestore();

    const customerRef = useMemoFirebase(
        () => {
            console.log("useMemoFirebase: creating doc reference with firestore, userId, customerId:", !!firestore, userId, customerId);
            if (firestore && userId && customerId) {
                const ref = doc(firestore, `users/${userId}/customers`, customerId);
                console.log("useMemoFirebase: created customerRef with path:", ref.path);
                return ref;
            }
            return null;
        },
        [firestore, userId, customerId]
    );
    console.log("Final customerRef passed to useDoc:", customerRef?.path);

    const { data: customer, isLoading: isCustomerLoading } = useDoc<WithId<Customer>>(customerRef);
    console.log("useDoc returned -> customer:", customer, "isLoading:", isCustomerLoading);

    if (isCustomerLoading) {
        console.log("Data is loading, showing loader...");
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!customer) {
        console.log("Customer not found after loading, triggering notFound().");
        // This will be triggered if the document doesn't exist or if rules prevent access.
        notFound();
    }
    
    console.log("Customer found, rendering details for:", customer.name);
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

export default function CustomerDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user, isUserLoading } = useUser();

  console.log("CustomerDetailPage rendered. isUserLoading:", isUserLoading, "user:", user ? user.uid : null, "id from params:", id);

  // Wait until we have both the user and the customer ID from the URL.
  const isReadyToFetch = !isUserLoading && user && id;
  console.log("isReadyToFetch:", isReadyToFetch);

  if (isUserLoading) {
    console.log("User is loading, showing full-screen loader.");
    // Show a full-screen loader only while waiting for the user.
    return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  // Once the user is loaded, we can decide whether to fetch data or show not found.
  if (isReadyToFetch) {
    console.log("Ready to fetch, rendering CustomerDataFetcher.");
    // We have a user and an ID, so it's safe to render the data fetching component.
    return <CustomerDataFetcher customerId={id} userId={user.uid} />;
  }
  
  if (!isUserLoading && (!user || !id)) {
      console.log("Finished loading but user or id is missing. Calling notFound().");
      return notFound();
  }

  // Fallback return, should ideally not be reached if logic is correct
  console.log("Reached fallback return in CustomerDetailPage.");
  return (
    <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
