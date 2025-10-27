
"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { UserTable } from "@/components/users/user-table";
import { useUser } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useUser();

  const isAdmin = user?.role === 'admin';

  return (
    <>
      <PageHeader
        title="Users"
        description="Manage admin and agent users."
      >
        {isAdmin && (
            <Link href="/users/add" passHref>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add User
            </Button>
            </Link>
        )}
      </PageHeader>
      
      {isAdmin ? (
        <>
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
        </>
      ) : (
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
      )}
    </>
  );
}
