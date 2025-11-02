
"use client";

import type { User } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Badge } from "@/components/ui/badge";

const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="flex flex-col">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
    </div>
);

const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

export function ProfileDetails({ user }: { user: User }) {
    const userAvatar = PlaceHolderImages.find(img => img.id === 'user-avatar');

  return (
    <Card>
        <CardHeader>
            <CardTitle className="font-headline">Profile Information</CardTitle>
            <CardDescription>Your personal and role information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                    <AvatarImage 
                        src={userAvatar?.imageUrl} 
                        alt={user.name} 
                        data-ai-hint={userAvatar?.imageHint} 
                    />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div>
                    <h2 className="text-xl font-semibold">{user.name}</h2>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
            </div>
            <div className="space-y-4">
                <DetailItem label="Role" value={
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize text-sm w-min">
                        {user.role}
                    </Badge>} 
                />
                <DetailItem label="User ID" value={
                    <p className="text-xs font-mono text-muted-foreground">{user.uid}</p>
                }/>
            </div>
        </CardContent>
    </Card>
  );
}
