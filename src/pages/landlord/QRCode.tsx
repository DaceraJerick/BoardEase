import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const LandlordQRCode = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bh, setBh] = useState<{ name: string; join_code: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('boarding_houses')
      .select('name, join_code')
      .eq('landlord_id', user.id)
      .maybeSingle()
      .then(({ data }) => setBh(data));
  }, [user]);

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="mb-12">
        <h1 className="text-2xl font-bold text-gray-900">QR Code</h1>
        <p className="text-sm text-gray-400">{bh?.name || 'Your Boarding House'}</p>
      </div>

      <div className="flex flex-col items-center justify-center space-y-8">
        <div className="relative">
          <div className="p-8 bg-white rounded-[2.5rem] shadow-[0_10px_50px_rgba(0,0,0,0.03)] border border-gray-50 flex flex-col items-center gap-6">
            <QRCodeSVG 
              value={`boardease://join?code=${bh?.join_code}`} 
              size={220} 
              fgColor="#1e4d2b" 
              level="Q"
            />
            <div className="text-center w-full">
               <p className="text-[10px] font-mono font-bold text-gray-300 tracking-[0.2em] uppercase">
                CODE: {bh?.join_code || '....'}
              </p>
            </div>
          </div>
          <div className="absolute -top-3 -right-3 w-10 h-10 bg-[#1e4d2b] rounded-full flex items-center justify-center border-4 border-white shadow-lg">
            <QrCode className="h-5 w-5 text-white" />
          </div>
        </div>

        <div className="text-center max-w-xs space-y-2 text-gray-400">
          <h2 className="text-base font-bold text-gray-900">Share this QR Code or Link</h2>
          <p className="text-xs leading-relaxed">
            New tenants can scan this block or open the link below to select a room and join your property.
          </p>
        </div>

        <div className="pt-8 w-full max-w-xs">
           <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="w-full h-12 rounded-xl text-gray-400 border-gray-100 font-bold text-sm"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LandlordQRCode;
