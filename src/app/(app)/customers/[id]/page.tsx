
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
        () => doc(firestore, `users/${userId}/customers`, customerId),
        [firestore, userId, customerId]
    );

    const { data: customer, isLoading: isCustomerLoading, error } = useDoc<WithId<Customer>>(customerRef);

    if (isCustomerLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (error) {
        console.error(error);
        return <div className="text-red-500">Error loading customer data.</div>;
    }

    if (!customer) {
        return notFound();
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

  if (isUserLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!user) {
    // This will redirect to login if not authenticated, handled by the app layout
    return null;
  }
  
  if (!id) {
    return notFound();
  }

  return <CustomerDataFetcher customerId={id} userId={user.uid} />;
}
