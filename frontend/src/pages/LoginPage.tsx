import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/ui/Button';
import ErrorBanner from '../components/ui/ErrorBanner';
import Field from '../components/ui/Field';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(identifier, password);
      navigate('/experiments');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to log in.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to continue to your experiments.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Username or email"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          required
          autoFocus
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error && <ErrorBanner message={error} />}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        No account?{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Register
        </Link>
      </p>
    </AuthLayout>
  );
}
