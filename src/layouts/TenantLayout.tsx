import { Outlet, useLocation, Link } from 'react-router-dom';
import { Home, CreditCard, Wrench, Receipt, User, Bell, Box } from 'lucide-react';

const navItems = [
  { label: 'HOME', path: '/tenant', icon: Home },
  { label: 'PAY', path: '/tenant/pay', icon: CreditCard },
  { label: 'REQUESTS', path: '/tenant/requests', icon: Wrench },
  { label: 'RECEIPTS', path: '/tenant/receipts', icon: Receipt },
  { label: 'PROFILE', path: '/tenant/profile', icon: User },
];

const TenantLayout = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/tenant') return location.pathname === '/tenant';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfaf6] font-sans">
      {/* Premium Header */}
      <header className="sticky top-0 z-40 bg-[#fcfaf6]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between max-w-lg mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1e4d2b] rounded-xl flex items-center justify-center">
            <Box className="h-5 w-5 text-white" />
          </div>
          <span className="font-black text-[#1e4d2b] tracking-tighter text-xl">BoardEase</span>
        </div>
        <button className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-[#1a1a1a] relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-6 pb-32 max-w-lg mx-auto w-full">
        <Outlet />
      </main>

      {/* Floating Pill Bottom Navigation */}
      <nav className="fixed bottom-6 left-6 right-6 z-50 flex justify-center pointer-events-none">
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-[2rem] px-4 py-2 flex items-center justify-around w-full max-w-sm pointer-events-auto">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl transition-all duration-300 ${
                  active
                    ? 'bg-[#f1f3ef] text-[#1e4d2b]'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <item.icon className={`h-5 w-5 ${active ? 'fill-current' : ''}`} />
                <span className="text-[8px] font-black tracking-widest leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default TenantLayout;
