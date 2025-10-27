
"use client";

import Link from "next/link";
import { customers as initialCustomers } from "@/lib/demo-data";
import { CustomerDetails } from "@/components/customers/customer-details";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import React, { useState, useEffect } from "react";

// This is a mock global state for demo purposes.
// In a real app, this would be a proper state management solution (Context, Zustand, etc.)
// or data would be fetched from a server.
let globalCustomers = initialCustomers;

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  // Use local state to manage the customer, initialized from our mock global state
  const [customers, setCustomers] = useState(globalCustomers);

  // In a real app with a proper state management solution, you might subscribe to updates.
  // For this demo, we'll just re-read the global state on component mount/update.
  useEffect(() => {
    setCustomers(globalCustomers);
  }, []);
  
  const customer = customers.find((c) => c.id === params.id);

  if (!customer) {
    // This will show a loading state while we find the customer.
    // On a real app, this could be a skeleton loader.
    // If the customer is truly not found after checking, then we can show notFound().
    // For now, if it's not found immediately, we will check again in case state is updating.
    // A better solution would be a centralized data fetching/caching layer.
    const checkAgain = globalCustomers.find((c) => c.id === params.id);
    if (!checkAgain) {
      notFound();
    }
  }

  // If customer is not yet found in state, we can return a loading indicator
  if (!customer) {
      return <div>Loading...</div>;
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
