import { FlaskConical } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export default function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen sm:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-12 text-white sm:flex">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
          <FlaskConical className="h-6 w-6" />
          Experimentation Copilot
        </Link>
        <div>
          <p className="text-2xl font-semibold leading-snug">
            Plan, run, and analyze A/B tests with statistical rigor.
          </p>
          <p className="mt-3 text-primary-100">
            Sample-size calculators, significance testing, and experiment tracking in one place.
          </p>
        </div>
        <span className="text-sm text-primary-200">© {new Date().getFullYear()} Experimentation Copilot</span>
      </div>
      <div className="flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 sm:hidden">
            <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <FlaskConical className="h-6 w-6 text-primary" />
              Experimentation Copilot
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
