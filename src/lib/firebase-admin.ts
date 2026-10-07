
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Initializes the Firebase Admin SDK with robust credential handling.
 * Prioritizes a service account key from environment variables, falls back to ADC.
 */
export function ensureAdminInit(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    // 1. Try initializing with Service Account Key if provided and valid
    if (serviceAccountKey && serviceAccountKey.trim() !== "" && serviceAccountKey !== "undefined") {
        try {
            const serviceAccount = JSON.parse(serviceAccountKey);
            
            // Validate service account object structure to avoid "Missing error payload" later
            if (serviceAccount && serviceAccount.project_id && serviceAccount.private_key && serviceAccount.client_email) {
                console.log("Firebase Admin: Initializing with provided Service Account Key for project:", serviceAccount.project_id);
                return initializeApp({
                    credential: cert(serviceAccount),
                });
            } else {
                console.warn("Firebase Admin: FIREBASE_SERVICE_ACCOUNT_KEY is present but missing required fields (project_id, private_key, or client_email).");
            }
        } catch (e: any) {
            console.error("Firebase Admin: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:", e.message);
        }
    }

    // 2. Fallback to Application Default Credentials (ADC)
    // This works in GCP environments (App Engine, Cloud Functions, etc.)
    // In local development or Firebase Studio Workstations, this might require 
    // the GOOGLE_APPLICATION_CREDENTIALS environment variable.
    try {
        console.log("Firebase Admin: Attempting initialization via Application Default Credentials (ADC)...");
        const app = initializeApp();
        console.log("Firebase Admin: Successfully initialized via ADC.");
        return app;
    } catch (e: any) {
        console.error("Firebase Admin: Initialization failed. No valid credentials found.", e.message);
        throw new Error(
            "Firebase Admin SDK could not be initialized. " +
            "Please ensure the FIREBASE_SERVICE_ACCOUNT_KEY environment variable is set to a valid JSON service account key " +
            "from the Firebase Console (Project Settings > Service Accounts > Generate new private key)."
        );
    }
}

export { getAuth, getFirestore };
