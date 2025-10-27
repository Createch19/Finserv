
"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CustomerTable } from "@/components/customers/customer-table";

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <>
      <PageHeader
        title="Customers"
        description="Manage your financed customers and their details."
      >
        <Link href="/customers/add" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </Link>
      </PageHeader>
      
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search customers by name or phone..."
            className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <CustomerTable searchTerm={searchTerm} />
    </>
  );
}
