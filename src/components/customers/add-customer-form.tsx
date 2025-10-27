
"use client"

import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useFirestore, useCollection } from "@/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import type { User, Customer } from "@/types";

const formSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters."),
  phoneNumber: z.string().regex(/^\d{10}$/, "Please enter a valid 10-digit phone number."),
  address: z.string().min(5, "Address is required."),
  aadhar: z.string().regex(/^\d{4}\s\d{4}\s\d{4}$/, "Aadhar must be in format XXXX XXXX XXXX."),
  phoneModel: z.string().min(3, "Phone model is required."),
  totalPrice: z.coerce.number().min(0, "Price must be a positive number."),
  downPayment: z.coerce.number().min(0, "Down payment must be a positive number."),
  interestType: z.enum(["percentage", "value"]),
  interestValue: z.coerce.number().min(0, "Interest must be a positive number."),
  duration: z.coerce.number().min(1, "Duration must be at least 1 month."),
  startDate: z.date({ required_error: "A start date is required." }),
  agentId: z.string().min(1, "Please assign an agent."),
});

export function AddCustomerForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const firestore = useFirestore();

  const agentsRef = collection(firestore, 'users');
  const { data: agents, isLoading: agentsLoading } = useCollection<User>(agentsRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      phoneNumber: "",
      address: "",
      aadhar: "",
      phoneModel: "",
      totalPrice: 0,
      downPayment: 0,
      interestType: "percentage",
      interestValue: 10,
      duration: 6,
      agentId: user?.uid || "",
      startDate: new Date(),
    },
  });

  const [totalPrice, downPayment, interestType, interestValue, duration] = useWatch({
    control: form.control,
    name: ["totalPrice", "downPayment", "interestType", "interestValue", "duration"],
  });

  const [financedAmount, setFinancedAmount] = useState(0);
  const [interestAmount, setInterestAmount] = useState(0);
  const [totalPayable, setTotalPayable] = useState(0);
  const [monthlyEMI, setMonthlyEMI] = useState(0);

  useEffect(() => {
    const numTotalPrice = Number(totalPrice) || 0;
    const numDownPayment = Number(downPayment) || 0;
    const numInterestValue = Number(interestValue) || 0;
    const numDuration = Number(duration) || 0;

    const financed = Math.max(0, numTotalPrice - numDownPayment);
    let totalInterest = 0;

    if (interestType === 'percentage') {
        totalInterest = (financed * numInterestValue) / 100;
    } else {
        totalInterest = numInterestValue;
    }

    const payable = financed + totalInterest;
    const emi = numDuration > 0 ? payable / numDuration : 0;

    setFinancedAmount(financed);
    setInterestAmount(totalInterest);
    setTotalPayable(payable);
    setMonthlyEMI(emi);
  }, [totalPrice, downPayment, interestType, interestValue, duration]);
  
  useEffect(() => {
    if (user) {
        form.setValue('agentId', user.uid);
    }
  }, [user, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    if(!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        setIsLoading(false);
        return;
    }

    const newCustomer: Omit<Customer, 'id'> = {
      name: values.customerName,
      phone: values.phoneNumber,
      address: values.address,
      aadhar: values.aadhar,
      phoneModel: values.phoneModel,
      totalPrice: values.totalPrice,
      downPayment: values.downPayment,
      financedAmount,
      interestAmount,
      totalPayable,
      duration: values.duration,
      monthlyEMI,
      startDate: values.startDate.toISOString(),
      status: 'active',
      agentId: values.agentId,
      payments: [],
    };
    
    try {
        const customerCollection = collection(firestore, `users/${user.uid}/customers`);
        await addDoc(customerCollection, newCustomer);
        toast({
            title: "Customer Added",
            description: `${values.customerName} has been successfully added.`,
        });
        router.push("/customers");
    } catch (error) {
        console.error("Error adding customer:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not save the customer. Please try again."
        });
    } finally {
        setIsLoading(false);
    }
  }

  const interestTypeLabel = form.watch("interestType") === "percentage" ? "Interest (%)" : "Interest (₹)";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader><CardTitle className="font-headline">Customer Details</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <FormField control={form.control} name="customerName" render={({ field }) => (
              <FormItem><FormLabel>Customer Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phoneNumber" render={({ field }) => (
              <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="aadhar" render={({ field }) => (
              <FormItem><FormLabel>Aadhar Number</FormLabel><FormControl><Input placeholder="1234 5678 9012" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem className="md:col-span-2"><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-headline">Financing Details</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <FormField control={form.control} name="phoneModel" render={({ field }) => (
              <FormItem><FormLabel>Phone Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="totalPrice" render={({ field }) => (
              <FormItem><FormLabel>Total Price (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="downPayment" render={({ field }) => (
              <FormItem><FormLabel>Down Payment (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField
              control={form.control}
              name="interestType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Interest Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="percentage" />
                        </FormControl>
                        <FormLabel className="font-normal">Percentage (%)</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="value" />
                        </FormControl>
                        <FormLabel className="font-normal">Fixed Value (₹)</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="interestValue" render={({ field }) => (
              <FormItem><FormLabel>{interestTypeLabel}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="duration" render={({ field }) => (
              <FormItem><FormLabel>Duration (Months)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name="agentId" render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned Agent</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                  <FormControl><SelectTrigger disabled={agentsLoading}><SelectValue placeholder="Select an agent" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {agents?.map(agent => (
                      <SelectItem key={agent.uid} value={agent.uid}>{agent.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="startDate" render={({ field }) => (
              <FormItem className="flex flex-col"><FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle className="font-headline">Summary</CardTitle></CardHeader>
            <CardContent>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Financed Amount:</span> <span className="font-medium">₹{financedAmount.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Total Interest:</span> <span className="font-medium">₹{interestAmount.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Total Payable:</span> <span className="font-medium">₹{totalPayable.toLocaleString()}</span></div>
                    <div className="flex justify-between text-base font-semibold text-primary"><span>Monthly EMI:</span> <span>₹{monthlyEMI.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" size="lg" className="w-full" disabled={isLoading || agentsLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Customer
              </Button>
            </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
