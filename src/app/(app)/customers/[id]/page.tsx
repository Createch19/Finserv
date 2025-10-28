
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

function CustomerDataFetcher({ customerId }: { customerId: string }) {
    const firestore = useFirestore();
    console.log('[DEBUG] CustomerDataFetcher received customerId:', customerId);

    const customerRef = useMemoFirebase(
        () => {
            if (firestore && customerId) {
                console.log('[DEBUG] Creating Firestore document reference for path:', `customers/${customerId}`);
                return doc(firestore, `customers`, customerId);
            }
            console.log('[DEBUG] Firestore or customerId not available yet.');
            return null;
        },
        [firestore, customerId]
    );

    const { data: customer, isLoading: isCustomerLoading, error } = useDoc<WithId<Customer>>(customerRef);
    const { user } = useAuth();

    useEffect(() => {
        console.log('[DEBUG] Data fetching state changed:', {
            isCustomerLoading,
            customer: customer ? { ...customer } : null,
            error: error ? { message: error.message, stack: error.stack } : null,
        });
    }, [customer, isCustomerLoading, error]);

    if (isCustomerLoading) {
        console.log('[DEBUG] Render: isCustomerLoading is true, showing loader.');
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!customer) {
        console.log('[DEBUG] Render: customer is null or undefined after loading, triggering notFound().');
        notFound();
    }
    
    console.log('[DEBUG] Render: Customer found, rendering details.');
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

  useEffect(() => {
    console.log('[DEBUG] CustomerDetailPage state:', {
        id,
        isUserLoading,
        user: user ? { uid: user.uid, role: user.role } : null
    });
  }, [id, isUserLoading, user]);

  const isReadyToFetch = !isUserLoading && user && id;
  console.log('[DEBUG] isReadyToFetch:', isReadyToFetch);

  if (isUserLoading) {
    console.log('[DEBUG] Render: isUserLoading is true in parent, showing screen loader.');
    return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (isReadyToFetch) {
    console.log('[DEBUG] Render: Conditions met, rendering CustomerDataFetcher.');
    return <CustomerDataFetcher customerId={id} />;
  }
  
  if (!isUserLoading && (!user || !id)) {
      console.log('[DEBUG] Render: Conditions not met after loading, triggering notFound() from parent.');
      notFound();
  }

  console.log('[DEBUG] Render: Fallback loader.');
  return (
    <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
