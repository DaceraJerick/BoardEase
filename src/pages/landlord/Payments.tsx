import { useEffect, useState } from 'react'; // v2
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, CreditCard, Banknote, Calendar, History, X } from 'lucide-react';
import type { Payment, PaymentMethod, PaymentStatus } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

const statusStyles: Record<PaymentStatus, { color: string; bg: string }> = {
  paid: { color: 'text-emerald-600', bg: 'bg-emerald-50' },
  pending: { color: 'text-amber-600', bg: 'bg-amber-50' },
  overdue: { color: 'text-rose-600', bg: 'bg-rose-50' },
};

const LandlordPayments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [form, setForm] = useState({ tenant_id: '', amount: 0, method: 'cash' as PaymentMethod, reference_number: '', due_date: '' });
  const [filter, setFilter] = useState<string>('all');

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch base data separately to avoid relation errors
    const [paymentsRes, tenantsRes] = await Promise.all([
      supabase.from('payments').select('*').eq('landlord_id', user.id).order('created_at', { ascending: false }),
      supabase.from('tenants').select('*').eq('landlord_id', user.id),
    ]);

    const basePayments = paymentsRes.data || [];
    const baseTenants = tenantsRes.data || [];

    // Fetch all relevant profiles (tenant user_ids)
    const userIds = Array.from(new Set([
      ...basePayments.map(p => p.tenant_id),
      ...baseTenants.map(t => t.user_id)
    ])).filter(Boolean);

    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
    const profilesMap: Record<string, string> = {};
    profiles?.forEach(p => profilesMap[p.id] = p.full_name || 'Anonymous');

    // Merge profile data
    const mergedPayments = basePayments.map(p => ({
      ...p,
      profiles: { full_name: profilesMap[p.tenant_id] || 'Unknown Tenant' }
    }));

    const mergedTenants = baseTenants.map(t => ({
      ...t,
      profiles: { full_name: profilesMap[t.user_id] || 'Unknown Profile' }
    }));

    setPayments(mergedPayments);
    setTenants(mergedTenants);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // The select's value is the tenant's entry ID, we need the user_id for the payment record
    const tenantEntry = tenants.find(t => t.id === form.tenant_id);
    if (!tenantEntry) { toast.error('Please select a tenant'); return; }

    const { error } = await supabase.from('payments').insert({
      tenant_id: tenantEntry.user_id,
      landlord_id: user.id,
      boarding_house_id: tenantEntry.boarding_house_id,
      amount: form.amount,
      method: form.method,
      reference_number: form.reference_number || null,
      status: 'paid',
      due_date: form.due_date,
      paid_at: new Date().toISOString(),
    });

    if (error) { toast.error(error.message); return; }
    
    toast.success('Payment recorded successfully');
    setDialogOpen(false);
    setForm({ tenant_id: '', amount: 0, method: 'cash' as PaymentMethod, reference_number: '', due_date: '' });
    fetchData();
  };

  const filtered = filter === 'all' ? payments : payments.filter(p => p.status === filter);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
        <Skeleton className="h-40 w-full rounded-[2.5rem]" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
        <Skeleton className="h-60 w-full rounded-[3rem]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#fcfaf6] px-6 pb-40 pt-4 max-w-4xl mx-auto w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.15em] text-[#a07d50] uppercase mb-1">FINANCIALS</p>
          <h1 className="text-3xl font-black text-[#1a1a1a] tracking-tight">Payments</h1>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
             <Button className="h-12 px-6 rounded-2xl bg-[#1e4d2b] hover:bg-[#163a20] shadow-lg shadow-emerald-900/10 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-tight">Record</span>
             </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[440px] rounded-[2.5rem] p-0 border-0 shadow-2xl overflow-hidden bg-white [&>button:last-child]:hidden">
            <div className="p-8 sm:p-10 relative">
              <DialogClose className="absolute right-6 top-6 w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors">
                <X className="h-5 w-5" />
              </DialogClose>
              
              <DialogHeader className="mb-8">
                <DialogTitle className="text-2xl font-black text-[#1a1a1a] tracking-tight text-center sm:text-left">Record Payment</DialogTitle>
                <p className="text-xs font-bold text-gray-400 tracking-tight mt-1 text-center sm:text-left">Manually log a tenant payment</p>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-[#1a1a1a] uppercase tracking-[0.15em] ml-1">Tenant</Label>
                  <Select value={form.tenant_id} onValueChange={v => setForm(f => ({ ...f, tenant_id: v }))}>
                    <SelectTrigger className="h-14 rounded-2xl border-gray-100 px-5 focus:ring-[#1e4d2b]">
                      <SelectValue placeholder="Select tenant" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-gray-100 shadow-xl p-2">
                      {tenants.map(t => (
                        <SelectItem key={t.id} value={t.id} className="rounded-xl py-3 px-4 text-xs font-extrabold focus:bg-emerald-50 focus:text-emerald-800 transition-colors">
                          {t.profiles?.full_name || 'Anonymous Tenant'}
                        </SelectItem>
                      ))}
                      {tenants.length === 0 && (
                        <div className="p-4 text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">No tenants found</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-[#1a1a1a] uppercase tracking-[0.15em] ml-1">Amount (₱)</Label>
                  <Input 
                    type="number" 
                    min={0} 
                    placeholder="0"
                    className="rounded-2xl border-gray-100 h-14 text-sm font-medium px-5" 
                    value={form.amount || ''} 
                    onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} 
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black text-[#1a1a1a] uppercase tracking-[0.15em] ml-1">Method</Label>
                      <Select value={form.method} onValueChange={v => setForm(f => ({ ...f, method: v as PaymentMethod }))}>
                        <SelectTrigger className="h-14 rounded-2xl border-gray-100 px-5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-gray-100 shadow-xl">
                          <SelectItem value="cash" className="text-xs font-bold rounded-xl">Cash</SelectItem>
                          <SelectItem value="gcash" className="text-xs font-bold rounded-xl">GCash</SelectItem>
                          <SelectItem value="maya" className="text-xs font-bold rounded-xl">Maya</SelectItem>
                          <SelectItem value="card" className="text-xs font-bold rounded-xl">Card</SelectItem>
                        </SelectContent>
                      </Select>
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black text-[#1a1a1a] uppercase tracking-[0.15em] ml-1">Due Date</Label>
                      <Input 
                        type="date" 
                        value={form.due_date} 
                        onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} 
                        required 
                        className="h-14 rounded-2xl border-gray-100 text-xs font-bold px-5" 
                      />
                   </div>
                </div>

                <Button type="submit" className="w-full h-16 rounded-[1.25rem] bg-[#1e4d2b] hover:bg-[#163a20] text-white font-black text-sm flex items-center justify-center gap-2 mt-4 shadow-xl shadow-emerald-900/20">
                  Record Payment
                </Button>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-8 scrollbar-hide">
        {['all', 'paid', 'pending', 'overdue'].map(s => (
          <button 
            key={s} 
            onClick={() => setFilter(s)}
            className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
              filter === s 
                ? 'bg-[#1e4d2b] text-white shadow-lg shadow-emerald-900/10' 
                : 'bg-white text-gray-400 hover:text-gray-600 border border-gray-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
           <Skeleton className="h-32 rounded-[2.5rem]" />
           <Skeleton className="h-32 rounded-[2.5rem]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center bg-[#f1f3ef]/50 rounded-[3rem] italic border border-dashed border-gray-200">
          <History className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.1em]">No records found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(payment => (
            <Card key={payment.id} className="border-0 shadow-sm rounded-[2.5rem] bg-white overflow-hidden hover:shadow-md transition-all">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#1e4d2b]/5 flex items-center justify-center">
                      <Banknote className="h-6 w-6 text-[#1e4d2b]" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-gray-900 tracking-tight">{payment.profiles?.full_name || 'Anonymous'}</h3>
                      <div className="flex items-center gap-2 mt-1">
                         <Calendar className="h-3.5 w-3.5 text-gray-300" />
                         <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            {new Date(payment.due_date).toLocaleDateString()} • {formatDistanceToNow(new Date(payment.created_at), { addSuffix: true })}
                         </p>
                      </div>
                    </div>
                  </div>
                  <Badge className={`rounded-full px-3 py-1 text-[8px] font-black border-0 tracking-widest ${statusStyles[payment.status as PaymentStatus].bg} ${statusStyles[payment.status as PaymentStatus].color}`}>
                    {payment.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-gray-50 mt-2">
                   <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-gray-900 tracking-tight">₱{payment.amount.toLocaleString()}</span>
                      <span className="text-[10px] font-bold text-gray-300">PHP</span>
                   </div>
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                     {payment.method || 'CASH'}
                   </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LandlordPayments;
