import { useEffect, useState } from 'react'; // v2
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { PaymentMethod } from '@/types/database';
import { 
  CreditCard, 
  Smartphone, 
  Wallet, 
  ArrowRight, 
  Building2, 
  Zap, 
  Droplets,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

import { ReceiptModal } from '@/components/ReceiptModal';
import { QRCodeSVG } from 'qrcode.react';

const paymentMethods: { value: PaymentMethod; label: string; icon: any }[] = [
  { value: 'gcash', label: 'GCash', icon: Smartphone },
  { value: 'maya', label: 'Maya', icon: Wallet },
  { value: 'card', label: 'Card', icon: CreditCard },
];


const TenantPay = () => {
  const { user } = useAuth();
  const [method, setMethod] = useState<PaymentMethod>('gcash');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dueInfo, setDueInfo] = useState({ total: 0, rent: 0, electricity: 0, water: 0, month: '' });
  const [unpaidId, setUnpaidId] = useState<string | null>(null);
  const [landlordProfile, setLandlordProfile] = useState<any>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch tenant, room, and latest unpaid payment
    const [tenantRes, payRes] = await Promise.all([
      supabase.from('tenants').select('*, rooms(*)').eq('user_id', user.id).maybeSingle(),
      supabase.from('payments').select('*').eq('tenant_id', user.id).neq('status', 'paid').order('created_at', { ascending: false }).limit(1).maybeSingle()
    ]);

    const rooms = (tenantRes.data as any)?.rooms;
    const unpaid = payRes.data;
    
    console.log('Fetching tenant data for user:', user.id);
    if (tenantRes.data) {
      console.log('Tenant record found:', tenantRes.data);
      const targetLandlordId = tenantRes.data.landlord_id;
      
      if (targetLandlordId) {
        const { data: profile, error: pError } = await supabase.from('profiles').select('*').eq('id', targetLandlordId).maybeSingle();
        console.log('DEBUG: GCash Num:', profile?.gcash_number, '| Maya Num:', profile?.maya_number);
        console.log('DEBUG: GCash Name:', profile?.gcash_name, '| Maya Name:', profile?.maya_name);
        if (profile) {
          console.log('Landlord profile found by ID:', profile);
          setLandlordProfile(profile);
        } else {
          console.error('Landlord profile not found for ID:', targetLandlordId, pError);
          // Set to a placeholder so UI stops fetching
          setLandlordProfile({ id: 'not_found' });
        }
      } else if (tenantRes.data.boarding_house_id) {
        console.log('Landlord ID missing in tenant record, fetching from boarding house:', tenantRes.data.boarding_house_id);
        const { data: bh } = await supabase.from('boarding_houses').select('landlord_id').eq('id', tenantRes.data.boarding_house_id).single();
        if (bh?.landlord_id) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', bh.landlord_id).maybeSingle();
          if (profile) {
            console.log('Landlord profile found via boarding house:', profile);
            setLandlordProfile(profile);
          } else {
            setLandlordProfile({ id: 'not_found' });
          }
        } else {
          setLandlordProfile({ id: 'not_found' });
        }
      } else {
        setLandlordProfile({ id: 'not_found' });
      }
    } else {
      console.warn('No tenant record found for user ID:', user.id);
      setLandlordProfile({ id: 'not_found' });
    }

    const baseRent = rooms?.rent_amount || 0;
    const totalDue = unpaid?.amount || 0;
    if (unpaid) setUnpaidId(unpaid.id);
    
    // Simulate a breakdown for visual fidelity matching the mockup
    // If totalDue > baseRent, we split the remainder 70/30 between Electricity and Water
    let rentDue = 0;
    let elec = 0;
    let water = 0;
    
    if (totalDue > 0) {
      if (totalDue >= baseRent) {
        rentDue = baseRent;
        const extra = totalDue - baseRent;
        elec = Math.floor(extra * 0.7);
        water = extra - elec;
      } else {
        rentDue = totalDue;
      }
    }

    setDueInfo({
      total: totalDue,
      rent: rentDue,
      electricity: elec,
      water: water,
      month: format(new Date(), 'MMMM')
    });
    setAmount(totalDue.toString());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !method) return;
    
    if (!receiptFile) {
      toast.error('Please upload a screenshot of your payment receipt');
      return;
    }

    setSubmitting(true);

    try {
      const { data: tenant } = await supabase.from('tenants').select('landlord_id, boarding_house_id').eq('user_id', user.id).single();
      if (!tenant) throw new Error('No boarding house found');

      const amountNum = parseFloat(amount);
      
      // 1. Upload Receipt to Storage
      const fileExt = receiptFile.name.split('.').pop();
      const filePath = `${user.id}/receipt_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, receiptFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      // 2. Create or Update Payment Record
      let activePaymentId = unpaidId;
      if (!activePaymentId) {
        const { data, error } = await supabase.from('payments').insert({
          tenant_id: user.id,
          landlord_id: tenant.landlord_id,
          boarding_house_id: tenant.boarding_house_id,
          amount: amountNum,
          method,
          status: 'pending',
          receipt_url: publicUrl,
          due_date: new Date().toISOString(),
        }).select().single();
        
        if (error) throw error;
        activePaymentId = data.id;
      } else {
        const { error } = await supabase.from('payments').update({ 
          method, 
          receipt_url: publicUrl,
          status: 'pending' // Ensure it's pending for landlord review
        }).eq('id', activePaymentId);
        
        if (error) throw error;
      }

      toast.success('Payment submitted for verification');
      
      // 3. Show Success Receipt Modal locally
      setReceiptData({
        tenantName: user.user_metadata?.full_name || 'Tenant',
        amount: amountNum,
        method: method.toUpperCase(),
        reference: 'PENDING',
        date: new Date(),
        month: dueInfo.month
      });

    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
     return (
        <div className="space-y-6 pt-4 max-w-lg mx-auto w-full">
           <Skeleton className="h-10 w-48" />
           <Skeleton className="h-60 rounded-[2.5rem]" />
           <div className="flex gap-2"><Skeleton className="h-14 w-full rounded-2xl" /><Skeleton className="h-14 w-full rounded-2xl" /></div>
        </div>
     );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-lg mx-auto w-full pb-32">
      {/* Header */}
      <div className="pt-4 px-2">
        <h1 className="text-4xl font-black text-[#1a1a1a] tracking-tight">Monthly Dues</h1>
        <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest leading-relaxed">
          Review and settle your balance for {dueInfo.month}.
        </p>
      </div>

      {/* Breakdown Card */}
      <Card className="rounded-[3rem] border-0 shadow-2xl shadow-emerald-900/10 bg-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[5rem] -mr-8 -mt-8 opacity-40" />
        <CardContent className="p-8 sm:p-10 relative z-10">
           <div className="mb-10">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 text-center sm:text-left">Total Due</p>
              <div className="flex items-center justify-center sm:justify-start gap-1">
                 <h2 className="text-5xl font-black text-[#1e4d2b] tracking-tighter">₱{dueInfo.total.toLocaleString()}</h2>
                 <span className="text-xs font-bold text-gray-300">.00</span>
              </div>
           </div>

           <div className="space-y-6">
              <div className="flex items-center justify-between group">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-[#1e4d2b] group-hover:scale-110 transition-transform">
                       <Building2 className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-black text-[#1a1a1a] tracking-tight">Base Rent</span>
                 </div>
                 <span className="text-sm font-black text-[#1a1a1a]">₱{dueInfo.rent.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between group">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                       <Zap className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-black text-[#1a1a1a] tracking-tight">Electricity</span>
                 </div>
                 <span className="text-sm font-black text-[#1a1a1a]">₱{dueInfo.electricity.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between group">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-500 group-hover:scale-110 transition-transform">
                       <Droplets className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-black text-[#1a1a1a] tracking-tight">Water</span>
                 </div>
                 <span className="text-sm font-black text-[#1a1a1a]">₱{dueInfo.water.toLocaleString()}</span>
              </div>
           </div>
        </CardContent>
      </Card>

      {/* Payment Method Selector */}
      <div className="space-y-4">
         <h3 className="text-lg font-black text-[#1a1a1a] tracking-tight px-2">Payment Method</h3>
         <div className="flex gap-3 overflow-x-auto pb-4 px-2 scrollbar-hide">
            {paymentMethods.map((m) => {
               const active = method === m.value;
               return (
                  <button
                    key={m.value}
                    onClick={() => setMethod(m.value)}
                    className={`flex items-center gap-3 px-6 py-4 rounded-2xl transition-all shrink-0 font-black text-xs uppercase tracking-widest ${
                      active 
                        ? 'bg-[#1e4d2b] text-white shadow-lg shadow-emerald-900/20' 
                        : 'bg-white text-gray-400 border border-gray-100'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? 'bg-white/10' : 'bg-gray-50'}`}>
                       <m.icon className="h-4 w-4" />
                    </div>
                    {m.label}
                  </button>
               )
            })}
          </div>
       </div>

       {/* Dynamic Payment Account Info */}
       {(method === 'gcash' || method === 'maya') && (
         <div className="px-2 space-y-4">
           <div className="bg-gray-50 border border-gray-100 rounded-[2rem] p-6 space-y-4">
             <h4 className="text-sm font-black text-[#1a1a1a] uppercase tracking-wider">Landlord's {method === 'gcash' ? 'GCash' : 'Maya'}</h4>
             
             {!landlordProfile ? (
               <div className="py-4 text-center">
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest italic">Fetching landlord details...</p>
               </div>
             ) : landlordProfile.id === 'not_found' ? (
               <div className="py-4 text-center">
                 <p className="text-xs font-bold text-rose-400 uppercase tracking-widest italic">Landlord info unavailable. Please contact support.</p>
               </div>
             ) : !(method === 'gcash' ? landlordProfile.gcash_number : landlordProfile.maya_number) ? (
               <div className="py-4 text-center">
                 <p className="text-xs font-bold text-rose-400 uppercase tracking-widest italic">Landlord has not set up {method.toUpperCase()} yet.</p>
               </div>
             ) : (
               <>
                 <div className="flex justify-between items-center">
                   <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Name</span>
                   <span className="text-sm font-black text-[#1a1a1a]">{method === 'gcash' ? landlordProfile.gcash_name : landlordProfile.maya_name}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Number</span>
                   <span className="text-lg font-black text-[#1e4d2b] tracking-wider">{method === 'gcash' ? landlordProfile.gcash_number : landlordProfile.maya_number}</span>
                 </div>
 
                 <div className="flex gap-2 pt-2">
                   <Button 
                     type="button"
                     className="w-full h-12 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white"
                     onClick={() => {
                       const url = method === 'gcash' ? 'intent://' : 'https://maya.ph';
                       window.open(url, '_blank');
                     }}
                   >
                     <Smartphone className="w-4 h-4 mr-2" />
                     Open App
                   </Button>
                 </div>
 
                 <div className="pt-4 flex justify-center animate-in zoom-in duration-300">
                   <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                     {method === 'gcash' && landlordProfile.gcash_qr_url ? (
                       <img src={landlordProfile.gcash_qr_url} alt="GCash QR" className="w-full max-w-[200px] object-contain" />
                     ) : method === 'maya' && landlordProfile.maya_qr_url ? (
                       <img src={landlordProfile.maya_qr_url} alt="Maya QR" className="w-full max-w-[200px] object-contain" />
                     ) : (
                       <QRCodeSVG 
                         value={method === 'gcash' ? (landlordProfile.gcash_number || '') : (landlordProfile.maya_number || '')} 
                         size={200} 
                       />
                     )}
                   </div>
                 </div>
               </>
             )}
           </div>
         </div>
       )}

      {/* Form Fields */}
      <form onSubmit={handleSubmit} className="space-y-8 px-2">
         <div className="space-y-3">
            <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Amount to Pay</Label>
            <div className="relative">
               <span className="absolute left-6 top-1/2 -translate-y-1/2 text-lg font-black text-[#1a1a1a]">₱</span>
               <input 
                 type="number"
                 className="w-full h-16 bg-gray-100 border-0 rounded-[2rem] px-12 text-lg font-black text-[#1a1a1a] focus:ring-2 focus:ring-[#1e4d2b]/20"
                 value={amount}
                 onChange={(e) => setAmount(e.target.value)}
                 required
                 disabled={submitting}
               />
            </div>
         </div>

         <div className="space-y-3">
            <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Upload Receipt Screenshot</Label>
            <Input 
              type="file" 
              accept="image/*"
              className="h-16 rounded-[2rem] bg-gray-100 border-0 px-6 pt-5"
              onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              required
              disabled={submitting}
            />
         </div>

         <Button 
           type="submit" 
           disabled={submitting || dueInfo.total === 0}
           className="w-full h-20 rounded-[2rem] bg-[#1e4d2b] hover:bg-[#163a20] text-white font-black text-lg flex items-center justify-center gap-3 shadow-2xl shadow-emerald-900/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
         >
           {submitting ? 'Submitting...' : 'Submit Payment'}
           {!submitting && <ArrowRight className="h-6 w-6" />}
         </Button>
      </form>

      <ReceiptModal 
        open={!!receiptData} 
        onOpenChange={(open) => !open && setReceiptData(null)} 
        receiptData={receiptData} 
      />
    </div>
  );
};

export default TenantPay;
