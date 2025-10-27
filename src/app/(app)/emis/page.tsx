import { PageHeader } from "@/components/page-header";
import { EmiList } from "@/components/emis/emi-list";

export default function EmiTrackerPage() {
  return (
    <>
      <PageHeader
        title="EMI Tracker"
        description="View all upcoming, due, and overdue EMIs."
      />
      <EmiList />
    </>
  );
}
