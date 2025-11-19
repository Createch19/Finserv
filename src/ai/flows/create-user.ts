
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

// Initialize Firebase Admin SDK
if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
    initializeApp({
        credential: cert(serviceAccount),
    });
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
    return createUserFlow(input);
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
            // 1. Create user in Firebase Auth
            const auth = getAuth();
            const userRecord = await auth.createUser({
                email,
                password,
                displayName: name,
            });
            const uid = userRecord.uid;

            // 2. Set custom claims for the user's role and company
            await auth.setCustomUserClaims(uid, { role, companyId });

            // 3. Create user document in Firestore
            const db = getFirestore();
            await db.collection('users').doc(uid).set({
                uid,
                name,
                email,
                role,
                companyId,
            });

            return { success: true, uid };
        } catch (e: any) {
            console.error("Error creating user:", e);
            let errorMessage = "An unexpected error occurred.";
            if (e.code === 'auth/email-already-exists') {
                errorMessage = "A user with this email address already exists.";
            } else if (e.message) {
                errorMessage = e.message;
            }
            return { success: false, error: errorMessage };
        }
    }
);
