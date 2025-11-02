
"use client";

import { PageHeader } from "@/components/page-header";
import { ProfileDetails } from "@/components/profile/profile-details";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function ProfilePage() {
    const { user, loading } = useAuth();

    if (loading || !user) {
        return (
          <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        );
    }

  return (
    <>
      <PageHeader
        title="My Profile"
        description="View your profile details and manage your account."
      />
      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
            <ProfileDetails user={user} />
        </div>
        <div className="md:col-span-2">
            <ChangePasswordForm />
        </div>
      </div>
    </>
  );
}
