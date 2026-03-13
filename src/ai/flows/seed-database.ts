'use server';
/**
 * @fileOverview A flow for seeding the database with initial demo data.
 * This uses the Firebase Admin SDK and should only be accessible to super admins.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { seedDatabase as runSeed } from '@/lib/seed';

// Initialize Firebase Admin SDK with fallback to ADC
function ensureAdminInit() {
    if (!getApps().length) {
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        
        // Only attempt cert initialization if the key looks like a valid non-empty JSON string
        if (serviceAccountKey && serviceAccountKey.trim() !== "" && serviceAccountKey !== "undefined") {
            try {
                const serviceAccount = JSON.parse(serviceAccountKey);
                initializeApp({
                    credential: cert(serviceAccount),
                });
                console.log("Firebase Admin initialized via Service Account Key.");
                return;
            } catch (e: any) {
                console.warn("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY in seed flow, falling back to ADC:", e.message);
            }
        }
        
        // Fallback to default initialization (Application Default Credentials)
        try {
            initializeApp();
            console.log("Firebase Admin initialized via Application Default Credentials (ADC) in seed flow.");
        } catch (e: any) {
            console.error("Default init failed in seed flow:", e.message);
            throw new Error("Could not initialize Firebase Admin. Please check credentials.");
        }
    }
}

export async function seedDatabase(): Promise<{ success: boolean; error?: string }> {
    try {
        ensureAdminInit();
        return seedDatabaseFlow({});
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

const seedDatabaseFlow = ai.defineFlow(
    {
        name: 'seedDatabaseFlow',
        inputSchema: z.object({}),
        outputSchema: z.object({
            success: z.boolean(),
            error: z.string().optional(),
        }),
    },
    async () => {
        try {
            await runSeed();
            return { success: true };
        } catch (e: any) {
            console.error("Seed error:", e);
            return { success: false, error: e.message || "An unexpected error occurred during seeding." };
        }
    }
);
