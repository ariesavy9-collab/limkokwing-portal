const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { logger } = require('firebase-functions');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

initializeApp();

const auth = getAuth();
const db = getFirestore();
const namePattern = /^[A-Za-zÀ-ÖØ-öø-ÿ'’.-]+(?: [A-Za-zÀ-ÖØ-öø-ÿ'’.-]+)*$/;

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

exports.createStaffAccount = onCall({ region: 'us-central1' }, async (request) => {
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Only authorized university staff can create staff accounts.');
  }

  const name = typeof request.data?.name === 'string' ? request.data.name.trim() : '';
  const email = typeof request.data?.email === 'string' ? request.data.email.trim().toLowerCase() : '';
  const password = typeof request.data?.password === 'string' ? request.data.password : '';

  if (name.length < 2 || name.length > 100 || !namePattern.test(name)) {
    throw new HttpsError('invalid-argument', 'Enter a name using letters, spaces, apostrophes, periods, or hyphens (2–100 characters).');
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Enter a valid work email address.');
  }
  if (password.length < 12 || password.length > 128) {
    throw new HttpsError('invalid-argument', 'The temporary password must be between 12 and 128 characters.');
  }

  let userRecord;
  try {
    userRecord = await auth.createUser({
      displayName: name,
      email,
      password,
      emailVerified: false,
      disabled: false,
    });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'An account already exists for that email address.');
    }
    logger.error('Could not create a staff account.', { code: error.code || 'unknown' });
    throw new HttpsError('internal', 'The staff account could not be created. Please try again.');
  }

  try {
    const existingUser = await auth.getUser(userRecord.uid);
    await auth.setCustomUserClaims(userRecord.uid, {
      ...existingUser.customClaims,
      admin: true,
    });
  } catch (error) {
    try {
      await auth.deleteUser(userRecord.uid);
    } catch (cleanupError) {
      logger.error('Could not remove a partially provisioned staff account.', {
        uid: userRecord.uid,
        code: cleanupError.code || 'unknown',
      });
    }
    logger.error('Could not assign staff permissions.', {
      uid: userRecord.uid,
      code: error.code || 'unknown',
    });
    throw new HttpsError('internal', 'The account could not be granted staff access. Please try again.');
  }

  logger.info('Staff account provisioned.', { uid: userRecord.uid });
  return { uid: userRecord.uid, email: userRecord.email };
});
