import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AuthDialog from './AuthDialog';
import { getAuthErrorMessage, loginWithGoogle } from '../models/authRepository';

jest.mock('../models/authRepository', () => ({
  getAuthErrorMessage: jest.fn((error) => error.message),
  loginWithGoogle: jest.fn(),
}));

test('sign-in explains that unregistered users should contact Registry', async () => {
  const registryMessage = 'You are not registered for this portal. Contact Registry at registry@limkokwing.ac.ls for access.';
  loginWithGoogle.mockRejectedValue(
    new Error(registryMessage),
  );
  getAuthErrorMessage.mockReturnValue(registryMessage);
  render(<AuthDialog fullPage onSuccess={jest.fn()} />);

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
  });
  expect(loginWithGoogle).toHaveBeenCalledTimes(1);

  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(registryMessage));
  expect(screen.getByRole('link', { name: 'Contact Registry' })).toHaveAttribute('href', 'mailto:registry@limkokwing.ac.ls');
});
