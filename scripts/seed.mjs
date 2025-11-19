
/**
 * This script seeds the Firestore database with initial data.
 * It uses the Firebase Admin SDK to bypass security rules.
 * 
 * To run this script:
 * 1. Make sure you have a service account key file for your Firebase project.
 * 2. Set the GOOGLE_APPLICATION_CREDENTIALS environment variable to the path of your key file.
 *    e.g., export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
 * 3. Run `npm run db:seed`
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { seedDatabase } from '../src/lib/seed.ts';
import { firebaseConfig } from '../src/firebase/config.ts';

// Check if the service account key env variable is set.
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('ERROR: The GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.');
    console.error('Please set it to the path of your Firebase service account key file.');
    console.error('e.g., export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"');
    process.exit(1);
}

try {
    // Initialize the Firebase Admin SDK
    initializeApp({
        credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS),
        projectId: firebaseConfig.projectId,
    });
    console.log('Firebase Admin SDK initialized successfully.');

    // Run the seeding function
    seedDatabase().catch((e) => {
        console.error('An error occurred during database seeding:', e);
        process.exit(1);
    });

} catch (error) {
    console.error('Failed to initialize Firebase Admin SDK.');
    console.error('Please ensure your service account key is valid and has the correct permissions.');
    console.error(error);
    process.exit(1);
}
