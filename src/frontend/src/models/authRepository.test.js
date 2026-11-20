jest.mock('firebase/auth', () => ({
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({
    setCustomParameters: jest.fn(),
  })),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((...parts) => parts),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(),
}));

jest.mock('./firebase', () => ({
  auth: {},
  db: {},
}));

jest.mock('./portalRepository', () => ({
  ensureUserProfile: jest.fn(),
}));

import { getDoc, onSnapshot, doc } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { ensureUserProfile } from './portalRepository';
import { loginWithGoogle, subscribeToAdminAccess } from './authRepository';

beforeEach(() => {
  jest.clearAllMocks();
  GoogleAuthProvider.mockImplementation(() => ({
    setCustomParameters: jest.fn(),
  }));
  doc.mockImplementation((...parts) => parts);
});

test('admin access is based on the adminUsers record without a custom claim', async () => {
  const user = {
    email: 'Admin@Example.com',
    getIdTokenResult: jest.fn(),
  };
  signInWithPopup.mockResolvedValue({ user });
  getDoc
    .mockResolvedValueOnce({ exists: () => true })
    .mockResolvedValueOnce({ exists: () => false });

  await expect(loginWithGoogle()).resolves.toEqual({ user, isAdmin: true });

  expect(user.getIdTokenResult).not.toHaveBeenCalled();
  expect(ensureUserProfile).toHaveBeenCalledWith(user, {});
});

test('admin access subscription watches the normalized email document', () => {
  const onAccess = jest.fn();
  const onError = jest.fn();
  const unsubscribe = jest.fn();
  onSnapshot.mockImplementation((reference, options, callback) => {
    callback({ exists: () => true, metadata: { fromCache: false } });
    return unsubscribe;
  });

  const result = subscribeToAdminAccess(' Admin@Example.com ', onAccess, onError);

  expect(onSnapshot).toHaveBeenCalledWith(
    [{}, 'adminUsers', 'admin@example.com'],
    { includeMetadataChanges: true },
    expect.any(Function),
    onError,
  );
  expect(onAccess).toHaveBeenCalledWith(true, false);
  expect(result).toBe(unsubscribe);
});
