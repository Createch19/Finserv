
"use client";

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useFirestore } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import type { Customer, WithId } from "@/types";
import { errorEmitter, FirestorePermissionError } from "@/firebase";

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
});

export function EditCustomerForm({ customer }: { customer: WithId<Customer> }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: customer.name,
      phoneNumber: customer.phone,
      address: customer.address,
      aadhar: customer.aadhar,
      phoneModel: customer.phoneModel,
      totalPrice: customer.totalPrice,
      downPayment: customer.downPayment,
      // Logic to determine interestType and interestValue is complex if not stored.
      // Assuming a default or simplifying for now. Let's assume we can't change interest structure on edit.
      interestType: "value",
      interestValue: customer.interestAmount,
      duration: customer.duration,
      startDate: new Date(customer.startDate),
    },
  });

  const [totalPrice, downPayment, interestType, interestValue, duration] = useWatch({
    control: form.control,
    name: ["totalPrice", "downPayment", "interestType", "interestValue", "duration"],
  });

  const [financedAmount, setFinancedAmount] = useState(customer.financedAmount);
  const [interestAmount, setInterestAmount] = useState(customer.interestAmount);
  const [totalPayable, setTotalPayable] = useState(customer.totalPayable);
  const [monthlyEMI, setMonthlyEMI] = useState(customer.monthlyEMI);

  useEffect(() => {
    const numTotalPrice = Number(totalPrice) || 0;
    const numDownPayment = Number(downPayment) || 0;
    const numInterestValue = Number(interestValue) || 0;
    const numDuration = Number(duration) || 0;

    const financed = Math.max(0, numTotalPrice - numDownPayment);
    // On edit, we just use the fixed interest amount. Recalculating based on % could be complex.
    const totalInterest = numInterestValue;

    const payable = financed + totalInterest;
    const emi = numDuration > 0 ? payable / numDuration : 0;

    setFinancedAmount(financed);
    setInterestAmount(totalInterest);
    setTotalPayable(payable);
    setMonthlyEMI(emi);
  }, [totalPrice, downPayment, interestType, interestValue, duration]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    if (!user || !firestore) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to perform this action.",
      });
      setIsLoading(false);
      return;
    }
    
    // Cannot change financial structure if payments have been made.
    if (customer.payments && customer.payments.length > 0) {
        if (
            customer.totalPrice !== values.totalPrice ||
            customer.downPayment !== values.downPayment ||
            customer.interestAmount !== interestAmount ||
            customer.duration !== values.duration
        ) {
             toast({
                variant: "destructive",
                title: "Cannot Edit Financials",
                description: "Financial details cannot be changed once payments have been recorded.",
            });
            setIsLoading(false);
            return;
        }
    }


    const customerDocRef = doc(firestore, "customers", customer.id);

    const updatedCustomerData = {
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
    };

    updateDoc(customerDocRef, updatedCustomerData)
      .then(() => {
        toast({
          title: "Customer Updated",
          description: `${values.customerName}'s details have been successfully updated.`,
        });
        router.push(`/customers/${customer.id}`);
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: customerDocRef.path,
          operation: "update",
          requestResourceData: updatedCustomerData,
        });
        errorEmitter.emit("permission-error", permissionError);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  // Fields that can't be edited if payments exist
  const financialsDisabled = customer.payments && customer.payments.length > 0;

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
          <CardHeader>
            <CardTitle className="font-headline">Financing Details</CardTitle>
            {financialsDisabled && <CardDescription className="text-destructive">Financial details are locked because payments have been recorded.</CardDescription>}
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <FormField control={form.control} name="phoneModel" render={({ field }) => (
              <FormItem><FormLabel>Phone Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="totalPrice" render={({ field }) => (
              <FormItem><FormLabel>Total Price (₹)</FormLabel><FormControl><Input type="number" {...field} disabled={financialsDisabled} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="downPayment" render={({ field }) => (
              <FormItem><FormLabel>Down Payment (₹)</FormLabel><FormControl><Input type="number" {...field} disabled={financialsDisabled} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="interestValue" render={({ field }) => (
              <FormItem><FormLabel>Interest (₹)</FormLabel><FormControl><Input type="number" {...field} disabled={financialsDisabled} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="duration" render={({ field }) => (
              <FormItem><FormLabel>Duration (Months)</FormLabel><FormControl><Input type="number" {...field} disabled={financialsDisabled} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="startDate" render={({ field }) => (
              <FormItem className="flex flex-col"><FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={financialsDisabled}>
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={financialsDisabled} />
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
              <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

    