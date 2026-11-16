const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { logger } = require('firebase-functions');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

initializeApp();

const auth = getAuth();
const db = getFirestore();

async function createNotification(eventId, notification) {
  try {
    await db.collection('notifications').doc(eventId).create({
      ...notification,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    if (error.code !== 6 && error.code !== 'already-exists') throw error;
  }
}

exports.notifyOnRequestCreated = onDocumentCreated({
  document: 'serviceRequests/{requestId}',
  region: 'us-central1',
}, async (event) => {
  const request = event.data?.data();
  if (!request?.ownerUid) return;

  await createNotification(event.id, {
    ownerUid: request.ownerUid,
    type: 'request',
    requestId: event.params.requestId,
    title: 'Request submitted',
    message: `Your request for ${request.service || 'a university service'} was submitted and is pending review.`,
  });
});

exports.notifyOnRequestStatusChanged = onDocumentUpdated({
  document: 'serviceRequests/{requestId}',
  region: 'us-central1',
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after || before.status === after.status || !after.ownerUid) return;

  const service = after.service || 'your university service request';
  const statusMessages = {
    Accepted: {
      title: 'Request approved',
      message: `Your request for ${service} has been approved.`,
    },
    'In Progress': {
      title: 'Request in progress',
      message: `Your request for ${service} is now being processed.`,
    },
    Completed: {
      title: 'Request completed',
      message: `Your request for ${service} has been completed.`,
    },
    Rejected: {
      title: 'Request not approved',
      message: `Your request for ${service} was not approved.`,
    },
    Cancelled: {
      title: 'Request cancelled',
      message: `Your request for ${service} has been cancelled.`,
    },
    Pending: {
      title: 'Request status updated',
      message: `Your request for ${service} is pending review.`,
    },
  };
  const notification = statusMessages[after.status];
  if (!notification) return;

  await createNotification(event.id, {
    ...notification,
    ownerUid: after.ownerUid,
    type: 'request',
    requestId: event.params.requestId,
  });
});

exports.notifyOnProfileCreated = onDocumentCreated({
  document: 'users/{userId}',
  region: 'us-central1',
}, async (event) => {
  const profile = event.data?.data();
  if (!profile) return;

  await createNotification(event.id, {
    ownerUid: event.params.userId,
    type: 'profile',
    title: 'Student profile ready',
    message: 'Your student profile is ready. You can update your details from the student dashboard.',
  });
});

exports.notifyOnProfileUpdated = onDocumentUpdated({
  document: 'users/{userId}',
  region: 'us-central1',
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;

  const changedProfile = ['name', 'studentId', 'phone'].some((field) => before[field] !== after[field]);
  if (!changedProfile) return;

  await createNotification(event.id, {
    ownerUid: event.params.userId,
    type: 'profile',
    title: 'Student profile updated',
    message: 'Your student profile details were updated successfully.',
  });
});

exports.grantAdminAccess = onCall({ region: 'us-central1' }, async (request) => {
  const callerEmail = request.auth?.token?.email?.toLowerCase();
  const callerRecord = callerEmail
    ? await db.collection('adminUsers').doc(callerEmail).get()
    : null;
  if (request.auth?.token?.admin !== true || !callerRecord?.exists) {
    throw new HttpsError('permission-denied', 'Only authorized university staff can grant admin access.');
  }

  const email = typeof request.data?.email === 'string' ? request.data.email.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Enter a valid Google account email address.');
  }

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'This Google account has not signed in yet. Ask the user to sign in once, then add them as an admin.');
    }
    logger.error('Could not find the requested Google account.', { code: error.code || 'unknown' });
    throw new HttpsError('internal', 'The Google account could not be found. Please try again.');
  }

  try {
    await db.collection('adminUsers').doc(email).set({
      email,
      name: userRecord.displayName || email,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    await auth.setCustomUserClaims(userRecord.uid, {
      ...userRecord.customClaims,
      admin: true,
    });
  } catch (error) {
    logger.error('Could not grant admin access.', {
      uid: userRecord.uid,
      code: error.code || 'unknown',
    });
    throw new HttpsError('internal', 'Admin access could not be granted. Please try again.');
  }

  logger.info('Admin access granted.', { uid: userRecord.uid });
  return { uid: userRecord.uid, email: userRecord.email };
});
