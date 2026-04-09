import { useEffect, useState } from 'react'; // v2
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { 
  DoorOpen, 
  Ticket, 
  Banknote, 
  CheckCircle2,
  Wrench,
  UserPlus,
  AlertTriangle,
  History,
  Megaphone as AnnounceIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'payment' | 'ticket' | 'tenant';
  title: string;
  subtitle: string;
  timestamp: string;
  amount?: number;
  status?: string;
}

const LandlordDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ revenue: 0, overdue: 0, vacant: 0, tickets: 0 });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const { data: bh } = await supabase.from('boarding_houses').select('id, name').eq('landlord_id', user.id).maybeSingle();
    if (!bh) { setLoading(false); return; }

    // Fetch base data
    const [paymentsRes, roomsRes, tenantsRes, ticketsRes] = await Promise.all([
      supabase.from('payments').select('*').eq('landlord_id', user.id).order('created_at', { ascending: false }),
      supabase.from('rooms').select('id, capacity').eq('boarding_house_id', bh.id),
      supabase.from('tenants').select('*').eq('landlord_id', user.id).order('created_at', { ascending: false }),
      supabase.from('tickets').select('*').eq('landlord_id', user.id).order('created_at', { ascending: false }),
    ]);

    const payments = paymentsRes.data || [];
    const rooms = roomsRes.data || [];
    const tenants = tenantsRes.data || [];
    const tickets = ticketsRes.data || [];

    // Fetch Profiles & Rooms separately to avoid join errors
    const userIds = Array.from(new Set([
      ...payments.map(p => p.tenant_id),
      ...tenants.map(t => t.user_id),
      ...tickets.map(t => t.tenant_id)
    ])).filter(Boolean);

    const roomIds = Array.from(new Set([
      ...tenants.map(t => t.room_id),
    ])).filter(Boolean) as string[];

    const [profilesRes, activityRoomsRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name').in('id', userIds),
      supabase.from('rooms').select('id, name').in('id', roomIds)
    ]);

    const profilesMap: Record<string, string> = {};
    profilesRes.data?.forEach(p => profilesMap[p.id] = p.full_name || 'Anonymous');
    
    const roomsMap: Record<string, string> = {};
    activityRoomsRes.data?.forEach(r => roomsMap[r.id] = r.name);

    // Calculate Stats
    const occupancyCounts: Record<string, number> = {};
    tenants.forEach(t => {
      if (t.room_id) occupancyCounts[t.room_id] = (occupancyCounts[t.room_id] || 0) + 1;
    });

    const vacantRoomsCount = rooms.filter(r => (occupancyCounts[r.id] || 0) < r.capacity).length;

    setStats({
      revenue: payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0),
      overdue: payments.filter(p => p.status === 'overdue').length,
      vacant: vacantRoomsCount,
      tickets: tickets.filter(t => t.status !== 'done').length,
    });

    // Format Activities
    const pActs: ActivityItem[] = payments.slice(0, 3).map(p => ({
      id: p.id,
      type: 'payment',
      title: `${profilesMap[p.tenant_id] || 'Tenant'} paid rent`,
      subtitle: `${p.status === 'paid' ? 'Rent payment' : 'Overdue payment'}`,
      timestamp: p.created_at,
      amount: p.amount,
      status: p.status
    }));

    const tActs: ActivityItem[] = tickets.slice(0, 3).map(t => ({
      id: t.id,
      type: 'ticket',
      title: `Ticket: ${t.title}`,
      subtitle: `${profilesMap[t.tenant_id] || 'Tenant'} • ${t.status.replace('_', ' ')}`,
      timestamp: t.created_at,
      status: t.status
    }));

    const nActs: ActivityItem[] = tenants.slice(0, 3).map(t => ({
      id: t.id,
      type: 'tenant',
      title: `New Tenant: ${profilesMap[t.user_id] || 'Anonymous'}`,
      subtitle: roomsMap[t.room_id || ''] ? `Joined ${roomsMap[t.room_id!]}` : 'Joined property',
      timestamp: t.joined_at || new Date().toISOString()
    }));

    const combined = [...pActs, ...tActs, ...nActs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);

    setActivities(combined);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
        <Skeleton className="h-40 w-full rounded-[2.5rem]" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-[2.5rem]" />
          <Skeleton className="h-32 rounded-[2.5rem]" />
        </div>
        <Skeleton className="h-60 w-full rounded-[3rem]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#fcfaf6] px-6 pb-40 pt-4 max-w-4xl mx-auto w-full">
      {/* Greeting Section */}
      <div className="mb-6">
        <p className="text-[10px] font-bold tracking-[0.15em] text-[#a07d50] uppercase mb-1">
          MORNING, {profile?.full_name?.split(' ')[0] || 'LANDLORD'}
        </p>
        <h2 className="text-3xl font-black text-[#1a1a1a] tracking-tight">Portfolio Summary</h2>
      </div>

      {/* Main Revenue Card */}
      <Card className="rounded-[2.5rem] border-0 shadow-sm bg-white mb-4 overflow-hidden">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 rounded-xl bg-[#1e4d2b]/5 flex items-center justify-center">
                <Banknote className="h-5 w-5 text-[#1e4d2b]" />
             </div>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Revenue This Month</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-[#1e4d2b] tracking-tight">₱{stats.revenue.toLocaleString()}</span>
            <span className="text-xs font-bold text-gray-300 uppercase">PHP</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card className="rounded-[2.5rem] border-0 shadow-sm bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
            </div>
            <Badge className="bg-rose-50 text-rose-600 hover:bg-rose-50 border-0 rounded-full px-2 py-0.5 text-[8px] font-black">OVERDUE</Badge>
          </div>
          <p className="text-3xl font-black text-gray-900 mb-0.5">{stats.overdue}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tenants</p>
        </Card>

        <Card className="rounded-[2.5rem] border-0 shadow-sm bg-white p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
              <DoorOpen className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-gray-900 mb-0.5">{stats.vacant}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vacant Rooms</p>
        </Card>
      </div>

      {/* Maintenance Card */}
      <Card className="rounded-[2.5rem] border-0 shadow-sm bg-white mb-8">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Ticket className="h-5 w-5 text-amber-600" />
             </div>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Maintenance Tickets</p>
          </div>
          <p className="text-2xl font-black text-gray-900">{stats.tickets}</p>
        </CardContent>
      </Card>

      {/* Quick Management */}
      <div className="mb-8 px-1">
        <h3 className="text-sm font-black text-gray-900 mb-4 ">Quick Management</h3>
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          <button 
            onClick={() => navigate('/landlord/tenants')}
            className="flex items-center gap-2 bg-[#1e4d2b] text-white px-6 py-4 rounded-full shadow-lg shadow-emerald-900/20 shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span className="text-xs font-bold tracking-tight">Add Tenant</span>
          </button>
          <button 
            onClick={() => navigate('/landlord/payments')}
            className="flex items-center gap-2 bg-gray-100 text-gray-600 px-6 py-4 rounded-full shrink-0"
          >
            <Banknote className="h-4 w-4" />
            <span className="text-xs font-bold tracking-tight">Collect Rent</span>
          </button>
          <button 
            onClick={() => navigate('/landlord/announcements')}
            className="flex items-center gap-2 bg-gray-100 text-gray-600 px-6 py-4 rounded-full shrink-0"
          >
            <AnnounceIcon className="h-4 w-4" />
            <span className="text-xs font-bold tracking-tight">Announce</span>
          </button>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-[#f1f3ef]/50 rounded-[3rem] p-6">
        <div className="flex items-center justify-between mb-6 px-2">
          <h3 className="text-sm font-black text-[#1a1a1a]">Recent Activity</h3>
          <button className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] hover:text-[#1e4d2b]">View All</button>
        </div>

        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="bg-white p-8 rounded-[2rem] flex flex-col items-center justify-center text-center gap-2 italic">
               <History className="h-8 w-8 text-gray-100" />
               <p className="text-xs text-gray-400 font-medium">No recent activity recorded.</p>
            </div>
          ) : activities.map((act) => (
            <div key={act.id} className="bg-white p-4 rounded-[2rem] flex items-center gap-4 shadow-sm border border-transparent hover:border-gray-50 transition-all">
               <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                 act.type === 'payment' ? 'bg-emerald-50 text-emerald-600' :
                 act.type === 'ticket' ? 'bg-amber-50 text-amber-600' :
                 'bg-blue-50 text-blue-600'
               }`}>
                  {act.type === 'payment' && <CheckCircle2 className="h-6 w-6" />}
                  {act.type === 'ticket' && <Wrench className="h-6 w-6" />}
                  {act.type === 'tenant' && <UserPlus className="h-6 w-6" />}
               </div>
               <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-[#1a1a1a] text-xs leading-tight truncate">{act.title}</p>
                  <p className="text-[9px] font-bold text-gray-400 mt-0.5 uppercase tracking-tighter">
                    {act.timestamp ? formatDistanceToNow(new Date(act.timestamp), { addSuffix: true }) : 'Recently'} • {act.subtitle}
                  </p>
               </div>
               {act.amount && (
                 <span className={`text-[11px] font-black tracking-tight ${act.status === 'paid' ? 'text-emerald-600' : 'text-rose-600'}`}>
                   {act.status === 'paid' ? '+' : ''}₱{act.amount.toLocaleString()}
                 </span>
               )}
               {act.type === 'ticket' && act.status && (
                 <Badge className={`rounded-full px-2 py-0.5 text-[7px] font-black border-0 ${
                   act.status === 'done' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                 }`}>
                   {act.status.toUpperCase()}
                 </Badge>
               )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LandlordDashboard;
