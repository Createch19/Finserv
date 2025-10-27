
"use client";
import { notFound } from "next/navigation";

export default function UserDetailPage() {
    // This page is deprecated as we are not using a separate user collection anymore.
    // The user list is derived from the customers collection.
    // This will show a 404 page.
    notFound();
}
