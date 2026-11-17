import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Login } from '../pages/Login';

// Mock AuthContext
const mockLogin = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    isAuthenticated: false,
    loading: false,
  }),
}));

describe('Authentication Flow & Login UI', () => {
  it('renders login form with medical credential inputs and demo profiles', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    expect(screen.getByText(/Privacy-Aware Remote Patient Monitoring/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/clinician@hospital-rpm.org/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In to Clinical Portal/i })).toBeInTheDocument();
  });

  it('allows clicking quick-fill demo roles to populate credentials', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const adminButton = screen.getByText('Chief Administrator');
    fireEvent.click(adminButton);

    const emailInput = screen.getByPlaceholderText(/clinician@hospital-rpm.org/i) as HTMLInputElement;
    expect(emailInput.value).toBe('admin@iomt-health.org');
  });

  it('submits login request when form is submitted', async () => {
    mockLogin.mockResolvedValueOnce({ success: true });

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const submitBtn = screen.getByRole('button', { name: /Sign In to Clinical Portal/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
  });
});
