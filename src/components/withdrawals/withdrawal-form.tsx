
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useFirestore } from "@/firebase";
import { collection, doc, getDoc, setDoc } from "firebase/firestore";
import type { WithdrawalRequest, Company } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { errorEmitter, FirestorePermissionError } from "@/firebase";

const formSchema = z.object({
  amount: z.coerce.number().min(1, "Amount must be greater than 0."),
  notes: z.string().min(3, "Notes must be at least 3 characters long."),
});

export function WithdrawalForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      notes: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    if (!user || !firestore || !user.companyId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be a company admin to make a request.",
      });
      setIsSubmitting(false);
      return;
    }

    const companyDocRef = doc(firestore, 'companies', user.companyId);
    const companySnap = await getDoc(companyDocRef);

    if (!companySnap.exists()) {
         toast({ variant: "destructive", title: "Company not found" });
         setIsSubmitting(false);
         return;
    }
    const companyData = companySnap.data() as Company;

    const requestId = uuidv4();
    const requestDocRef = doc(firestore, "withdrawalRequests", requestId);
    const newRequest: WithdrawalRequest = {
      id: requestId,
      companyId: user.companyId,
      companyName: companyData.name,
      adminId: user.uid,
      adminName: user.name,
      amount: values.amount,
      status: 'pending',
      notes: values.notes,
      requestedAt: new Date().toISOString(),
    };

    setDoc(requestDocRef, newRequest)
      .then(() => {
        toast({
          title: "Request Submitted",
          description: "Your withdrawal request has been sent for approval.",
        });
        form.reset();
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: requestDocRef.path,
          operation: "create",
          requestResourceData: newRequest,
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
        <CardTitle>New Withdrawal Request</CardTitle>
        <CardDescription>Request to withdraw funds from the business.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" step="100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes / Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., For business expansion, personal use..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
