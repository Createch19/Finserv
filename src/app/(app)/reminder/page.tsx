import { PageHeader } from "@/components/page-header";
import { ReminderForm } from "@/components/reminder/reminder-form";

export default function ReminderPage() {
  return (
    <>
      <PageHeader
        title="Intelligent EMI Reminder"
        description="Use AI to generate the perfect reminder message for your customers."
      />
      <ReminderForm />
    </>
  );
}
