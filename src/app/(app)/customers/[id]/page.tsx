
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
        // If loading is finished and there's no customer, it's a genuine not found case.
        // This could be due to permissions or the document not existing.
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

  // The primary change is here: We explicitly wait for BOTH user loading to finish AND the ID to be present.
  // This prevents rendering the data fetcher with incomplete data.
  const isReadyToFetch = !isUserLoading && user && id;

  if (!isReadyToFetch) {
    // Show a loading screen until we have everything we need to fetch.
    return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  // At this point, we are guaranteed to have a user and an ID.
  // It is now safe to render the data fetching component.
  return <CustomerDataFetcher customerId={id} userId={user.uid} />;
}
