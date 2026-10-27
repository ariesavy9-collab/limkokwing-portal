import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from './firebase';

const functions = getFunctions(firebaseApp, 'us-central1');

export async function createStaffAccount(account) {
  const createAccount = httpsCallable(functions, 'createStaffAccount');
  const result = await createAccount({
    name: account.name.trim(),
    email: account.email.trim().toLowerCase(),
    password: account.password,
  });
  return result.data;
}
