import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/testUtils';
import { LoginPage } from './LoginPage';

const loginWithToken = vi.fn().mockResolvedValue(undefined);

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    status: 'unauthenticated',
    user: null,
    loginWithToken,
    loginWithPassword: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe('LoginPage', () => {
  it('shows the developer-token form when Supabase is not configured', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByLabelText(/developer token/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();
  });

  it('submits the pasted token and signs in', async () => {
    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/developer token/i), {
      target: { value: 'a-fake-jwt-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(loginWithToken).toHaveBeenCalledWith('a-fake-jwt-token'));
  });

  it('disables the sign-in button until a token is entered', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
  });
});
