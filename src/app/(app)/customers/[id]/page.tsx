
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

function CustomerDataFetcher({ customerId }: { customerId: string }) {
    const firestore = useFirestore();

    const customerRef = useMemoFirebase(
        () => {
            if (firestore && customerId) {
                // Query the top-level 'customers' collection
                return doc(firestore, `customers`, customerId);
            }
            return null;
        },
        [firestore, customerId]
    );

    const { data: customer, isLoading: isCustomerLoading } = useDoc<WithId<Customer>>(customerRef);
    const { user } = useAuth();

    if (isCustomerLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!customer) {
        notFound();
    }

    // Admins can see all customers, but agents can only see their own.
    if (user?.role === 'agent' && customer.agent.uid !== user.uid) {
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
  const { user, loading: isUserLoading } = useAuth();

  // We must wait for BOTH the user to be loaded AND the ID to be present
  const isReadyToFetch = !isUserLoading && user && id;

  if (isUserLoading) {
    return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (isReadyToFetch) {
    return <CustomerDataFetcher customerId={id} />;
  }
  
  // This case handles if the user is not logged in or the id is missing after loading is complete
  if (!isUserLoading && (!user || !id)) {
      notFound();
  }

  // Fallback loader while waiting for initial conditions to be met
  return (
    <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
