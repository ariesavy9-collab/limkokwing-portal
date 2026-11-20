import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, db, firebaseApp } from './firebase';

const functions = getFunctions(firebaseApp, 'us-central1');

export async function grantAdminAccess(email) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Enter a valid Google account email address.');
  }
  if (!auth.currentUser?.email) {
    throw new Error('Sign in with an administrator account before granting access.');
  }

  await setDoc(doc(db, 'adminUsers', normalizedEmail), {
    email: normalizedEmail,
    name: normalizedEmail,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function removeStudent(email) {
  const removeStudentRecord = httpsCallable(functions, 'deleteStudentRecord', {
    timeout: 540000,
  });
  const result = await removeStudentRecord({ email: email.trim().toLowerCase() });
  return result.data;
}
