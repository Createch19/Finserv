
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useFirestore } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import type { Company } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { errorEmitter, FirestorePermissionError } from "@/firebase";

const formSchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters."),
});

export function AddCompanyForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    if (!user || user.role !== 'superadmin' || !firestore) {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "You are not authorized to create a company.",
      });
      setIsSubmitting(false);
      return;
    }

    const companyId = uuidv4();
    const companyDocRef = doc(firestore, "companies", companyId);

    const newCompany: Company = {
      id: companyId,
      name: values.name,
      status: 'active',
      ownerUID: user.uid, // Super Admin is the initial owner
      createdAt: new Date().toISOString(),
    };

    setDoc(companyDocRef, newCompany)
      .then(() => {
        toast({
          title: "Company Created",
          description: `Company "${values.name}" has been successfully created.`,
        });
        form.reset();
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: companyDocRef.path,
          operation: "create",
          requestResourceData: newCompany,
        });
        errorEmitter.emit("permission-error", permissionError);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Company</CardTitle>
        <CardDescription>Add a new tenant company to the system.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Acme Innovations Inc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Company
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
