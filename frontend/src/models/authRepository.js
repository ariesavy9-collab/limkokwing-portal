import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from './firebase';
import { ensureUserProfile } from './portalRepository';

export async function registerWithEmail({ name, studentId, phone, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  await updateProfile(credential.user, { displayName: name.trim() });
  await ensureUserProfile(credential.user, { name: name.trim(), studentId: studentId.trim(), phone: phone.trim() });
  return credential.user;
}

export async function loginWithEmail(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  await ensureUserProfile(credential.user);
  return credential.user;
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const credential = await signInWithPopup(auth, provider);
  await ensureUserProfile(credential.user);
  return credential.user;
}

export async function startPhoneLogin(phoneNumber, container) {
  const verifier = new RecaptchaVerifier(auth, container, { size: 'normal' });
  try {
    const confirmation = await signInWithPhoneNumber(auth, phoneNumber.trim(), verifier);
    return { confirmation, verifier };
  } catch (error) {
    await verifier.clear();
    throw error;
  }
}

export async function finishPhoneLogin(confirmation, code) {
  const credential = await confirmation.confirm(code.trim());
  await ensureUserProfile(credential.user);
  return credential.user;
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

export async function signOutUser() {
  await signOut(auth);
}

export function getAuthErrorMessage(error) {
  const messages = {
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/user-not-found': 'No account was found for this email address.',
    'auth/wrong-password': 'The email or password is incorrect.',
    'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
    'auth/weak-password': 'Choose a password with at least 8 characters.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/popup-closed-by-user': 'The Google sign-in window was closed before completion.',
    'auth/popup-blocked': 'Your browser blocked the sign-in window. Allow pop-ups and try again.',
    'auth/too-many-requests': 'Too many attempts were made. Wait a moment, then try again.',
    'auth/invalid-phone-number': 'Enter a valid mobile number in international format, for example +266 5XXX XXXX.',
    'auth/invalid-verification-code': 'That verification code is incorrect. Check it and try again.',
    'auth/code-expired': 'That verification code has expired. Request a new one.',
  };
  return messages[error.code] || error.message || 'Sign-in could not be completed. Please try again.';
}
