import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

const PROFILE_NAME_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿ'’.-]+(?: [A-Za-zÀ-ÖØ-öø-ÿ'’.-]+)*$/;

export async function ensureUserProfile(user, initialDetails = {}) {
  const profileRef = doc(db, 'users', user.uid);
  const profile = await getDoc(profileRef);
  const submittedName = (initialDetails.name || user.displayName || '').trim().slice(0, 20);
  const details = {
    name: PROFILE_NAME_PATTERN.test(submittedName) ? submittedName : 'Student',
    phone: initialDetails.phone || user.phoneNumber || '',
    studentId: initialDetails.studentId || '',
    updatedAt: serverTimestamp(),
  };

  if (profile.exists()) {
    const existingDetails = profile.data();
    const missingDetails = {
      updatedAt: details.updatedAt,
      ...(!existingDetails.name && details.name ? { name: details.name } : {}),
      ...(!existingDetails.phone && details.phone ? { phone: details.phone } : {}),
      ...(!existingDetails.studentId && details.studentId ? { studentId: details.studentId } : {}),
    };
    await setDoc(profileRef, missingDetails, { merge: true });
    return;
  }

  await setDoc(profileRef, {
    ...details,
    email: user.email?.trim().toLowerCase() || '',
    createdAt: serverTimestamp(),
  });
}

export function subscribeToStudentProfile(uid, onProfile, onError) {
  return onSnapshot(
    doc(db, 'users', uid),
    { includeMetadataChanges: true },
    (snapshot) => onProfile(snapshot.exists() ? snapshot.data() : null, snapshot.metadata.fromCache),
    onError,
  );
}

export async function saveStudentProfile(user, details) {
  await setDoc(doc(db, 'users', user.uid), {
    name: details.name.trim(),
    email: user.email?.trim().toLowerCase() || '',
    studentId: details.studentId.trim(),
    phone: details.phone.trim(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function createStudentRequest(uid, request) {
  const reference = await addDoc(collection(db, 'serviceRequests'), {
    ownerUid: uid,
    studentName: request.studentName.trim(),
    studentId: request.studentId.trim(),
    email: request.email.trim().toLowerCase(),
    phone: request.phone.trim(),
    serviceId: request.serviceId,
    service: request.service,
    description: request.description.trim(),
    date: request.date,
    status: 'Pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return reference.id;
}

export async function createPublicInquiry(inquiry) {
  const reference = await addDoc(collection(db, 'publicInquiries'), {
    name: inquiry.name.trim(),
    email: inquiry.email.trim().toLowerCase(),
    phone: inquiry.phone.trim(),
    serviceId: inquiry.serviceId,
    service: inquiry.service,
    message: inquiry.message.trim(),
    status: 'New',
    createdAt: serverTimestamp(),
  });
  return reference.id;
}

export async function createService(service) {
  const reference = await addDoc(collection(db, 'services'), {
    name: service.name.trim(),
    description: service.description.trim(),
    department: service.department.trim(),
    processingTime: service.processingTime.trim(),
    fee: service.fee.trim() || 'No fee',
    studentOnly: service.studentOnly,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return reference.id;
}

function watchCollection(collectionName, callback, onError, ownerUid) {
  const records = collection(db, collectionName);
  const baseQuery = ownerUid
    ? query(records, where('ownerUid', '==', ownerUid))
    : query(records, orderBy('createdAt', 'desc'));

  return onSnapshot(baseQuery, (snapshot) => {
    const documents = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((first, second) => {
        const firstDate = first.createdAt?.toMillis?.() || 0;
        const secondDate = second.createdAt?.toMillis?.() || 0;
        return secondDate - firstDate;
      });
    callback(documents);
  }, onError);
}

export function subscribeToStudentRequests(uid, callback, onError) {
  return watchCollection('serviceRequests', callback, onError, uid);
}

export function subscribeToNotifications(uid, callback, onError) {
  return onSnapshot(
    query(collection(db, 'notifications'), where('ownerUid', '==', uid)),
    (snapshot) => {
      const notifications = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .sort((first, second) => (
          (second.createdAt?.toMillis?.() || 0) - (first.createdAt?.toMillis?.() || 0)
        ));
      callback(notifications);
    },
    onError,
  );
}

export async function markNotificationRead(notificationId) {
  await updateDoc(doc(db, 'notifications', notificationId), { read: true });
}

export async function markAllNotificationsRead(notifications) {
  const unread = notifications.filter((notification) => !notification.read);
  for (let start = 0; start < unread.length; start += 500) {
    const batch = writeBatch(db);
    unread.slice(start, start + 500).forEach((notification) => {
      batch.update(doc(db, 'notifications', notification.id), { read: true });
    });
    await batch.commit();
  }
}

export function subscribeToAllStudentRequests(callback, onError) {
  return watchCollection('serviceRequests', callback, onError);
}

export function subscribeToPublicInquiries(callback, onError) {
  return watchCollection('publicInquiries', callback, onError);
}

export function subscribeToServices(callback, onError) {
  return watchCollection('services', callback, onError);
}

export async function cancelStudentRequest(requestId) {
  await updateDoc(doc(db, 'serviceRequests', requestId), {
    status: 'Cancelled',
    updatedAt: serverTimestamp(),
  });
}

export async function setRequestStatus(requestId, status) {
  await updateDoc(doc(db, 'serviceRequests', requestId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteRequest(requestId) {
  await deleteDoc(doc(db, 'serviceRequests', requestId));
}

export async function setInquiryStatus(inquiryId, status) {
  await updateDoc(doc(db, 'publicInquiries', inquiryId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteInquiry(inquiryId) {
  await deleteDoc(doc(db, 'publicInquiries', inquiryId));
}
