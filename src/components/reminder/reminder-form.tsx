
"use client"

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wand2, MessageSquare, Send, Calendar as CalendarIcon } from "lucide-react";
import { intelligentEmiReminder, type IntelligentEmiReminderOutput } from "@/ai/flows/intelligent-emi-reminder";
import { useAuth } from "@/hooks/use-auth";
import { useCollection, useFirestore } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Customer, User, WithId } from "@/types";

const formSchema = z.object({
  customerId: z.string().min(1, "Please select a customer."),
});

function getCustomersQuery(firestore: any, user: User | null) {
    if (!firestore || !user) return null;
    
    const customersCollection = collection(firestore, 'customers');
    
    // Admins can see all customers, agents only see their own.
    if (user.role === 'admin') {
        return query(customersCollection, where('status', '!=', 'completed'));
    } else {
        return query(customersCollection, where('agent.uid', '==', user.uid), where('status', '!=', 'completed'));
    }
}

export function ReminderForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<IntelligentEmiReminderOutput | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const firestore = useFirestore();

  const customersQuery = useMemo(() => getCustomersQuery(firestore, user), [user, firestore]);
  const { data: customers, isLoading: customersLoading } = useCollection<WithId<Customer>>(customersQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);

    const customer = customers?.find(c => c.id === values.customerId);
    if (!customer) {
        toast({ variant: 'destructive', title: 'Error', description: 'Customer not found.' });
        setIsLoading(false);
        return;
    }

    try {
        const paymentsMade = customer.payments?.length || 0;
        const nextDueDate = new Date(customer.startDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + paymentsMade + 1);

      const input = {
        customerName: customer.name,
        emiDueDate: nextDueDate.toISOString().split('T')[0],
        emiAmount: customer.monthlyEMI,
        paymentHistory: `Customer has made ${paymentsMade} of ${customer.duration} payments. Status is ${customer.status}.`,
        customerCommunicationPreferences: 'WhatsApp, SMS',
        loanAmount: customer.totalPrice,
        outstandingBalance: customer.totalPayable - (customer.payments?.reduce((sum, p) => sum + p.amount, 0) || 0),
      };

      const response = await intelligentEmiReminder(input);
      setResult(response);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "AI Generation Failed",
        description: "An error occurred while generating the reminder.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Generate Reminder</CardTitle>
              <CardDescription>Select a customer to generate a personalized EMI reminder.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={customersLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers?.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading || customersLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Generate with AI
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>

      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>AI Generated Result</CardTitle>
          <CardDescription>Review the suggestion and send the reminder.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          {isLoading && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
          {!isLoading && !result && (
            <div className="text-center text-muted-foreground">
              <Wand2 className="mx-auto h-12 w-12 mb-4" />
              <p>Your generated reminder will appear here.</p>
            </div>
          )}
          {result && (
             <div className="space-y-4 text-sm w-full">
                {result.shouldSendReminder ? (
                    <>
                    <div className="p-4 bg-muted rounded-lg">
                        <p className="font-mono">{result.reminderMessage}</p>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            <span>{result.communicationChannel}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            <span>Send: {result.reminderTiming}</span>
                        </div>
                    </div>
                    </>
                ) : (
                    <p className="font-medium text-center">AI recommends not sending a reminder at this time.</p>
                )}
             </div>
          )}
        </CardContent>
        {result && result.shouldSendReminder && (
            <CardFooter>
                <Button className="w-full">
                    <Send className="mr-2 h-4 w-4"/>
                    Send Reminder
                </Button>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
