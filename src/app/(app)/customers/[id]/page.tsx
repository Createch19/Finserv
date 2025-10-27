import Link from "next/link";
import { customers } from "@/lib/demo-data";
import { CustomerDetails } from "@/components/customers/customer-details";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customer = customers.find((c) => c.id === params.id);

  if (!customer) {
    notFound();
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
