const { initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

const email = 'kabeloselomo313@gmail.com';
const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'limkokwing-university';
const initializedCollections = [
  'adminUsers',
  'studentDirectory',
  'studentLetters',
  'portalSettings',
  'users',
  'serviceRequests',
  'publicInquiries',
  'services',
  'notifications',
  'chatRooms',
];

initializeApp({ projectId });

async function grantInitialStaffAccess() {
  const db = getFirestore();
  await db.collection('adminUsers').doc(email).set({
    email,
    name: email,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  for (const collectionName of initializedCollections) {
    const markerRef = db.collection(collectionName).doc('portal-system-init');
    try {
      await markerRef.create({
        system: true,
        type: 'collection-initialization',
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      if (error.code !== 6 && error.code !== 'already-exists') throw error;
      const existing = await markerRef.get();
      if (existing.data()?.system !== true) {
        throw new Error(`Cannot initialize ${collectionName}: reserved marker document already contains non-system data.`);
      }
    }
  }

  const academicOptionsRef = db.collection('portalSettings').doc('academicOptions');
  try {
    await academicOptionsRef.create({
      faculties: [],
      courses: [],
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    if (error.code !== 6 && error.code !== 'already-exists') throw error;
  }

  console.log(`Initial administrator configured: ${email}`);
  console.log('Firestore collections and the academic-options settings document are initialized.');
}

grantInitialStaffAccess().catch((error) => {
  console.error(`Could not initialize Firestore: ${error.message}`);
  process.exitCode = 1;
});
