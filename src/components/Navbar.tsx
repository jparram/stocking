import { Link, useLocation } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';

const NAV_LINKS = [
  { to: '/', label: 'Dashboard', icon: '🏠' },
  { to: '/stocking-guide', label: 'Guide', icon: '📋' },
  { to: '/list/new', label: 'New List', icon: '➕' },
  { to: '/recipes', label: 'Recipes', icon: '🍳' },
  { to: '/history', label: 'History', icon: '📊' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Navbar() {
  const location = useLocation();
  const { signOut, user } = useAuthenticator((context) => [context.user]);

  const userEmail = user?.signInDetails?.loginId ?? user?.username ?? '';

  return (
    <nav className="bg-white border-b border-brand-border sticky top-0 z-50 shadow-sm">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-brand-text">
            <span className="text-2xl">🛒</span>
            <span className="hidden sm:block">Family Grocery Tracker</span>
            <span className="sm:hidden">Grocery</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => {
              const isActive = link.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-sams text-white'
                      : 'text-brand-muted hover:bg-brand-bg hover:text-brand-text'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {userEmail && (
              <span className="px-3 py-2 text-sm text-brand-muted truncate max-w-[160px]" title={userEmail}>
                {userEmail}
              </span>
            )}
            <button
              onClick={signOut}
              className="px-3 py-2 rounded-md text-sm font-medium text-brand-muted hover:bg-brand-bg hover:text-brand-text transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Mobile Bottom Nav */}
        <div className="md:hidden flex items-center justify-around border-t border-brand-border fixed bottom-0 left-0 right-0 bg-white z-50 py-2">
          {NAV_LINKS.map(link => {
            const isActive = link.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex flex-col items-center text-xs gap-0.5 px-2 ${
                  isActive ? 'text-sams font-semibold' : 'text-brand-muted'
                }`}
              >
                <span className="text-lg">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
          <button
            onClick={signOut}
            className="flex flex-col items-center text-xs gap-0.5 px-2 text-brand-muted"
          >
            <span className="text-lg">🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
