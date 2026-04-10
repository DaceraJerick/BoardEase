import { useEffect, useState } from 'react'; // v2
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  Megaphone, 
  Banknote, 
  Receipt, 
  Wrench, 
  Bell, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  TrendingUp,
  History,
  Info
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Payment, Announcement, Tenant, Ticket, Profile } from '@/types/database';
import { JoinBoardingHouse } from '@/components/tenant/JoinBoardingHouse';
import { RoomSelection } from '@/components/tenant/RoomSelection';
import { formatDistanceToNow, format, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'payment' | 'ticket';
  title: string;
  subtitle: string;
  status: string;
  timestamp: string;
  amount?: number;
}

const TenantHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [balance, setBalance] = useState({ total: 0, nextDue: null as string | null, progress: 0, daysRemaining: 0 });
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<'loading' | 'no-bh' | 'no-room' | 'ready'>('loading');

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // 1. Fetch Tenant & Profile data separately to avoid relation errors
    const [tenantRes, profileRes] = await Promise.all([
      supabase.from('tenants').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    ]);

    if (!tenantRes.data) {
      setState('no-bh');
      setLoading(false);
      return;
    }

    const t = tenantRes.data;
    setProfile(profileRes.data);

    // 2. Fetch Room data
    if (t.room_id) {
       const { data: rd } = await supabase.from('rooms').select('*').eq('id', t.room_id).maybeSingle();
       setTenant({ ...t, rooms: rd });
    } else {
       setTenant(t);
       setState('no-room');
       setLoading(false);
       return;
    }

    setState('ready');

    // 3. Fetch Payments, Tickets, and Announcements
    const [payRes, tickRes, annRes] = await Promise.all([
      supabase.from('payments').select('*').eq('tenant_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('tickets').select('*').eq('tenant_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('announcements').select('*').eq('boarding_house_id', t.boarding_house_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const payments = payRes.data || [];
    const tickets = tickRes.data || [];
    setAnnouncement(annRes.data);

    // 4. Calculate Live Balance & Cycle Progress
    const unpaid = payments.filter(p => p.status !== 'paid');
    const totalBalance = unpaid.reduce((sum, p) => sum + p.amount, 0);
    const primaryUnpaid = unpaid.length > 0 ? unpaid[0] : null;

    // Billing Cycle Logic:
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const totalDays = differenceInDays(monthEnd, monthStart) || 30;
    const elapsedDays = differenceInDays(now, monthStart);
    const progress = Math.min(Math.max((elapsedDays / totalDays) * 100, 5), 100);

    const daysRemaining = primaryUnpaid 
      ? differenceInDays(new Date(primaryUnpaid.due_date), now)
      : differenceInDays(monthEnd, now);
    
    setBalance({ 
      total: totalBalance, 
      nextDue: primaryUnpaid?.due_date || null,
      progress: Math.round(progress),
      daysRemaining: Math.max(daysRemaining, 0)
    });

    // 5. Format Activities
    const pActs: ActivityItem[] = payments.map(p => ({
      id: p.id,
      type: 'payment',
      title: `Rent Payment - ${format(new Date(p.created_at), 'MMMM')}`,
      subtitle: p.status === 'paid' ? 'Successfully processed' : `Due ${format(new Date(p.due_date), 'MMM d')}`,
      status: p.status,
      timestamp: p.created_at,
      amount: p.amount
    }));

    const tActs: ActivityItem[] = tickets.map(t => ({
      id: t.id,
      type: 'ticket',
      title: t.title,
      subtitle: t.status === 'new' ? 'Awaiting assignment' : t.status === 'assigned' ? 'Technician assigned' : t.status.replace('_', ' '),
      status: t.status,
      timestamp: t.created_at
    }));

    const combined = [...pActs, ...tActs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 3);

    setActivities(combined);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Tag the device for push notifications if inside the Median APK
  useEffect(() => {
    if (tenant?.boarding_house_id) {
      if (typeof window !== 'undefined' && navigator.userAgent.toLowerCase().includes('median')) {
        window.location.href = `median://onesignal/tags?tags={"boarding_house_id":"${tenant.boarding_house_id}"}`;
      }
    }
  }, [tenant?.boarding_house_id]);

  if (loading && state === 'loading') {
    return (
      <div className="space-y-6 pt-4 max-w-lg mx-auto w-full">
        <Skeleton className="h-40 rounded-[2.5rem]" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>
        <Skeleton className="h-60 rounded-[3rem]" />
      </div>
    );
  }

  if (state === 'no-bh') {
    return <JoinBoardingHouse onJoined={() => { setState('loading'); setLoading(true); fetchData(); }} />;
  }

  if (state === 'no-room' && tenant) {
    return (
      <RoomSelection
        tenantId={tenant.id}
        boardingHouseId={tenant.boarding_house_id}
        onRoomSelected={() => { setState('loading'); setLoading(true); fetchData(); }}
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-lg mx-auto w-full">
      {/* Greeting & Room Badge */}
      <div className="flex items-end justify-between pt-4">
        <div>
          <p className="text-[10px] font-black tracking-widest text-[#a07d50] uppercase mb-1">Welcome back,</p>
          <h2 className="text-3xl font-black text-[#1a1a1a] tracking-tight">Hello, {profile?.full_name?.split(' ')[0] || 'User'}</h2>
        </div>
        <div className="bg-[#1e4d2b]/5 px-4 py-2 rounded-2xl border border-[#1e4d2b]/10">
           <span className="text-[10px] font-black text-[#1e4d2b] uppercase tracking-widest">{tenant?.rooms?.name || 'Unassigned'}</span>
        </div>
      </div>

      {/* Real-time Status Card */}
      <Card className="rounded-[2.5rem] border-0 shadow-2xl shadow-emerald-900/10 bg-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[5rem] -mr-8 -mt-8 opacity-40 animate-pulse" />
        <CardContent className="p-8 relative z-10">
          <div className="flex items-center justify-between mb-8">
             <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Balance</p>
                <div className="flex items-baseline gap-1">
                   <h3 className="text-4xl font-black text-[#1e4d2b] tracking-tighter">₱{balance.total.toLocaleString()}</h3>
                   <span className="text-[10px] font-bold text-gray-300">.00</span>
                </div>
             </div>
             {balance.total > 0 && (
                <Badge className="bg-amber-100 text-amber-600 hover:bg-amber-100 border-0 rounded-full px-4 py-1.5 flex items-center gap-1.5 animate-bounce">
                  <Clock className="h-3 w-3 fill-current" />
                  <span className="text-[9px] font-black uppercase tracking-wider">Due Soon</span>
                </Badge>
             )}
          </div>

          <div className="flex items-center gap-5 mb-8">
             <div className="relative w-14 h-14 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-gray-50" />
                  <circle 
                    cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="5" fill="transparent" 
                    strokeDasharray={150.8} 
                    strokeDashoffset={150.8 - (150.8 * balance.progress / 100)} 
                    className="text-[#1e4d2b] transition-all duration-1000 ease-out" 
                  />
                </svg>
                <span className="absolute text-[10px] font-black text-[#1e4d2b]">{balance.progress}%</span>
             </div>
             <div>
                <p className="text-xs font-black text-[#1a1a1a]">
                  {balance.nextDue ? `Due ${format(new Date(balance.nextDue), 'MMMM d, yyyy')}` : 'Settled for the current month'}
                </p>
                <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                  {balance.daysRemaining > 0 ? `${balance.daysRemaining} days remaining in cycle` : 'Monthly cycle completed'}
                </p>
             </div>
          </div>

          <Button 
            onClick={() => navigate('/tenant/pay')} 
            disabled={balance.total === 0}
            className={`w-full h-16 rounded-2xl font-black text-sm shadow-xl transition-all ${
              balance.total > 0 
                ? 'bg-[#1e4d2b] hover:bg-[#163a20] text-white shadow-emerald-900/20' 
                : 'bg-gray-100 text-gray-300 shadow-none cursor-not-allowed'
            }`}
          >
            {balance.total > 0 ? 'Pay Now' : 'All Settled'}
          </Button>
        </CardContent>
      </Card>

      {/* Dashboard Shortcut Grid */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Pay Rent', icon: Banknote, color: 'text-blue-500', bg: 'bg-blue-50', path: '/tenant/pay' },
          { label: 'My Receipts', icon: Receipt, color: 'text-emerald-500', bg: 'bg-emerald-50', path: '/tenant/receipts' },
          { label: 'Report Issue', icon: Wrench, color: 'text-amber-500', bg: 'bg-amber-50', path: '/tenant/requests' },
          { label: 'Notices', icon: Megaphone, color: 'text-gray-500', bg: 'bg-gray-50', path: '/tenant' },
        ].map((item) => (
          <button 
            key={item.label}
            onClick={() => navigate(item.path)}
            className="bg-white p-6 rounded-[2.5rem] flex flex-col items-center gap-3 shadow-sm border border-gray-100/50 hover:shadow-md transition-all active:scale-95"
          >
            <div className={`w-12 h-12 rounded-2xl ${item.bg} flex items-center justify-center`}>
              <item.icon className={`h-6 w-6 ${item.color}`} />
            </div>
            <span className="text-xs font-black text-[#1a1a1a] tracking-tight uppercase leading-none mt-1">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Consolidated Activity Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
           <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-[#1a1a1a] tracking-tight">Recent Activity</h3>
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
           </div>
           <button onClick={() => navigate('/tenant/receipts')} className="text-[10px] font-black text-[#a07d50] uppercase tracking-[0.2em] hover:text-[#1e4d2b]">See All</button>
        </div>
        
        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="py-12 bg-white rounded-[2rem] border border-gray-50 flex flex-col items-center justify-center text-center italic">
               <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                  <History className="h-6 w-6 text-gray-200" />
               </div>
               <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest">No activity yet</p>
            </div>
          ) : activities.map((act) => (
            <div key={act.id} className="bg-white p-5 rounded-[2.5rem] flex items-center gap-4 shadow-sm border border-transparent hover:border-gray-100/50 active:scale-[0.98] transition-all group">
               <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                 act.type === 'payment' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
               }`}>
                  {act.type === 'payment' && <CheckCircle2 className="h-6 w-6" />}
                  {act.type === 'ticket' && <Wrench className="h-6 w-6" />}
               </div>
               <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-[#1a1a1a] leading-tight truncate">{act.title}</p>
                  <p className={`text-[9px] font-bold mt-1 uppercase tracking-tighter ${
                    act.status === 'paid' ? 'text-emerald-500' : 'text-gray-400'
                  }`}>{act.subtitle}</p>
               </div>
               <div className="flex items-center gap-2">
                  {act.amount && <span className="text-xs font-black text-[#1a1a1a]">₱{act.amount.toLocaleString()}</span>}
                  <ChevronRight className="h-4 w-4 text-gray-200 group-hover:text-[#1e4d2b] group-hover:translate-x-1 transition-all" />
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Community Highlight */}
      <Card className="rounded-[3rem] border-0 shadow-sm bg-white overflow-hidden group cursor-pointer active:scale-[0.98] transition-all relative">
        <div className="relative h-72 overflow-hidden">
          <img 
            src={`https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1000`} 
            alt="Property Highlight" 
            className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-[2000ms]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1e4d2b] via-black/30 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-6 left-8 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30 flex items-center gap-2">
             <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
             <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Featured Notice</span>
          </div>
          <div className="absolute bottom-10 left-10 right-10">
             <p className="text-[9px] font-black text-emerald-200 uppercase tracking-[0.25em] mb-2">{announcement?.title?.toUpperCase() || 'COMMUNITY POLICY'}</p>
             <h4 className="text-2xl font-black text-white leading-tight mb-3">New Quiet Hours Policy</h4>
             <p className="text-xs font-medium text-white/70 leading-relaxed max-w-[200px]">
               {announcement?.content?.substring(0, 80) || 'Ensuring a peaceful stay for everyone starting March 12th.'}...
             </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TenantHome;
