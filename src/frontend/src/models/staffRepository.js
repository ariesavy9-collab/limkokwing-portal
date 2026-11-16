import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from './firebase';

const functions = getFunctions(firebaseApp, 'us-central1');

export async function grantAdminAccess(email) {
  const grantAccess = httpsCallable(functions, 'grantAdminAccess');
  const result = await grantAccess({ email: email.trim().toLowerCase() });
  return result.data;
}

export async function removeStudent(email) {
  const removeStudentRecord = httpsCallable(functions, 'deleteStudentRecord');
  const result = await removeStudentRecord({ email: email.trim().toLowerCase() });
  return result.data;
}
