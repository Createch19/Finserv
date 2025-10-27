
"use client";

import type { User, WithId } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="flex flex-col">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
    </div>
);

// This component is no longer used directly as individual user pages are deprecated.
// It is kept for potential future use if that functionality is restored.
export function UserDetails({ user }: { user: WithId<User> }) {
  return (
    <div className="max-w-2xl mx-auto">
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">User Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DetailItem label="Full Name" value={user.name} />
                <DetailItem label="Email Address" value={user.email} />
                <DetailItem label="User ID" value={<span className="text-xs font-mono">{user.id}</span>} />
                <DetailItem label="Role" value={
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize text-sm w-min">
                        {user.role}
                    </Badge>}
                />
            </CardContent>
        </Card>
    </div>
  );
}
