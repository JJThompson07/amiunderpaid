import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env
dotenv.config({ path: resolve(process.cwd(), '.env') });

async function grantAdmin() {
  const uid = process.argv[2];
  if (!uid) {
    console.error('Usage: pnpm tsx scripts/grant-admin.ts <uid>');
    process.exit(1);
  }

  // Check if Firebase service account is provided in env
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!serviceAccountBase64) {
    console.error('Missing FIREBASE_SERVICE_ACCOUNT_BASE64 in .env');
    process.exit(1);
  }

  try {
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf8'));
    
    if (getApps().length === 0) {
      initializeApp({
        credential: cert(serviceAccount),
      });
    }

    console.log(`Granting admin claim to ${uid}...`);
    
    // Set custom claim
    await getAuth().setCustomUserClaims(uid, { admin: true });
    
    // Update user document
    await getFirestore().collection('users').doc(uid).set({ role: 'admin' }, { merge: true });

    console.log('Successfully granted admin access!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to grant admin access:', err);
    process.exit(1);
  }
}

grantAdmin();
