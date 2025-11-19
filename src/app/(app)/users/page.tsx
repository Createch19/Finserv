
"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Search, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { UserTable } from "@/components/users/user-table";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AddUserForm } from "@/components/users/add-user-form";
import { Loader2 } from "lucide-react";


export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;
  
    if (!user) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

  if (!isAdmin) {
       return (
        <>
            <PageHeader title="Users" />
            <Card className="mt-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-6 w-6 text-destructive" />
                Access Denied
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p>You do not have permission to view or manage users. Please contact an administrator if you believe this is an error.</p>
            </CardContent>
            </Card>
        </>
      )
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="Manage admin and agent users."
      />
      <div className="grid gap-8 lg:grid-cols-3">
        {isSuperAdmin && (
            <div className="lg:col-span-1">
                <AddUserForm />
            </div>
        )}
        <div className={isSuperAdmin ? "lg:col-span-2" : "lg:col-span-3"}>
            <div className="mb-4">
                <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search users by name or email..."
                    className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                </div>
            </div>
            <UserTable searchTerm={searchTerm} />
        </div>
      </div>
    </>
  );
}
