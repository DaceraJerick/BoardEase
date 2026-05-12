import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, QrCode, User, Home, LogOut, ShieldCheck } from 'lucide-react';
import type { BoardingHouse } from '@/types/database';

const LandlordSettings = () => {
  const { user, profile, signOut } = useAuth();
  const [bh, setBh] = useState<BoardingHouse | null>(null);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [bhName, setBhName] = useState('');
  const [bhAddress, setBhAddress] = useState('');
  const [gcashNumber, setGcashNumber] = useState('');
  const [gcashName, setGcashName] = useState('');
  const [mayaNumber, setMayaNumber] = useState('');
  const [mayaName, setMayaName] = useState('');
  const [gcashQrUrl, setGcashQrUrl] = useState('');
  const [mayaQrUrl, setMayaQrUrl] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('boarding_houses').select('*').eq('landlord_id', user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setBh(data);
        setBhName(data.name);
        setBhAddress(data.address || '');
      }
    });
  }, [user]);

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setPhone(profile?.phone || '');
    setGcashNumber(profile?.gcash_number || '');
    setGcashName(profile?.gcash_name || '');
    setMayaNumber(profile?.maya_number || '');
    setMayaName(profile?.maya_name || '');
    setGcashQrUrl(profile?.gcash_qr_url || '');
    setMayaQrUrl(profile?.maya_qr_url || '');
  }, [profile]);

  const saveProfile = async () => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ 
      full_name: fullName, 
      phone,
      gcash_number: gcashNumber,
      gcash_name: gcashName,
      maya_number: mayaNumber,
      maya_name: mayaName,
      gcash_qr_url: gcashQrUrl,
      maya_qr_url: mayaQrUrl
    }).eq('id', user.id);
    
    if (error) {
      toast.error(error.message);
    } else {
      // Force refresh data
      const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (updatedProfile) {
        setGcashNumber(updatedProfile.gcash_number || '');
        setGcashName(updatedProfile.gcash_name || '');
        setMayaNumber(updatedProfile.maya_number || '');
        setMayaName(updatedProfile.maya_name || '');
        console.log('Post-save verification:', updatedProfile);
      }
      toast.success('Profile & Payment Settings updated');
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'gcash' | 'maya') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(type);
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${type}_qr_${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment_qrs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment_qrs')
        .getPublicUrl(filePath);

      if (type === 'gcash') setGcashQrUrl(publicUrl);
      else setMayaQrUrl(publicUrl);

      toast.success(`${type === 'gcash' ? 'GCash' : 'Maya'} QR updated`);
    } catch (error: any) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(null);
    }
  };

  const saveBh = async () => {
    if (!bh) return;
    const { error } = await supabase.from('boarding_houses').update({ name: bhName, address: bhAddress }).eq('id', bh.id);
    if (error) toast.error(error.message);
    else toast.success('Boarding house updated');
  };

  const copyCode = () => {
    if (bh) {
      navigator.clipboard.writeText(bh.join_code);
      toast.success('Join code copied!');
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen pb-24 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400">Account and property management</p>
      </div>

      <div className="space-y-6">
        {/* Profile Details */}
        <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Profile Details</h3>
            </div>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Full Name</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} className="h-12 rounded-xl border-gray-100" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Phone Number</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-12 rounded-xl border-gray-100" />
              </div>
              <Button onClick={saveProfile} className="w-full h-12 rounded-xl bg-[#1e4d2b] hover:bg-[#163a20] text-white font-bold text-sm">
                Update Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Boarding House Details */}
        <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Home className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Property Info</h3>
            </div>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Property Name</Label>
                <Input value={bhName} onChange={e => setBhName(e.target.value)} className="h-12 rounded-xl border-gray-100" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Address</Label>
                <Input value={bhAddress} onChange={e => setBhAddress(e.target.value)} className="h-12 rounded-xl border-gray-100" />
              </div>
              <Button onClick={saveBh} className="w-full h-12 rounded-xl bg-[#1e4d2b] hover:bg-[#163a20] text-white font-bold text-sm">
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <QrCode className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Payment Accounts</h3>
                <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">Used for receiving rent</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-4">
                <h4 className="text-sm font-black text-[#1a1a1a]">GCash</h4>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">GCash Number</Label>
                  <Input placeholder="e.g. 09123456789" value={gcashNumber} onChange={e => setGcashNumber(e.target.value)} className="h-12 rounded-xl border-gray-100" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Account Name</Label>
                  <Input placeholder="e.g. Juan De La Cruz" value={gcashName} onChange={e => setGcashName(e.target.value)} className="h-12 rounded-xl border-gray-100" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">GCash QR Code</Label>
                  <div className="flex flex-col gap-3">
                    {gcashQrUrl && (
                      <div className="relative w-32 h-32 rounded-xl border border-gray-100 overflow-hidden bg-white">
                        <img src={gcashQrUrl} alt="GCash QR" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleQrUpload(e, 'gcash')} 
                      disabled={uploading === 'gcash'}
                      className="h-12 rounded-xl border-gray-100 bg-white" 
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-4">
                <h4 className="text-sm font-black text-[#1a1a1a]">PayMaya (Maya)</h4>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Maya Number</Label>
                  <Input placeholder="e.g. 09123456789" value={mayaNumber} onChange={e => setMayaNumber(e.target.value)} className="h-12 rounded-xl border-gray-100" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Account Name</Label>
                  <Input placeholder="e.g. Juan De La Cruz" value={mayaName} onChange={e => setMayaName(e.target.value)} className="h-12 rounded-xl border-gray-100" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Maya QR Code</Label>
                  <div className="flex flex-col gap-3">
                    {mayaQrUrl && (
                      <div className="relative w-32 h-32 rounded-xl border border-gray-100 overflow-hidden bg-white">
                        <img src={mayaQrUrl} alt="Maya QR" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleQrUpload(e, 'maya')} 
                      disabled={uploading === 'maya'}
                      className="h-12 rounded-xl border-gray-100 bg-white" 
                    />
                  </div>
                </div>
              </div>

              <Button onClick={saveProfile} className="w-full h-12 rounded-xl bg-[#1e4d2b] hover:bg-[#163a20] text-white font-bold text-sm">
                Save Payment Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Invitation Center */}
        {bh && (
          <Card className="border border-dashed border-gray-200 bg-gray-50 shadow-none rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-amber-600" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Invitation Code</h3>
              </div>

              <div className="flex flex-col items-center">
                <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
                  <QRCodeSVG value={`boardease://join?code=${bh.join_code}`} size={160} fgColor="#1e4d2b" />
                </div>

                <div className="w-full flex items-center gap-2 mb-3">
                  <Input value={bh.join_code} readOnly className="h-12 rounded-xl bg-white border-gray-100 font-mono text-center text-lg font-bold text-[#1e4d2b] tracking-wider" />
                  <Button variant="outline" size="icon" onClick={copyCode} className="h-12 w-12 rounded-xl shrink-0 border-gray-100">
                    <Copy className="h-4 w-4 text-[#1e4d2b]" />
                  </Button>
                </div>
                <p className="text-[10px] font-bold text-gray-400 text-center uppercase tracking-widest leading-relaxed">
                  Share this unique code to register new tenants.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Danger Zone */}
        <div className="pt-4">
          <Button variant="ghost" onClick={signOut} className="w-full h-12 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-bold text-xs tracking-widest uppercase">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LandlordSettings;
