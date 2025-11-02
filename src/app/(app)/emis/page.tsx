import { PageHeader } from "@/components/page-header";
import { EmiList } from "@/components/emis/emi-list";

export default function EmiTrackerPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="EMI Tracker"
        description="View, filter, and manage all customer EMIs."
      />
      <div className="flex-1 overflow-y-auto">
        <EmiList />
      </div>
    </div>
  );
}

    