
"use client";

import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ShieldAlert } from "lucide-react";
import { AddCompanyForm } from "@/components/companies/add-company-form";
import { CompanyList } from "@/components/companies/company-list";
import { useCollection, useFirestore } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import type { Company, WithId } from "@/types";

export default function CompaniesPage() {
    const { user } = useAuth();
    const firestore = useFirestore();
    const isSuperAdmin = user?.role === 'superadmin';

    const companiesQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, "companies"), orderBy("createdAt", "desc"));
    }, [firestore]);

    const { data: companies, isLoading: companiesLoading } = useCollection<WithId<Company>>(companiesQuery);

    const isLoading = companiesLoading || !user;
    
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!isSuperAdmin) {
        return (
            <>
                <PageHeader title="Companies" />
                <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-6 w-6 text-destructive" />
                    Access Denied
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p>You do not have permission to view or manage companies. Please contact a super administrator.</p>
                </CardContent>
                </Card>
            </>
        )
    }

  return (
    <>
      <PageHeader
        title="Companies"
        description="Create and manage tenant companies."
      />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
            <AddCompanyForm />
        </div>
        <div className="lg:col-span-2">
            <CompanyList companies={companies} isLoading={isLoading} />
        </div>
      </div>
    </>
  );
}
