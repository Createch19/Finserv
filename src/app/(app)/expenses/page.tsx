
"use client";

import { PageHeader } from "@/components/page-header";
import { AddExpenseForm } from "@/components/expenses/add-expense-form";
import { ExpenseList } from "@/components/expenses/expense-list";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export default function ExpensesPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
    
    if (!isAdmin) {
        return (
            <>
                <PageHeader title="Expenses" />
                <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-6 w-6 text-destructive" />
                    Access Denied
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p>You do not have permission to view or manage expenses. Please contact an administrator if you believe this is an error.</p>
                </CardContent>
                </Card>
            </>
        )
    }

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Track and manage business expenses."
      />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
            <AddExpenseForm />
        </div>
        <div className="lg:col-span-2">
            <ExpenseList />
        </div>
      </div>
    </>
  );
}
