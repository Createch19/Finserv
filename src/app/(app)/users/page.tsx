
"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Search, ShieldAlert, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { UserTable } from "@/components/users/user-table";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddUserForm } from "@/components/users/add-user-form";

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (!user) return null;

  const isSuperAdmin = user.role === 'superadmin';
  const isAdmin = user.role === 'admin';
  const canManageUsers = isSuperAdmin || isAdmin;

  if (!canManageUsers) {
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
                <p>You do not have permission to view or manage users. Only company administrators can access this page.</p>
            </CardContent>
            </Card>
        </>
      )
  }

  return (
    <>
      <PageHeader
        title="Users"
        description={isAdmin ? `Manage agents and administrators for your company.` : "Manage all system users across all companies."}
      />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
            <AddUserForm />
        </div>
        <div className="lg:col-span-2">
            <div className="mb-4">
                <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search users by name or email..."
                    className="w-full rounded-lg bg-background pl-8"
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
