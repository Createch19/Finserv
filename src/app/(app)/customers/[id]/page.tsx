
"use client";

import Link from "next/link";
import { customers as initialCustomers } from "@/lib/demo-data";
import { CustomerDetails } from "@/components/customers/customer-details";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { notFound, useParams } from "next/navigation";
import React, { useState, useEffect } from "react";
import type { Customer } from "@/types";

// This is a mock global state for demo purposes.
let globalCustomers = initialCustomers;

export default function CustomerDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const foundCustomer = globalCustomers.find((c) => c.id === id);
      
      if (foundCustomer) {
        setCustomer(foundCustomer);
      } else {
        notFound();
      }
    }
    setLoading(false);
  }, [id]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!customer) {
    return notFound();
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
