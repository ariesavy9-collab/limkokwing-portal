import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { ensureUserProfile } from './portalRepository';

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const credential = await signInWithPopup(auth, provider);
  const user = credential.user;
  const email = user.email?.trim().toLowerCase();
  if (!email) {
    await signOut(auth);
    throw new Error('Your Google account must have an email address.');
  }

  try {
    const [adminRecord, studentRecord] = await Promise.all([
      getDoc(doc(db, 'adminUsers', email)),
      getDoc(doc(db, 'studentDirectory', email)),
    ]);
    const isAdmin = adminRecord.exists();
    const student = studentRecord.exists() ? studentRecord.data() : null;
    const isRegisteredStudent = student?.email?.toLowerCase() === email
      && /^90[0-9]{7}$/.test(student.studentId || '');

    if (!isAdmin && !isRegisteredStudent) {
      throw new Error('This Google account is not registered for portal access. Contact Student Affairs to be added to the database.');
    }

    await ensureUserProfile(user, isAdmin ? {} : student);
    return { user, isAdmin };
  } catch (error) {
    await signOut(auth);
    throw error;
  }
}

export function subscribeToAdminAccess(email, onAccess, onError) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) {
    onAccess(false, false);
    return () => {};
  }

  return onSnapshot(
    doc(db, 'adminUsers', normalizedEmail),
    { includeMetadataChanges: true },
    (snapshot) => onAccess(snapshot.exists(), snapshot.metadata.fromCache),
    onError,
  );
}

export async function signOutUser() {
  await signOut(auth);
}

export function getAuthErrorMessage(error) {
  const messages = {
    'auth/popup-closed-by-user': 'The Google sign-in window was closed before completion.',
    'auth/popup-blocked': 'Your browser blocked the sign-in window. Allow pop-ups and try again.',
    'auth/too-many-requests': 'Too many attempts were made. Wait a moment, then try again.',
  };
  return messages[error.code] || error.message || 'Sign-in could not be completed. Please try again.';
}
