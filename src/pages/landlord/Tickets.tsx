import { useEffect, useState } from 'react'; // v2
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Wrench, CheckCircle2, Clock, AlertCircle, User as UserIcon, Calendar, Filter } from 'lucide-react';
import type { Ticket, TicketStatus } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

const columns: { status: TicketStatus; label: string; color: string; bg: string; icon: any }[] = [
  { status: 'new', label: 'NEW', color: 'text-blue-600', bg: 'bg-blue-50', icon: AlertCircle },
  { status: 'assigned', label: 'ASSIGNED', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Clock },
  { status: 'in_progress', label: 'IN PROGRESS', color: 'text-amber-600', bg: 'bg-amber-50', icon: Wrench },
  { status: 'done', label: 'DONE', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
];

const LandlordTickets = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    if (!user) return;
    setLoading(true);

    // 1. Fetch tickets and tenants separately to avoid join errors
    const [tickRes, tenantRes] = await Promise.all([
      supabase.from('tickets').select('*').eq('landlord_id', user.id).order('created_at', { ascending: false }),
      supabase.from('tenants').select('*, rooms(name)').eq('landlord_id', user.id)
    ]);

    const baseTickets = tickRes.data || [];
    const baseTenants = tenantRes.data || [];

    // 2. Fetch all relevant profiles (tenant user_ids)
    const userIds = Array.from(new Set(baseTenants.map(t => t.user_id))).filter(Boolean);
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds);
    
    const profilesMap: Record<string, any> = {};
    profiles?.forEach(p => profilesMap[p.id] = p);

    const tenantsMap: Record<string, any> = {};
    baseTenants.forEach(t => {
      tenantsMap[t.user_id] = {
        ...t,
        profiles: profilesMap[t.user_id] || { full_name: 'Unknown Tenant' }
      };
    });

    // 3. Merge data
    const merged = baseTickets.map(t => ({
      ...t,
      tenants: tenantsMap[t.tenant_id] || { profiles: { full_name: 'Unknown Tenant' } }
    }));

    setTickets(merged);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, [user]);

  const updateStatus = async (ticketId: string, newStatus: TicketStatus) => {
    const { error } = await supabase.from('tickets').update({ status: newStatus }).eq('id', ticketId);
    if (error) { toast.error(error.message); return; }
    toast.success('Ticket status updated');
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-80 rounded-[2.5rem]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#fcfaf6] min-h-screen pb-32 max-w-7xl mx-auto w-full">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <p className="text-[10px] font-black tracking-[0.2em] text-[#a07d50] uppercase mb-2">MAINTENANCE</p>
          <h1 className="text-4xl font-black text-[#1a1a1a] tracking-tight">Support Tickets</h1>
          <p className="text-xs font-bold text-gray-400 mt-1">Manage and track maintenance requests</p>
        </div>
        
        <div className="flex items-center gap-3">
           <Button variant="outline" className="h-12 rounded-2xl border-gray-100 bg-white shadow-sm flex items-center gap-2 px-6">
              <Filter className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Filter</span>
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-start">
        {columns.map(col => {
          const filtered = tickets.filter(t => t.status === col.status);
          const ColIcon = col.icon;
          
          return (
            <div key={col.status} className="space-y-6 bg-[#f1f3ef]/50 p-4 rounded-[2.5rem] border border-[#f1f3ef]/80 min-h-[500px]">
              <div className="flex items-center justify-between px-3 pt-2">
                <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${col.bg.replace('50', '500')}`} />
                   <h3 className="text-[11px] font-black tracking-[0.1em] text-[#1a1a1a] uppercase">{col.label}</h3>
                </div>
                <Badge variant="outline" className="rounded-full px-2 py-0 border-gray-200 text-[10px] font-black text-gray-400">
                  {filtered.length}
                </Badge>
              </div>
              
              <div className="space-y-4">
                {filtered.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center grayscale opacity-30 italic">
                    <ColIcon className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">No {col.label.toLowerCase()} tickets</p>
                  </div>
                ) : (
                  filtered.map(ticket => (
                    <Card key={ticket.id} className="border-0 shadow-sm rounded-[1.75rem] bg-white group hover:shadow-xl transition-all hover:translate-y-[-2px] overflow-hidden">
                      <CardContent className="p-6 space-y-4 transition-all">
                        <div className="space-y-2">
                           <div className="flex items-center justify-between">
                              <Badge className="bg-gray-50 text-gray-400 hover:bg-gray-50 border-0 rounded-full text-[8px] font-black tracking-widest py-0.5">
                                {ticket.category?.toUpperCase()}
                              </Badge>
                              <Badge className={`border-0 rounded-full text-[8px] font-black tracking-widest py-0.5 ${
                                ticket.priority === 'urgent' ? 'bg-rose-50 text-rose-500' : 
                                ticket.priority === 'high' ? 'bg-amber-50 text-amber-500' : 
                                'bg-gray-50 text-gray-400'
                              }`}>
                                {ticket.priority?.toUpperCase()}
                              </Badge>
                           </div>
                           <h4 className="font-black text-sm text-[#1a1a1a] leading-snug group-hover:text-[#1e4d2b] transition-colors">{ticket.title}</h4>
                        </div>

                        <div className="flex items-center gap-3 py-3 border-y border-gray-50">
                           <div className="w-10 h-10 rounded-full bg-[#1e4d2b]/5 flex items-center justify-center border border-[#1e4d2b]/10">
                              {ticket.tenants?.profiles?.avatar_url ? (
                                <img src={ticket.tenants.profiles.avatar_url} className="w-full h-full object-cover rounded-full" />
                              ) : (
                                <UserIcon className="h-5 w-5 text-[#1e4d2b]" />
                              )}
                           </div>
                           <div className="min-w-0">
                              <p className="text-[10px] font-black text-[#1a1a1a] tracking-tight truncate">{ticket.tenants?.profiles?.full_name}</p>
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                 {ticket.tenants?.rooms?.name || 'ROOM UNKNOWN'}
                              </p>
                           </div>
                        </div>

                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-1.5 text-gray-400">
                              <Clock className="h-3 w-3" />
                              <span className="text-[9px] font-black uppercase tracking-widest">{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
                           </div>
                        </div>

                        <Select value={ticket.status} onValueChange={(v) => updateStatus(ticket.id, v as TicketStatus)}>
                          <SelectTrigger className="h-10 rounded-xl text-[10px] font-black border-gray-100 bg-[#fcfaf6] px-4">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                            {columns.map(c => (
                              <SelectItem key={c.status} value={c.status} className="text-[10px] font-black py-2.5 rounded-xl">
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LandlordTickets;
