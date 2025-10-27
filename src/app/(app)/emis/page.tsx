import { PageHeader } from "@/components/page-header";
import { EmiList } from "@/components/emis/emi-list";

export default function EmiTrackerPage() {
  return (
    <>
      <PageHeader
        title="EMI Tracker"
        description="View, filter, and manage all customer EMIs."
      />
      <EmiList />
    </>
  );
}
