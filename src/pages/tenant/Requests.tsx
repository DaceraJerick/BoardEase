import { useEffect, useState } from 'react'; // v2
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Plus, 
  Wrench, 
  Droplets, 
  Zap, 
  Snowflake, 
  Hammer, 
  Box, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  Camera,
  X,
  User as UserIcon
} from 'lucide-react';
import type { Ticket, TicketCategory, TicketPriority } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';

const categoryIcons: Record<string, any> = {
  plumbing: Droplets,
  electrical: Zap,
  structural: Hammer,
  appliance: Box,
  pest_control: Snowflake, // Placeholder for specific icons
  other: Wrench,
};

const categoryColors: Record<string, string> = {
  plumbing: 'text-blue-500 bg-blue-50',
  electrical: 'text-amber-500 bg-amber-50',
  structural: 'text-rose-500 bg-rose-50',
  appliance: 'text-emerald-500 bg-emerald-50',
  pest_control: 'text-indigo-500 bg-indigo-50',
  other: 'text-gray-500 bg-gray-50',
};

const TenantRequests = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ 
    title: '', 
    category: 'other' as TicketCategory, 
    priority: 'medium' as TicketPriority, 
    description: '' 
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('tickets').select('*').eq('tenant_id', user.id).order('created_at', { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    
    const { data: tenant } = await supabase.from('tenants').select('landlord_id, boarding_house_id').eq('user_id', user.id).single();
    if (!tenant) { toast.error('No boarding house found'); setSubmitting(false); return; }

    const { error } = await supabase.from('tickets').insert({
      tenant_id: user.id,
      landlord_id: tenant.landlord_id,
      boarding_house_id: tenant.boarding_house_id,
      title: form.title,
      category: form.category,
      priority: form.priority,
      description: form.description || null,
      status: 'new',
    });

    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    
    toast.success('Maintenance request submitted successfully');
    setForm({ title: '', category: 'other', priority: 'medium', description: '' });
    fetchData();
  };

  const deleteTicket = async (id: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return;
    const { error } = await supabase.from('tickets').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Request deleted');
    setTickets(prev => prev.filter(t => t.id !== id));
  };

  if (loading) {
    return (
       <div className="space-y-6 pt-4 max-w-lg mx-auto w-full">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-40 rounded-[2.5rem]" />
          <Skeleton className="h-60 rounded-[3rem]" />
       </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-lg mx-auto w-full pb-32">
      {/* Header */}
      <div className="pt-4 px-2">
        <h1 className="text-4xl font-black text-[#1a1a1a] tracking-tight">Requests</h1>
        <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">Manage your home sanctuary</p>
      </div>

      {/* Active Requests List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
           <h3 className="text-sm font-black text-[#1a1a1a] tracking-tight">Active Requests</h3>
           <button className="text-[10px] font-black text-[#a07d50] uppercase tracking-[0.2em] hover:text-[#1e4d2b]">View All</button>
        </div>

        {tickets.filter(t => t.status !== 'done').length === 0 ? (
          <div className="py-12 bg-white rounded-[2.5rem] border border-dashed border-gray-100 flex flex-col items-center justify-center text-center italic">
             <Wrench className="h-10 w-10 text-gray-200 mb-4" />
             <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest">No active requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.filter(t => t.status !== 'done').map((ticket) => {
              const Icon = categoryIcons[ticket.category] || Wrench;
              const colors = categoryColors[ticket.category] || 'text-gray-500 bg-gray-50';
              
              return (
                <Card key={ticket.id} className="rounded-[2.5rem] border-0 shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-2">
                        <Badge className={`rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-widest border-0 ${
                          ticket.status === 'new' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {ticket.status.replace('_', ' ')}
                        </Badge>
                        <h4 className="text-base font-black text-[#1a1a1a] tracking-tight group-hover:text-[#1e4d2b] transition-colors">
                          {ticket.title}
                        </h4>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${colors}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteTicket(ticket.id); }}
                          className="p-2 text-gray-300 hover:text-rose-500 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {ticket.status === 'assigned' ? (
                      <div className="flex items-center gap-3 pt-4 border-t border-gray-50 mt-2">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Assigned To</p>
                          <p className="text-xs font-black text-[#1a1a1a]">Mario Santos</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 font-medium leading-relaxed pt-2 line-clamp-2 italic">
                        {ticket.description || 'Waiting for initial review...'}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Done Requests List */}
      {tickets.filter(t => t.status === 'done').length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
             <h3 className="text-sm font-black text-gray-400 tracking-tight">Done Requests</h3>
          </div>
          <div className="space-y-3">
            {tickets.filter(t => t.status === 'done').map((ticket) => {
              const Icon = categoryIcons[ticket.category] || Wrench;
              return (
                <Card key={ticket.id} className="rounded-[2rem] border-0 bg-white/50 opacity-60">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#1a1a1a] tracking-tight">{ticket.title}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Completed on {format(new Date(ticket.created_at), 'MMM dd')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <Icon className="h-4 w-4 text-gray-300" />
                       <button 
                         onClick={() => deleteTicket(ticket.id)}
                         className="p-2 text-gray-200 hover:text-rose-500 transition-colors"
                       >
                         <X className="h-4 w-4" />
                       </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* New Request Form */}
      <div className="space-y-6 px-2">
        <div className="space-y-1">
           <h3 className="text-xl font-black text-[#1a1a1a] tracking-tight">New Request</h3>
           <p className="text-xs font-bold text-gray-400 tracking-tight">Tell us what needs fixing</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 bg-white/50 p-8 rounded-[3rem] border border-gray-100 shadow-inner">
           <div className="space-y-3">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Title</Label>
              <input 
                type="text"
                placeholder="e.g. Broken light switch"
                className="w-full h-16 bg-white border border-gray-100 rounded-[2rem] px-8 text-sm font-bold text-[#1a1a1a] focus:ring-2 focus:ring-[#1e4d2b]/10 shadow-sm"
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                required
              />
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                 <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Category</Label>
                 <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v as TicketCategory }))}>
                    <SelectTrigger className="h-16 bg-white border border-gray-100 rounded-[2rem] px-6 text-xs font-black">
                       <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-[1.5rem] border-gray-100 shadow-xl">
                       {['plumbing','electrical','structural','appliance','pest_control','other'].map(c => (
                         <SelectItem key={c} value={c} className="rounded-xl py-3 capitalize text-[10px] font-black">{c.replace('_', ' ')}</SelectItem>
                       ))}
                    </SelectContent>
                 </Select>
              </div>
              <div className="space-y-3">
                 <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Priority</Label>
                 <Select value={form.priority} onValueChange={(v) => setForm(f => ({ ...f, priority: v as TicketPriority }))}>
                    <SelectTrigger className="h-16 bg-white border border-gray-100 rounded-[2rem] px-6 text-xs font-black">
                       <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-[1.5rem] border-gray-100 shadow-xl">
                       {['low','medium','high','urgent'].map(p => (
                         <SelectItem key={p} value={p} className="rounded-xl py-3 capitalize text-[10px] font-black">{p}</SelectItem>
                       ))}
                    </SelectContent>
                 </Select>
              </div>
           </div>

           <div className="space-y-3">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Description</Label>
              <textarea 
                rows={4}
                placeholder="Describe the issue in detail..."
                className="w-full bg-white border border-gray-100 rounded-[2rem] p-8 text-sm font-medium text-[#1a1a1a] focus:ring-2 focus:ring-[#1e4d2b]/10 shadow-sm resize-none"
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              />
           </div>

           <div className="space-y-4">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Photos</Label>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                 <button type="button" className="w-20 h-20 shrink-0 border-2 border-dashed border-gray-100 rounded-2xl flex items-center justify-center text-gray-300 hover:border-[#1e4d2b]/20 hover:text-[#1e4d2b] transition-all">
                    <Camera className="h-8 w-8" />
                 </button>
              </div>
           </div>

           <Button 
             type="submit" 
             disabled={submitting}
             className="w-full h-20 rounded-[2rem] bg-[#1e4d2b] hover:bg-[#163a20] text-white font-black text-lg shadow-2xl shadow-emerald-900/40 transition-all active:scale-[0.98] mt-4"
           >
             {submitting ? 'Submitting...' : 'Submit Request'}
           </Button>
        </form>
      </div>
      
      {/* Floating Action Button */}
      <div className="fixed bottom-28 right-8 z-50">
        <button 
          onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
          className="w-16 h-16 rounded-full bg-[#1e4d2b] text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-emerald-900/40"
        >
          <Plus className="h-8 w-8" />
        </button>
      </div>
    </div>
  );
};

export default TenantRequests;
