
import { PageHeader } from "@/components/page-header";
import { AddUserForm } from "@/components/users/add-user-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";


export default function AddUserPage() {
  return (
    <>
      <PageHeader
        title="Add New User"
        description="Create a new admin or agent user."
      />
      <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-destructive" />
              Not Implemented
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Creating users directly from the client is not supported in this application for security reasons. New users should be created via a secure backend process.</p>
          </CardContent>
        </Card>
    </>
  );
}
