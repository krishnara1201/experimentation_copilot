import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { AuthProvider } from '../context/AuthContext';

function TestApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/private" element={<div>Private page</div>} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => localStorage.clear());

  it('redirects unauthenticated users to login', async () => {
    render(
      <MemoryRouter initialEntries={['/private']}>
        <TestApp />
      </MemoryRouter>
    );

    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  it('allows authenticated users', async () => {
    localStorage.setItem('experimentation_copilot.token', 'x.y.z');
    render(
      <MemoryRouter initialEntries={['/private']}>
        <TestApp />
      </MemoryRouter>
    );

    expect(await screen.findByText('Private page')).toBeInTheDocument();
  });
});
