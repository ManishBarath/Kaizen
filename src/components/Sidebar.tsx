import { CalendarRange, Calendar, ChevronLeft, ChevronRight, Activity, StickyNote, Moon, Sun, LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';

export const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('USER_ID');
    // Clear any other auth tokens here if needed
    navigate('/auth');
  };

  const toggleDark = () => {
    const root = document.documentElement;
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  const items = [
    { id: 'monthly', icon: Calendar, label: 'Monthly Tracker', path: '/monthly' },
    { id: 'daily', icon: Calendar, label: 'Daily Journal', path: '/daily' },
    { id: 'goals', icon: CalendarRange, label: 'Goals', path: '/goals' },
    { id: 'whiteboard', icon: StickyNote, label: 'Whiteboard', path: '/whiteboard' },
  ];

  return (
    <aside 
      className={`${
        isCollapsed ? 'md:w-20' : 'md:w-72'
      } bg-white backdrop-blur-xl text-slate-800 flex md:flex-col shrink-0 fixed bottom-0 w-full h-16 md:h-screen md:sticky md:top-0 border-t md:border-t-0 md:border-r border-slate-200 shadow-[0_-4px_24px_rgba(0,0,0,0.02)] md:shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300 ease-in-out z-50`}
    >
      <div className="hidden md:flex p-6 items-center justify-between">
        {!isCollapsed && (
          <h2 className="text-2xl font-black bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2 tracking-tight">
            <Activity className="w-6 h-6 text-blue-600" />
            Compound
          </h2>
        )}
        {isCollapsed && (
          <div className="w-full flex justify-center">
            <Activity className="w-8 h-8 text-blue-600" />
          </div>
        )}
      </div>

      <nav className="flex-1 flex md:flex-col justify-around px-2 md:px-4 md:mt-6 items-center md:items-stretch h-full">
        {items.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-4'} py-2 md:py-3.5 rounded-xl md:rounded-2xl transition-all duration-300 ${
                isActive 
                  ? 'bg-blue-50 text-blue-700 shadow-sm font-semibold' 
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 font-medium'
              } ${isCollapsed && !isActive ? 'px-3' : 'px-4'}`
            }
            title={isCollapsed ? item.label : undefined}
          >
            {({ isActive }) => {
              const Icon = item.icon;
              return (
                <>
                  <div className={`${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {!isCollapsed && <span className="hidden md:inline">{item.label}</span>}
                </>
              );
            }}
          </NavLink>
        ))}
      </nav>

      {/* Collapse Toggle & Theme Toggle */}
      <div className="hidden md:flex p-4 border-t border-slate-100 dark:border-slate-800 flex-col gap-2">
        <button 
          onClick={handleLogout}
          className="p-2 rounded-xl text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900 transition-colors w-full flex justify-center mt-auto"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>

        <button 
          onClick={toggleDark}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors w-full flex justify-center"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors w-full flex justify-center"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
    </aside>
  );
};
