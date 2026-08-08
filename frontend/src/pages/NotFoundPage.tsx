import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="mx-auto mt-24 max-w-sm text-center">
      <h1 className="mb-2 text-2xl font-semibold">Page not found</h1>
      <p className="mb-6 text-sm text-slate-600">The page you're looking for doesn't exist.</p>
      <Link to="/experiments" className="text-primary hover:underline">
        Back to experiments
      </Link>
    </div>
  );
}
