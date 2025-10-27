
"use client";

import Link from "next/link";
import { UserDetails } from "@/components/users/user-details";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { notFound, useParams } from "next/navigation";
import React from "react";
import type { User, WithId } from "@/types";
import { doc } from "firebase/firestore";
import { useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { useAuth } from "@/hooks/use-auth";

function UserDataFetcher({ userId }: { userId: string }) {
    const firestore = useFirestore();

    const userRef = useMemoFirebase(
        () => {
            if (firestore && userId) {
                return doc(firestore, `users`, userId);
            }
            return null;
        },
        [firestore, userId]
    );

    const { data: user, isLoading } = useDoc<WithId<User>>(userRef);

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!user) {
        notFound();
    }
    
    return (
        <>
            <PageHeader title={user.name} description={`Details for user`}>
                <Link href="/users" passHref>
                    <Button variant="outline">
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back to Users
                    </Button>
                </Link>
            </PageHeader>
            <UserDetails user={user} />
        </>
    );
}

export default function UserDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user: authUser, loading: isUserLoading } = useAuth();

  const isReadyToFetch = !isUserLoading && authUser && id;

  if (isUserLoading) {
    return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (isReadyToFetch) {
    return <UserDataFetcher userId={id} />;
  }
  
  if (!isUserLoading && (!authUser || !id)) {
      return notFound();
  }

  return (
    <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
