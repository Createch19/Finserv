
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCollection, useFirestore } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Customer, User } from "@/types";

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


export function SettingsTabs() {
  const { user } = useAuth();
  const firestore = useFirestore();

  const usersRef = collection(firestore, 'users');
  const { data: users, isLoading: usersLoading } = useCollection<User>(usersRef);

  const customersRef = user ? collection(firestore, `users/${user.uid}/customers`) : null;
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersRef);

  return (
    <Tabs defaultValue="agents" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="agents">Agents</TabsTrigger>
        <TabsTrigger value="defaults">Defaults</TabsTrigger>
        <TabsTrigger value="data">Data</TabsTrigger>
      </TabsList>
      <TabsContent value="agents">
        <Card>
          <CardHeader>
            <CardTitle>Manage Agents</CardTitle>
            <CardDescription>
              Add, edit, or remove agent users from the system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? <div className="flex justify-center"><Loader2 className="animate-spin" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="capitalize">{user.role}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" disabled={user.role === 'admin'}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
          </CardContent>
          <CardFooter>
            <Button>Add Agent</Button>
          </CardFooter>
        </Card>
      </TabsContent>
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
