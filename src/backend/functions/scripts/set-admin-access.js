const { initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

const email = process.argv[2]?.trim().toLowerCase();
const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'limkokwing-university';

if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: node scripts/set-admin-access.js <email>');
  process.exit(1);
}

initializeApp({ projectId });

async function grantInitialStaffAccess() {
  await getFirestore().collection('adminUsers').doc(email).set({
    email,
    name: email,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log(`Staff access granted to ${email}. They can now sign in with Google.`);
}

grantInitialStaffAccess().catch((error) => {
  console.error(`Could not create the adminUsers record: ${error.message}`);
  process.exitCode = 1;
});
