
"use client";

import { PageHeader } from "@/components/page-header";
import { CollectionList } from "@/components/collection/collection-list";
import { SettlementSummary } from "@/components/collection/settlement-summary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarCheck, ReceiptIndianRupee } from "lucide-react";

export default function CollectionPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Collection & Settlement"
        description="View monthly targets or audit daily collections."
      />
      
      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 max-w-md">
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4" />
            Monthly View
          </TabsTrigger>
          <TabsTrigger value="settlement" className="flex items-center gap-2">
            <ReceiptIndianRupee className="h-4 w-4" />
            Settlement Summary
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="monthly" className="border-none p-0 outline-none">
          <CollectionList />
        </TabsContent>
        
        <TabsContent value="settlement" className="border-none p-0 outline-none">
          <SettlementSummary />
        </TabsContent>
      </Tabs>
    </div>
  );
}
