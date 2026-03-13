'use server';
/**
 * @fileOverview A flow for creating a new user with Firebase Admin SDK.
 * This should only be callable by a super admin.
 *
 * - createUser - A function to handle creating a user in Firebase Auth and Firestore.
 * - CreateUserInput - The input type for the createUser function.
 * - CreateUserOutput - The return type for the createUser function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

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
                console.warn("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY, falling back to default init:", e.message);
            }
        }
        
        // Fallback to default initialization (Application Default Credentials)
        try {
            initializeApp();
            console.log("Firebase Admin initialized via Application Default Credentials (ADC).");
        } catch (e: any) {
            console.error("Default Firebase Admin initialization failed:", e.message);
            throw new Error("Could not initialize Firebase Admin. Please ensure credentials are set correctly.");
        }
    }
}

const CreateUserInputSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string(),
  role: z.enum(["admin", "agent"]),
  companyId: z.string(),
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

const CreateUserOutputSchema = z.object({
  success: z.boolean(),
  uid: z.string().optional(),
  error: z.string().optional(),
});
export type CreateUserOutput = z.infer<typeof CreateUserOutputSchema>;

export async function createUser(input: CreateUserInput): Promise<CreateUserOutput> {
    try {
        ensureAdminInit();
        return createUserFlow(input);
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}


const createUserFlow = ai.defineFlow(
    {
        name: 'createUserFlow',
        inputSchema: CreateUserInputSchema,
        outputSchema: CreateUserOutputSchema,
    },
    async (input) => {
        const { name, email, password, role, companyId } = input;
        
        try {
            const auth = getAuth();
            const db = getFirestore();

            // 1. Create user in Firebase Auth
            const userRecord = await auth.createUser({
                email,
                password,
                displayName: name,
            });
            const uid = userRecord.uid;

            // 2. Set custom claims for the user's role and company
            // Wrapped in try-catch because security rules now also check Firestore
            try {
                await auth.setCustomUserClaims(uid, { role, companyId });
            } catch (claimError) {
                console.warn("Could not set custom claims, but proceeding with Firestore doc:", claimError);
            }

            // 3. Create user document in Firestore
            await db.collection('users').doc(uid).set({
                uid,
                name,
                email,
                role,
                companyId,
            });

            return { success: true, uid };
        } catch (e: any) {
            console.error("Error in createUserFlow:", e);
            let errorMessage = "An unexpected error occurred.";
            if (e.code === 'auth/email-already-exists') {
                errorMessage = "A user with this email address already exists.";
            } else if (e.code === 'auth/invalid-password') {
                errorMessage = "The password must be at least 6 characters long.";
            } else if (e.message) {
                errorMessage = e.message;
            }
            return { success: false, error: errorMessage };
        }
    }
);
