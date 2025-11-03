

"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Download, Loader2, Palette, PlusCircle, Trash2 } from "lucide-react";
import { useCollection, useFirestore } from "@/firebase";
import { collection, addDoc, doc, deleteDoc, query, orderBy } from "firebase/firestore";
import type { Customer, WithId, User, ExpenseType } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/hooks/use-toast";
import { FirestorePermissionError, errorEmitter } from "@/firebase";

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

const hexToHsl = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0 0% 0%";
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const ManageExpenseTypes = () => {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [newExpenseType, setNewExpenseType] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const expenseTypesQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, "expenseTypes"), orderBy("createdAt", "desc"));
    }, [firestore]);

    const { data: expenseTypes, isLoading } = useCollection<WithId<ExpenseType>>(expenseTypesQuery);

    const handleAddExpenseType = async () => {
        if (newExpenseType.trim() === "" || !firestore) return;

        setIsSubmitting(true);
        const newType: ExpenseType = {
            id: uuidv4(),
            name: newExpenseType.trim(),
            createdAt: new Date().toISOString(),
        };

        const collectionRef = collection(firestore, "expenseTypes");
        addDoc(collectionRef, newType)
            .then(() => {
                toast({ title: "Expense Type Added" });
                setNewExpenseType("");
            })
            .catch((serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: collectionRef.path,
                    operation: "create",
                    requestResourceData: newType,
                });
                errorEmitter.emit("permission-error", permissionError);
            })
            .finally(() => setIsSubmitting(false));
    };
    
    const handleDelete = (typeId: string) => {
        if (!firestore) return;
        setDeletingId(typeId);
        const docRef = doc(firestore, "expenseTypes", typeId);
        deleteDoc(docRef).catch((serverError) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        }).finally(() => {
            setDeletingId(null);
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Expense Types</CardTitle>
                <CardDescription>Add or remove categories for expenses.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Input
                        placeholder="e.g., Office Rent"
                        value={newExpenseType}
                        onChange={(e) => setNewExpenseType(e.target.value)}
                        disabled={isSubmitting}
                    />
                    <Button onClick={handleAddExpenseType} disabled={isSubmitting || newExpenseType.trim() === ""}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                        <span className="ml-2">Add</span>
                    </Button>
                </div>
                <div className="space-y-2 rounded-md border p-2">
                    {isLoading ? <Loader2 className="mx-auto my-4 h-6 w-6 animate-spin" /> :
                        expenseTypes && expenseTypes.length > 0 ? expenseTypes.map(type => (
                            <div key={type.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                                <span>{type.name}</span>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(type.id)} disabled={deletingId === type.id}>
                                    {deletingId === type.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4 text-destructive" />}
                                </Button>
                            </div>
                        )) : <p className="p-4 text-center text-sm text-muted-foreground">No expense types added yet.</p>
                    }
                </div>
            </CardContent>
        </Card>
    );
};


export function SettingsTabs() {
  const { user } = useAuth();
  const firestore = useFirestore();

  const customersQuery = useMemo(() => getCustomersQuery(firestore, user), [user, firestore]);
  const { data: customers, isLoading: customersLoading } = useCollection<WithId<Customer>>(customersQuery);
  
  const [colors, setColors] = useState({
    primary: '#1d7874',
    accent: '#679289',
    background: '#f4f9f4',
  });

  useEffect(() => {
    const savedPrimary = localStorage.getItem('theme-primary');
    const savedAccent = localStorage.getItem('theme-accent');
    const savedBackground = localStorage.getItem('theme-background');
    
    const root = document.documentElement;
    const initialColors = { primary: '#1d7874', accent: '#679289', background: '#f4f9f4' };

    if (savedPrimary) {
        root.style.setProperty('--primary', hexToHsl(savedPrimary));
        initialColors.primary = savedPrimary;
    }
    if (savedAccent) {
        root.style.setProperty('--accent', hexToHsl(savedAccent));
        initialColors.accent = savedAccent;
    }
    if (savedBackground) {
        root.style.setProperty('--background', hexToHsl(savedBackground));
        initialColors.background = savedBackground;
    }
    setColors(initialColors);
  }, []);

  const handleColorChange = (colorName: keyof typeof colors, value: string) => {
    setColors(prev => ({...prev, [colorName]: value}));
    const hslValue = hexToHsl(value);
    document.documentElement.style.setProperty(`--${colorName}`, hslValue);
    localStorage.setItem(`theme-${colorName}`, value);
    if(colorName === 'primary') {
      document.documentElement.style.setProperty(`--ring`, hslValue);
    }
  }

  const resetColors = () => {
    const defaultColors = {
      primary: '#1d7874',
      accent: '#679289',
      background: '#f4f9f4',
    };
    handleColorChange('primary', defaultColors.primary);
    handleColorChange('accent', defaultColors.accent);
    handleColorChange('background', defaultColors.background);
  };

  const ColorPicker = ({ label, id, value, onChange }: { label: string, id: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <div className="flex flex-col items-center gap-2">
      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <Input type="color" id={id} value={value} onChange={onChange} className="w-16 h-16 p-1 border-2 border-border rounded-full appearance-none cursor-pointer" />
        <Palette className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-white mix-blend-difference pointer-events-none" />
      </div>
      <span className="text-xs font-mono text-muted-foreground">{value}</span>
    </div>
  );


  return (
    <Tabs defaultValue="defaults" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="defaults">Defaults</TabsTrigger>
        <TabsTrigger value="expense-types">Expense Types</TabsTrigger>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
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
      <TabsContent value="expense-types">
        <ManageExpenseTypes />
      </TabsContent>
      <TabsContent value="appearance">
        <Card>
            <CardHeader>
                <CardTitle>Customize Appearance</CardTitle>
                <CardDescription>
                Change the color scheme of the application.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-row justify-around items-center p-4 rounded-lg bg-muted/50">
                    <ColorPicker label="Primary" id="primary-color" value={colors.primary} onChange={(e) => handleColorChange('primary', e.target.value)} />
                    <ColorPicker label="Accent" id="accent-color" value={colors.accent} onChange={(e) => handleColorChange('accent', e.target.value)} />
                    <ColorPicker label="Background" id="background-color" value={colors.background} onChange={(e) => handleColorChange('background', e.target.value)} />
                </div>
            </CardContent>
            <CardFooter>
                <Button variant="outline" onClick={resetColors}>Reset to Defaults</Button>
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

