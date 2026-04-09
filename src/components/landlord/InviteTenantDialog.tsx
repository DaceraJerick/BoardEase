import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, UserPlus } from 'lucide-react';
import type { BoardingHouse } from '@/types/database';

export const InviteTenantDialog = () => {
  const { user } = useAuth();
  const [bh, setBh] = useState<BoardingHouse | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('boarding_houses').select('*').eq('landlord_id', user.id).single().then(({ data }) => {
      if (data) setBh(data);
    });
  }, [user]);

  const copyCode = () => {
    if (bh) {
      navigator.clipboard.writeText(bh.join_code);
      toast.success('Join code copied!');
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="rounded-xl gap-2"><UserPlus className="h-4 w-4" /> Invite Tenant</Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader><DialogTitle>Invite Tenant</DialogTitle></DialogHeader>
        {bh && (
          <div className="space-y-4">
            <div className="flex justify-center p-4 bg-muted rounded-xl">
              <QRCodeSVG value={`boardease://join?landlord_id=${user?.id}`} size={200} />
            </div>
            <div className="flex items-center gap-2">
              <Input value={bh.join_code} readOnly className="rounded-xl font-mono text-center text-lg" />
              <Button variant="outline" size="icon" onClick={copyCode} className="rounded-xl shrink-0">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">Share this QR code or join code with your tenants</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
