
"use client";

import { useState, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useCollection, useFirestore } from "@/firebase";
import { collection, addDoc, query, orderBy } from "firebase/firestore";
import type { Expense, ExpenseType, WithId } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { errorEmitter, FirestorePermissionError } from "@/firebase";

const formSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0."),
  notes: z.string().min(3, "Notes must be at least 3 characters long."),
  type: z.string().min(1, "Please select an expense type."),
});

export function AddExpenseForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      notes: "",
      type: "",
    },
  });

  const expenseTypesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "expenseTypes"), orderBy("name", "asc"));
  }, [firestore]);

  const { data: expenseTypes, isLoading: expenseTypesLoading } = useCollection<WithId<ExpenseType>>(expenseTypesQuery);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    if (!user || !firestore) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to add an expense.",
      });
      setIsSubmitting(false);
      return;
    }

    const expenseCollectionRef = collection(firestore, "expenses");
    const newExpense: Expense = {
      expenseId: uuidv4(),
      amount: values.amount,
      notes: values.notes,
      type: values.type,
      date: new Date().toISOString(),
      adminId: user.uid,
    };

    addDoc(expenseCollectionRef, newExpense)
      .then(() => {
        toast({
          title: "Expense Added",
          description: "Your expense has been successfully recorded.",
        });
        form.reset();
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: expenseCollectionRef.path,
          operation: "create",
          requestResourceData: newExpense,
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
        <CardTitle>Add New Expense</CardTitle>
        <CardDescription>Record a new business expense.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={expenseTypesLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an expense type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {expenseTypes?.map((type) => (
                        <SelectItem key={type.id} value={type.name}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
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
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Office rent, electricity bill..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting || expenseTypesLoading} className="w-full">
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add Expense
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
