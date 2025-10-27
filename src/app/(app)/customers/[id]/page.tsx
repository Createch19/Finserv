
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
    const firestore = useFirestore();

    const customerRef = useMemoFirebase(
        () => (firestore && userId && customerId) ? doc(firestore, `users/${userId}/customers`, customerId) : null,
        [firestore, userId, customerId]
    );

    const { data: customer, isLoading: isCustomerLoading } = useDoc<WithId<Customer>>(customerRef);

    if (isCustomerLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!customer) {
        // This will be triggered if the document doesn't exist or if rules prevent access.
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

export default function CustomerDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user, isUserLoading } = useUser();

  // Wait until we have both the user and the customer ID from the URL.
  const isReadyToFetch = !isUserLoading && user && id;

  if (isUserLoading) {
    // Show a full-screen loader only while waiting for the user.
    return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  // Once the user is loaded, we can decide whether to fetch data or show not found.
  if (isReadyToFetch) {
    // We have a user and an ID, so it's safe to render the data fetching component.
    return <CustomerDataFetcher customerId={id} userId={user.uid} />;
  }

  // If we're done loading but don't have what we need, the resource isn't accessible.
  // This can happen if the ID is missing or the user somehow isn't available after loading.
  return notFound();
}
