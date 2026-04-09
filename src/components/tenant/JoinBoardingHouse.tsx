import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { QrCode, Keyboard, ArrowLeft } from 'lucide-react';

interface Props {
  onJoined: () => void;
}

export const JoinBoardingHouse = ({ onJoined }: Props) => {
  const { user } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState<'choice' | 'code' | 'qr'>('choice');
  const [submitting, setSubmitting] = useState(false);
  const scannerRef = useRef<any>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  const joinBoardingHouse = async (code: string) => {
    if (!user || !code.trim()) return;
    setSubmitting(true);

    const { data: bh } = await supabase
      .from('boarding_houses')
      .select('id, landlord_id')
      .eq('join_code', code.trim().toUpperCase())
      .maybeSingle();

    if (!bh) {
      toast.error('Invalid join code. Please try again.');
      setSubmitting(false);
      return;
    }

    // Check if already joined
    const { data: existing } = await supabase
      .from('tenants')
      .select('id')
      .eq('user_id', user.id)
      .eq('boarding_house_id', bh.id)
      .maybeSingle();

    if (existing) {
      toast.info('You have already joined this boarding house.');
      setSubmitting(false);
      onJoined();
      return;
    }

    const { error } = await supabase.from('tenants').insert({
      user_id: user.id,
      landlord_id: bh.landlord_id,
      boarding_house_id: bh.id,
    });

    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Successfully joined boarding house!');
    onJoined();
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    await joinBoardingHouse(joinCode);
  };

  const startQrScanner = async () => {
    setMode('qr');
    // Dynamically import to avoid SSR issues
    const { Html5Qrcode } = await import('html5-qrcode');
    
    // Wait for DOM
    setTimeout(async () => {
      if (!scannerContainerRef.current) return;
      try {
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            // Parse QR code - format: boardease://join?landlord_id=UUID
            // or just the join code itself
            let code = decodedText;
            try {
              const url = new URL(decodedText);
              const params = new URLSearchParams(url.search);
              // If it's a URL with join code
              if (params.has('code')) {
                code = params.get('code') || decodedText;
              }
            } catch {
              // Not a URL, treat as raw join code
            }
            scanner.stop().catch(() => {});
            joinBoardingHouse(code);
          },
          () => {} // Ignore errors during scan
        );
      } catch (err) {
        toast.error('Could not access camera. Please use the join code instead.');
        setMode('choice');
      }
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setMode('choice');
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-sm rounded-2xl border-0 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Join a Boarding House</CardTitle>
          <p className="text-sm text-muted-foreground">Ask your landlord for the join code or QR code</p>
        </CardHeader>
        <CardContent>
          {mode === 'choice' ? (
            <div className="space-y-3">
              <Button onClick={() => setMode('code')} variant="outline" className="w-full rounded-xl h-16 flex items-center gap-3">
                <Keyboard className="h-6 w-6 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Enter Join Code</p>
                  <p className="text-xs text-muted-foreground">Type the code from your landlord</p>
                </div>
              </Button>
              <Button onClick={startQrScanner} variant="outline" className="w-full rounded-xl h-16 flex items-center gap-3">
                <QrCode className="h-6 w-6 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Scan QR Code</p>
                  <p className="text-xs text-muted-foreground">Use your camera to scan</p>
                </div>
              </Button>
            </div>
          ) : mode === 'qr' ? (
            <div className="space-y-4">
              <div id="qr-reader" ref={scannerContainerRef} className="rounded-xl overflow-hidden" />
              <p className="text-xs text-muted-foreground text-center">Point your camera at the QR code</p>
              <Button type="button" variant="ghost" className="w-full rounded-xl gap-2" onClick={stopScanner}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            </div>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <Label>Join Code</Label>
                <Input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC123"
                  className="rounded-xl font-mono text-center text-lg tracking-widest"
                  maxLength={8}
                  required
                />
              </div>
              <Button type="submit" className="w-full rounded-xl" disabled={submitting}>
                {submitting ? 'Joining...' : 'Join Boarding House'}
              </Button>
              <Button type="button" variant="ghost" className="w-full rounded-xl gap-2" onClick={() => setMode('choice')}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
