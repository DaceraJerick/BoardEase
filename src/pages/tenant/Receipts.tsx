import { useEffect, useState } from 'react'; // v2
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Receipt, 
  ArrowRight, 
  Download, 
  Box, 
  CheckCircle2, 
  History,
  Info
} from 'lucide-react';
import type { Payment, Profile } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const TenantReceipts = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // 1. Fetch Profile & Paid Payments
    const [profRes, payRes, tenantRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('payments').select('*').eq('tenant_id', user.id).eq('status', 'paid').order('created_at', { ascending: false }),
      supabase.from('tenants').select('*, rooms(name)').eq('user_id', user.id).maybeSingle()
    ]);

    setProfile(profRes.data);
    const basePayments = payRes.data || [];
    const tData = tenantRes.data;

    // 2. Enrich payments with room and name for the official receipt view
    const enriched = basePayments.map(p => ({
      ...p,
      tenantName: profRes.data?.full_name || 'Anonymous Tenant',
      roomName: tData?.rooms?.name || 'Unassigned Room',
      receiptNo: `RE-${p.id.substring(0, 6).toUpperCase()}`
    }));

    setPayments(enriched);
    if (enriched.length > 0) setSelectedReceipt(enriched[0]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  if (loading) {
    return (
      <div className="space-y-6 pt-4 max-w-lg mx-auto w-full">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-40 rounded-[2.5rem]" />
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-lg mx-auto w-full pb-20">
      {/* Header */}
      <div className="pt-4 px-2">
        <h1 className="text-4xl font-black text-[#1a1a1a] tracking-tight">Receipts</h1>
        <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">Your verified payment history</p>
      </div>

      {/* Featured Latest Receipt */}
      {payments.length > 0 && (
         <Card 
           onClick={() => setSelectedReceipt(payments[0])}
           className={`rounded-[2.5rem] bg-white transition-all cursor-pointer group ${
             selectedReceipt?.id === payments[0].id ? 'border-2 border-[#1e4d2b] shadow-xl shadow-emerald-900/10' : 'border-0 shadow-sm opacity-90'
           }`}
         >
           <CardContent className="p-8">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                       <Receipt className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                       <h3 className="text-base font-black text-[#1a1a1a] tracking-tight">
                         {format(new Date(payments[0].created_at), 'MMMM')} Rent
                       </h3>
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                         {format(new Date(payments[0].paid_at || payments[0].created_at), 'MMM dd, yyyy')} • {payments[0].method?.toUpperCase()}
                       </p>
                    </div>
                 </div>
                 <Badge className="bg-[#1e4d2b]/10 text-[#1e4d2b] hover:bg-[#1e4d2b]/10 border-0 rounded-full px-3 py-1">
                   <span className="text-[9px] font-black tracking-widest uppercase">Confirmed</span>
                 </Badge>
              </div>

              <div className="flex items-end justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-black text-[#1e4d2b] tracking-tighter">₱{payments[0].amount.toLocaleString()}.00</h2>
                 </div>
                 <button className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 group-hover:text-[#1e4d2b] transition-colors uppercase tracking-widest">
                   View Details <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                 </button>
              </div>
           </CardContent>
         </Card>
      )}

      {/* Payment History List */}
      {payments.length > 1 && (
        <div className="space-y-3 px-2">
           {payments.slice(1).map((p) => (
              <Card 
                key={p.id} 
                onClick={() => setSelectedReceipt(p)}
                className={`rounded-[2rem] bg-white border-0 transition-all cursor-pointer ${
                  selectedReceipt?.id === p.id ? 'bg-[#f1f3ef] border border-[#1e4d2b]/20' : 'shadow-sm opacity-80 hover:opacity-100 hover:shadow-md'
                }`}
              >
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                        <History className="h-5 w-5" />
                     </div>
                     <div>
                        <p className="text-sm font-black text-[#1a1a1a] tracking-tight">{format(new Date(p.created_at), 'MMMM')} Rent</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                          {format(new Date(p.created_at), 'MMM dd')} • {p.method?.toUpperCase()}
                        </p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-sm font-black text-[#1a1a1a]">₱{p.amount.toLocaleString()}.00</p>
                     <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Confirmed</p>
                  </div>
                </CardContent>
              </Card>
           ))}
        </div>
      )}

      {/* Official Receipt Section */}
      {selectedReceipt && (
        <div className="space-y-6 py-8 animate-in fade-in duration-500">
           <div className="relative text-center">
              <div className="absolute inset-0 flex items-center">
                 <span className="w-full border-t border-dashed border-gray-200" />
              </div>
              <span className="relative z-10 bg-[#fcfaf6] px-4 text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Latest Official Receipt</span>
           </div>

           <Card className="rounded-[3rem] border-0 shadow-2xl bg-white overflow-hidden p-1">
              <div className="border border-dashed border-gray-100 rounded-[2.8rem] p-8 sm:p-10 space-y-10">
                 {/* Brand */}
                 <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2 mb-2">
                       <div className="w-8 h-8 bg-[#1e4d2b] rounded-xl flex items-center justify-center">
                          <Box className="h-5 w-5 text-white" />
                       </div>
                       <span className="font-black text-[#1e4d2b] tracking-tighter text-xl">BoardEase</span>
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Official Receipt</p>
                 </div>

                 {/* Top Info */}
                 <div className="grid grid-cols-2 gap-8 text-sm">
                    <div className="space-y-1">
                       <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Tenant Name</p>
                       <h4 className="font-black text-[#1a1a1a] tracking-tight">{selectedReceipt.tenantName}</h4>
                       <p className="text-[9px] font-bold text-gray-400">{selectedReceipt.roomName}</p>
                    </div>
                    <div className="text-right space-y-1">
                       <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Receipt No.</p>
                       <h4 className="font-black text-[#1a1a1a] tracking-tight">{selectedReceipt.receiptNo}</h4>
                    </div>
                 </div>

                 {/* Breakdown Box */}
                 <div className="bg-gray-50/50 rounded-[2rem] p-6 space-y-4 border border-gray-50">
                    <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                       <span>Payment for</span>
                       <span className="text-[#1a1a1a]">{format(new Date(selectedReceipt.created_at), 'MMMM yyyy')} Rent</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                       <span>Processed Date</span>
                       <span className="text-[#1a1a1a]">{format(new Date(selectedReceipt.paid_at || selectedReceipt.created_at), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                       <span className="text-sm font-black text-[#1a1a1a]">Total Amount</span>
                       <span className="text-2xl font-black text-[#1e4d2b] tracking-tighter">₱{selectedReceipt.amount.toLocaleString()}.00</span>
                    </div>
                 </div>

                 {/* Footer */}
                 <div className="space-y-8">
                    <div className="space-y-1">
                       <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Processed By</p>
                       <p className="text-[10px] font-bold text-gray-400 italic">BoardEase Management Official (Landlord)</p>
                    </div>
                    
                    <div className="flex flex-col items-center gap-6">
                       <div className="relative w-20 h-28 bg-gray-100 rounded-lg shadow-inner overflow-hidden flex items-center justify-center">
                          <div className="w-12 h-16 bg-white border border-gray-200 rounded p-1 space-y-1">
                             <div className="h-1 w-full bg-gray-100 rounded-full" />
                             <div className="h-1 w-2/3 bg-gray-50 rounded-full" />
                             <div className="h-4 w-full bg-[#1e4d2b]/5 rounded mt-4" />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
                       </div>

                       <Button className="w-full h-16 rounded-2xl bg-[#1e4d2b] hover:bg-[#163a20] text-white font-black text-sm flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/10">
                          <Download className="h-5 w-5" />
                          Download as PDF
                       </Button>
                    </div>
                 </div>
              </div>
           </Card>
        </div>
      )}

      {!loading && payments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-40 px-10 text-center animate-in fade-in zoom-in duration-500">
           <div className="w-20 h-20 rounded-[2rem] bg-gray-50 flex items-center justify-center mb-6">
              <Receipt className="h-10 w-10 text-gray-200" />
           </div>
           <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">No payment history yet</h3>
           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
             Once you complete a rent payment, your official receipt will appear here.
           </p>
        </div>
      )}
    </div>
  );
};

export default TenantReceipts;
