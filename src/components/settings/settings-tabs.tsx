
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Download, Loader2 } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Customer, WithId, User } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

function downloadCSV(data: any[], filename: string) {
    if (data.length === 0) return;
    
    const flattenedData = data.map(item => {
        const { payments, ...rest } = item;
        return {
            ...rest,
            payments: JSON.stringify(payments)
        };
    });

    const headers = Object.keys(flattenedData[0]);
    const csvRows = [
        headers.join(','),
        ...flattenedData.map(row => 
            headers.map(header => JSON.stringify(row[header])).join(',')
        )
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function getCustomersQuery(firestore: any, user: User | null) {
    if (!firestore || !user) return null;
    
    const customersCollection = collection(firestore, 'customers');
    
    if (user.role === 'admin') {
        return customersCollection;
    } else {
        return query(customersCollection, where('agentId', '==', user.uid));
    }
}

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newPassword: z.string().min(6, { message: "New password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"],
});


function ChangePasswordForm() {
    const { updatePassword } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof passwordFormSchema>>({
        resolver: zodResolver(passwordFormSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    async function onSubmit(values: z.infer<typeof passwordFormSchema>) {
        setIsSubmitting(true);
        try {
            await updatePassword(values.currentPassword, values.newPassword);
            toast({
                title: "Password Updated",
                description: "Your password has been successfully changed.",
            });
            form.reset();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: (error as Error).message,
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your account password here.
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="currentPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Current Password</FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="newPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>New Password</FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} />
                               
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Confirm New Password</FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Change Password
                    </Button>
                </CardFooter>
            </form>
          </Form>
        </Card>
    )
}


export function SettingsTabs() {
  const { user } = useAuth();
  const firestore = useFirestore();

  const customersQuery = useMemoFirebase(() => getCustomersQuery(firestore, user), [user, firestore]);
  const { data: customers, isLoading: customersLoading } = useCollection<WithId<Customer>>(customersQuery);

  return (
    <Tabs defaultValue="defaults" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="defaults">Defaults</TabsTrigger>
        <TabsTrigger value="data">Data</TabsTrigger>
      </TabsList>
      <TabsContent value="defaults" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Application Defaults</CardTitle>
            <CardDescription>
              Set default values for new financing records.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="interest">Default Interest Rate (%)</Label>
              <Input id="interest" defaultValue="10" />
            </div>
          </CardContent>
          <CardFooter>
            <Button>Save Changes</Button>
          </CardFooter>
        </Card>
        <ChangePasswordForm />
      </TabsContent>
      <TabsContent value="data">
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>
              Backup or export your application data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => downloadCSV(customers || [], 'customers-backup.csv')} disabled={customersLoading}>
                {customersLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Export Customer Data (CSV)
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
