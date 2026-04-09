import { LayoutGrid, DoorOpen, Users, Ticket, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const items = [
  { title: 'DASHBOARD', url: '/landlord', icon: LayoutGrid },
  { title: 'ROOMS', url: '/landlord/rooms', icon: DoorOpen },
  { title: 'TENANTS', url: '/landlord/tenants', icon: Users },
  { title: 'TICKETS', url: '/landlord/tickets', icon: Ticket },
  { title: 'SETTINGS', url: '/landlord/settings', icon: Settings },
];

export function LandlordBottomNav() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#fcfaf6]/95 backdrop-blur-md px-4 py-6 z-50">
      <div className="flex justify-between items-center max-w-4xl mx-auto bg-white rounded-[2rem] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-gray-100">
        {items.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end={item.url === '/landlord'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center transition-all duration-300 ${
                isActive 
                  ? 'bg-[#1e4d2b] text-white rounded-[1.5rem] px-4 py-2 shadow-lg shadow-emerald-900/20' 
                  : 'text-gray-400 hover:text-[#1e4d2b] px-3'
              }`
            }
          >
            <item.icon className={`w-5 h-5 ${item.title === 'SETTINGS' ? 'animate-spin-slow' : ''}`} />
            <span className="text-[8px] font-black tracking-tighter mt-1 uppercase leading-none">{item.title}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
