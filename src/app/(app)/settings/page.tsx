import { PageHeader } from "@/components/page-header";
import { SettingsTabs } from "@/components/settings/settings-tabs";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage agent users, application defaults, and export data."
      />
      <SettingsTabs />
    </>
  );
}
