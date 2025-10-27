import { PageHeader } from "@/components/page-header";
import { AddUserForm } from "@/components/users/add-user-form";

export default function AddUserPage() {
  return (
    <>
      <PageHeader
        title="Add New User"
        description="Fill out the form to create a new admin or agent user."
      />
      <div className="max-w-2xl mx-auto">
        <AddUserForm />
      </div>
    </>
  );
}
