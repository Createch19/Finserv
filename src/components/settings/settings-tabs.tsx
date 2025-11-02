
"use client";

import { useMemo } from "react";
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
import { useCollection, useFirestore } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Customer, WithId, User } from "@/types";
import { useAuth } from "@/hooks/use-auth";

function downloadCSV(data: any[], filename: string) {
    if (data.length === 0) return;
    
    const flattenedData = data.map(item => {
        const { payments, agent, ...rest } = item;
        return {
            ...rest,
            agentId: agent.uid,
            agentName: agent.name,
            agentEmail: agent.email,
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
    
    // Fetch all customers for both admins and agents.
    return collection(firestore, 'customers');
}

export function SettingsTabs() {
  const { user } = useAuth();
  const firestore = useFirestore();

  const customersQuery = useMemo(() => getCustomersQuery(firestore, user), [user, firestore]);
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
