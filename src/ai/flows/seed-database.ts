
'use server';
/**
 * @fileOverview A flow for seeding the database with initial demo data.
 * This uses the Firebase Admin SDK and should only be accessible to super admins.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { ensureAdminInit } from '@/lib/firebase-admin';
import { seedDatabase as runSeed } from '@/lib/seed';

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
