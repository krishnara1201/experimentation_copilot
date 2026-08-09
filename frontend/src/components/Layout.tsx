import { Beaker, FlaskConical, LogOut, Upload } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/experiments', label: 'Experiments', icon: Beaker },
  { to: '/upload', label: 'Upload', icon: Upload },
];

export default function Layout() {
  const { logout, username } = useAuth();
  const initial = username ? username.charAt(0).toUpperCase() : '?';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <FlaskConical className="h-5 w-5 text-primary" />
            Experimentation Copilot
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-primary-50 text-primary' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
            <div className="ml-3 flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary">
                {initial}
              </div>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
