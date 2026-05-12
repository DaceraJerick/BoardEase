import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ReceiptModal } from '@/components/ReceiptModal';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [receiptData, setReceiptData] = useState<any>(null);

  useEffect(() => {
    const confirmPayment = async () => {
      if (!user) return;

      const paymentId = searchParams.get('payment_id');
      const amount = searchParams.get('amount');
      const method = searchParams.get('method');

      if (!paymentId) {
        navigate('/tenant/pay');
        return;
      }

      // Mark payment as paid in the database automatically
      const { error } = await supabase
        .from('payments')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', paymentId)
        .eq('tenant_id', user.id); // Security check

      setLoading(false);

      if (!error) {
        // Construct the digital receipt automatically
        setReceiptData({
          tenantName: user.user_metadata?.full_name || 'Tenant',
          amount: parseFloat(amount || '0'),
          method: method || 'Unknown',
          reference: paymentId.slice(0, 12).toUpperCase(), // Fake ref from ID for visual
          date: new Date(),
          month: format(new Date(), 'MMMM')
        });
      }
    };

    confirmPayment();
  }, [user, searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfaf6]">
      {loading ? (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-[#1e4d2b]" />
          <h2 className="text-lg font-black text-[#1a1a1a] tracking-tight">Verifying Payment...</h2>
        </div>
      ) : (
        <ReceiptModal 
          open={!!receiptData}
          onOpenChange={(open) => {
            if (!open) navigate('/tenant');
          }}
          receiptData={receiptData}
        />
      )}
    </div>
  );
}
