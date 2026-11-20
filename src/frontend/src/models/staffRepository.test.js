jest.mock('firebase/firestore', () => ({
  doc: jest.fn((...parts) => parts),
  serverTimestamp: jest.fn(() => 'server-timestamp'),
  setDoc: jest.fn(),
}));

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(),
}));

jest.mock('./firebase', () => ({
  auth: { currentUser: { email: 'staff@example.com' } },
  db: {},
  firebaseApp: {},
}));

import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { grantAdminAccess } from './staffRepository';

beforeEach(() => {
  jest.clearAllMocks();
  doc.mockImplementation((...parts) => parts);
  serverTimestamp.mockReturnValue('server-timestamp');
});

test('granting admin access creates the normalized adminUsers record directly', async () => {
  await grantAdminAccess(' NewAdmin@Example.com ');

  expect(doc).toHaveBeenCalledWith({}, 'adminUsers', 'newadmin@example.com');
  expect(setDoc).toHaveBeenCalledWith(
    [{}, 'adminUsers', 'newadmin@example.com'],
    {
      email: 'newadmin@example.com',
      name: 'newadmin@example.com',
      updatedAt: 'server-timestamp',
    },
    { merge: true },
  );
  expect(serverTimestamp).toHaveBeenCalledTimes(1);
});

test('granting admin access rejects invalid email before writing', async () => {
  await expect(grantAdminAccess('not-an-email'))
    .rejects.toThrow('Enter a valid Google account email address.');

  expect(setDoc).not.toHaveBeenCalled();
});
