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
    await db.collection('notifications').doc(`${eventId}-${notification.ownerUid}`).create({
      ...notification,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    if (error.code !== 6 && error.code !== 'already-exists') throw error;
  }
}

async function getAdminUid(adminDocument) {
  const record = adminDocument.data();
  if (typeof record.uid === 'string' && record.uid) return record.uid;

  const email = (typeof record.email === 'string' ? record.email : adminDocument.id).trim().toLowerCase();
  try {
    const user = await auth.getUserByEmail(email);
    return user.uid;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      logger.warn('Admin notification skipped because the account was not found.', { email });
      return null;
    }
    throw error;
  }
}

async function deleteMatchingDocuments(query) {
  let deleted = 0;
  while (true) {
    const snapshot = await query.limit(400).get();
    if (snapshot.empty) return deleted;
    const batch = db.batch();
    snapshot.docs.forEach((item) => batch.delete(item.ref));
    await batch.commit();
    deleted += snapshot.size;
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

  const administrators = await db.collection('adminUsers').get();
  const adminUids = await Promise.all(administrators.docs.map(getAdminUid));
  await Promise.all(adminUids.filter(Boolean).map((uid) => createNotification(event.id, {
    ownerUid: uid,
    type: 'request',
    requestId: event.params.requestId,
    title: 'New student application',
    message: `${request.studentName || 'A student'} submitted a request for ${request.service || 'a university service'}.`,
  })));
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
    message: 'Your student profile is ready. You can view your details from the student dashboard; contact Student Affairs if anything needs correction.',
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

exports.deleteStudentRecord = onCall({
  region: 'us-central1',
  timeoutSeconds: 540,
}, async (request) => {
  const callerEmail = request.auth?.token?.email?.toLowerCase();
  const callerRecord = callerEmail
    ? await db.collection('adminUsers').doc(callerEmail).get()
    : null;
  if (!callerRecord?.exists) {
    throw new HttpsError('permission-denied', 'Only authorized university staff can remove students.');
  }

  const email = typeof request.data?.email === 'string' ? request.data.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new HttpsError('invalid-argument', 'Enter a valid student email address.');
  }
  if (email === callerEmail) {
    throw new HttpsError('failed-precondition', 'You cannot remove your own administrator account.');
  }

  const directoryRef = db.collection('studentDirectory').doc(email);
  let directory;
  let adminRecord;
  try {
    [directory, adminRecord] = await Promise.all([
      directoryRef.get(),
      db.collection('adminUsers').doc(email).get(),
    ]);
  } catch (error) {
    logger.error('Could not verify the student record before removal.', {
      code: error.code || 'unknown',
    });
    throw new HttpsError('internal', 'The student record could not be verified. Please try again.');
  }
  if (!directory.exists) throw new HttpsError('not-found', 'The student record was not found.');
  if (adminRecord.exists) throw new HttpsError('failed-precondition', 'This account has administrator access and cannot be removed as a student.');

  let userRecord = null;
  try {
    userRecord = await auth.getUserByEmail(email);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      logger.error('Could not look up the student account.', { code: error.code || 'unknown' });
      throw new HttpsError('internal', 'The student account could not be checked. Please try again.');
    }
  }

  let failureStage = 'related student records';
  try {
    const cleanupQueries = [
      db.collection('studentLetters').where('studentEmail', '==', email),
    ];
    if (userRecord) {
      cleanupQueries.push(
        db.collection('serviceRequests').where('ownerUid', '==', userRecord.uid),
        db.collection('notifications').where('ownerUid', '==', userRecord.uid),
      );
    }
    await Promise.all(cleanupQueries.map(deleteMatchingDocuments));
    failureStage = 'student profile';
    if (userRecord) await db.collection('users').doc(userRecord.uid).delete();
    failureStage = 'sign-in account';
    if (userRecord) {
      try {
        await auth.deleteUser(userRecord.uid);
      } catch (error) {
        if (error.code !== 'auth/user-not-found') throw error;
      }
    }
    failureStage = 'student directory';
    await directoryRef.delete();
  } catch (error) {
    logger.error('Could not fully remove the student record.', {
      stage: failureStage,
      uid: userRecord?.uid || 'unlinked',
      code: error.code || 'unknown',
      message: error.message || 'No additional error details.',
    });
    throw new HttpsError(
      'internal',
      `Student deletion failed while removing ${failureStage}. Please retry. If the problem persists, contact support.`,
    );
  }

  logger.info('Student record removed.', { uid: userRecord?.uid || 'unlinked' });
  return { email };
});
