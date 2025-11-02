
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
import { Download, Loader2, Palette } from "lucide-react";
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

const hslToHex = (hsl: string): string => {
    const [h, s, l] = hsl.split(' ').map((val, index) => parseInt(val.replace('%', '')) / (index > 0 ? 100 : 360));
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    const toHex = (x: number) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
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
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="defaults">Defaults</TabsTrigger>
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

    