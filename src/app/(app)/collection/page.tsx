
import { PageHeader } from "@/components/page-header";
import { CollectionList } from "@/components/collection/collection-list";

export default function CollectionPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Monthly Collection"
        description="View and manage EMIs on a month-by-month basis."
      />
      <CollectionList />
    </div>
  );
}
