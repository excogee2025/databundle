import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Wifi, Menu, X, User, LogOut, Shield, Bell, Briefcase } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath, ROLE_LABELS, ROLE_COLORS } from '../utils/roles';

export default function Navbar() {
  const { user, logout, isAdmin, isAgent, unreadCount } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setOpen(false);
  };

  const navLinkClass = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:text-brand-600 hover:bg-slate-50'
    }`;

  const dashPath = user ? getDashboardPath(user) : '/dashboard';

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/25 group-hover:scale-105 transition-transform">
              <Wifi className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-lg leading-none">DataBundle</span>
              <span className="block text-[10px] font-semibold text-brand-600 tracking-wider uppercase">Ghana</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>Home</NavLink>
            <NavLink to="/bundles" className={navLinkClass}>Buy Data</NavLink>
            <NavLink to="/track" className={navLinkClass}>Track</NavLink>
            {user && <NavLink to={dashPath} className={navLinkClass}>{isAgent ? 'Agent Portal' : isAdmin ? 'Admin' : 'Dashboard'}</NavLink>}
            {user && <NavLink to="/wallet" className={navLinkClass}>Wallet</NavLink>}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-slate-100">
                  <Bell className="w-4 h-4 text-slate-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100">
                  <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center">
                    {isAdmin ? <Shield className="w-3.5 h-3.5 text-brand-600" /> : isAgent ? <Briefcase className="w-3.5 h-3.5 text-brand-600" /> : <User className="w-3.5 h-3.5 text-brand-600" />}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-700">{user.name.split(' ')[0]}</span>
                    <span className={`block text-[9px] font-bold uppercase px-1 rounded ${ROLE_COLORS[user.role]}`}>{ROLE_LABELS[user.role]}</span>
                  </div>
                </div>
                <button onClick={handleLogout} className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50" title="Logout">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-brand-600 px-3 py-2">Sign in</Link>
                <Link to="/register" className="text-sm font-semibold bg-brand-600 text-white px-4 py-2 rounded-xl hover:bg-brand-700 shadow-sm">Get Started</Link>
              </>
            )}
          </div>

          <button className="md:hidden p-2 rounded-lg hover:bg-slate-100" onClick={() => setOpen(!open)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {open && (
          <nav className="md:hidden py-4 border-t border-slate-100 flex flex-col gap-1 animate-fade-in">
            <NavLink to="/" end className={navLinkClass} onClick={() => setOpen(false)}>Home</NavLink>
            <NavLink to="/bundles" className={navLinkClass} onClick={() => setOpen(false)}>Buy Data</NavLink>
            <NavLink to="/track" className={navLinkClass} onClick={() => setOpen(false)}>Track</NavLink>
            {user && <NavLink to={dashPath} className={navLinkClass} onClick={() => setOpen(false)}>Dashboard</NavLink>}
            {user && <NavLink to="/wallet" className={navLinkClass} onClick={() => setOpen(false)}>Wallet</NavLink>}
            {user && <NavLink to="/notifications" className={navLinkClass} onClick={() => setOpen(false)}>Notifications</NavLink>}
            {user && <NavLink to="/support" className={navLinkClass} onClick={() => setOpen(false)}>Support</NavLink>}
            {!user ? (
              <div className="flex gap-2 pt-3 mt-2 border-t border-slate-100">
                <Link to="/login" className="flex-1 text-center py-2.5 rounded-xl border border-slate-200 text-sm font-medium" onClick={() => setOpen(false)}>Sign in</Link>
                <Link to="/register" className="flex-1 text-center py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold" onClick={() => setOpen(false)}>Register</Link>
              </div>
            ) : (
              <button onClick={handleLogout} className="mt-2 flex items-center gap-2 px-3 py-2.5 text-red-600 text-sm font-medium">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
