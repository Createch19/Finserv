
"use client";

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
import { Download, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Customer, User, WithId } from "@/types";

function downloadCSV(data: any[], filename: string) {
    if (data.length === 0) return;
    
    // Flatten nested payment data
    const flattenedData = data.map(item => {
        const { payments, ...rest } = item;
        return {
            ...rest,
            payments: JSON.stringify(payments) // Convert array to JSON string
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
      <TabsContent value="defaults">
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
