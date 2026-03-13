'use server';
/**
 * @fileOverview A flow for seeding the database with initial demo data.
 * This uses the Firebase Admin SDK and should only be accessible to super admins.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { seedDatabase as runSeed } from '@/lib/seed';

export async function seedDatabase(): Promise<{ success: boolean; error?: string }> {
    return seedDatabaseFlow({});
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
        // Initialize Firebase Admin if not already initialized
        if (!getApps().length) {
            const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
            if (!serviceAccountKey) {
                return { success: false, error: "FIREBASE_SERVICE_ACCOUNT_KEY not found in environment." };
            }
            try {
                const serviceAccount = JSON.parse(serviceAccountKey);
                initializeApp({
                    credential: cert(serviceAccount),
                });
            } catch (e: any) {
                return { success: false, error: "Failed to parse service account key: " + e.message };
            }
        }

        try {
            await runSeed();
            return { success: true };
        } catch (e: any) {
            console.error("Seed error:", e);
            return { success: false, error: e.message || "An unexpected error occurred during seeding." };
        }
    }
);
