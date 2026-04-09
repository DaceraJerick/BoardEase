import { Outlet } from 'react-router-dom';
import { LandlordBottomNav } from '@/components/landlord/LandlordBottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { Bell } from 'lucide-react';

const LandlordLayout = () => {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfaf6]">
      {/* Premium Centered Header */}
      <header className="sticky top-0 z-50 bg-[#fcfaf6]/80 backdrop-blur-md px-6 py-4 border-b border-gray-50/50">
        <div className="max-w-4xl mx-auto flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
              <img 
                src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.full_name || 'landlord'}`} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          <h1 className="text-base font-bold text-[#1e4d2b] tracking-tight">BoardEase Residences</h1>
          
          <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm relative">
            <Bell className="h-5 w-5 text-[#1e4d2b]" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        </div>
      </header>

      <main className="flex-1 pb-32 max-w-4xl mx-auto w-full">
        <Outlet />
      </main>
      
      <LandlordBottomNav />
    </div>
  );
};

export default LandlordLayout;
