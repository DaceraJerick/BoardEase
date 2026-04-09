import { useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LogOut, 
  Calendar, 
  Pencil, 
  Lock, 
  ShieldCheck,
  Plus,
  Loader2,
  Camera,
  Check,
  X as CloseIcon
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const TenantProfile = () => {
  const { user, profile, signOut } = useAuth();
  const [tenantData, setTenantData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Emergency Contact States
  const [isEditingEmergency, setIsEditingEmergency] = useState(false);
  const [emergencyInfo, setEmergencyInfo] = useState({
    name: '',
    phone: '',
    relation: ''
  });
  const [savingEmergency, setSavingEmergency] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;
    
    // Set initial emergency info from profile
    setEmergencyInfo({
      name: profile.emergency_contact_name || '',
      phone: profile.emergency_contact_phone || '',
      relation: profile.emergency_contact_relationship || ''
    });

    const fetchTenantData = async () => {
      const { data } = await supabase
        .from('tenants')
        .select('*, rooms(name)')
        .eq('user_id', user.id)
        .single();
      
      if (data) setTenantData(data);
      setLoading(false);
    };
    fetchTenantData();
  }, [user, profile]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success('Profile picture updated!');
      window.location.reload(); // Refresh to update all instances of avatar
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const saveEmergencyInfo = async () => {
    if (!user) return;
    setSavingEmergency(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          emergency_contact_name: emergencyInfo.name,
          emergency_contact_phone: emergencyInfo.phone,
          emergency_contact_relationship: emergencyInfo.relation
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Emergency contact updated');
      setIsEditingEmergency(false);
    } catch (error: any) {
      toast.error('Did you run the SQL migration? ' + error.message);
    } finally {
      setSavingEmergency(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const parseRoomName = (fullName: string) => {
    if (!fullName) return { room: '--', floor: '--' };
    const parts = fullName.split(' - ');
    return {
      room: parts[0].replace('Room ', ''),
      floor: parts[1]?.split(' ')[0] || '1st'
    };
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 text-[#065f46] animate-spin" />
    </div>
  );

  const roomInfo = parseRoomName(tenantData?.rooms?.name);
  const initials = getInitials(profile?.full_name || 'User');

  return (
    <div className="space-y-8 pt-6 pb-24 max-w-lg mx-auto w-full px-4">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleAvatarUpload} 
        className="hidden" 
        accept="image/*"
      />

      {/* Profile Header */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative group">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-xl bg-[#065f46] flex items-center justify-center transition-transform hover:scale-105">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-3xl font-black">{initials}</span>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            )}
          </div>
          <button 
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-1 right-0 w-9 h-9 bg-[#065f46] text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:bg-[#047857] transition-all"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
        </div>
        
        <div className="text-center">
          <h2 className="text-2xl font-black text-[#1a1a1a] tracking-tight">
            {profile?.full_name}
          </h2>
          <p className="text-xs font-bold text-[#065f46] uppercase tracking-widest mt-1 px-3 py-1 bg-emerald-50 rounded-full inline-block">
            Active Resident
          </p>
        </div>
      </div>

      {/* Quick Info Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="rounded-[2.5rem] border-0 shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Room</p>
            <p className="text-2xl font-black text-[#065f46] tracking-tight">{roomInfo.room}</p>
          </CardContent>
        </Card>
        
        <Card className="rounded-[2.5rem] border-0 shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Floor</p>
            <p className="text-2xl font-black text-[#1a1a1a] tracking-tight">{roomInfo.floor}</p>
          </CardContent>
        </Card>
      </div>

      {/* Joined Date Card */}
      <Card className="rounded-[2rem] border-0 shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Move-in Date</p>
            <p className="text-lg font-black text-[#1a1a1a] tracking-tight">
              {tenantData?.joined_at ? format(new Date(tenantData.joined_at), 'MMM dd, yyyy') : '---'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-lg font-black text-[#1a1a1a] tracking-tight">Contact Information</h3>
          <ShieldCheck className="h-4 w-4 text-[#065f46]" />
        </div>
        
        <div className="space-y-3">
          <div className="p-5 bg-gray-50 rounded-[1.5rem] border border-gray-100 transition-all">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Email Address</p>
            <p className="text-sm font-bold text-gray-700">{profile?.email || 'N/A'}</p>
          </div>
          
          <div className="p-5 bg-gray-50 rounded-[1.5rem] border border-gray-100 transition-all">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Phone Number</p>
            <p className="text-sm font-bold text-gray-700">{profile?.phone || 'Add phone number'}</p>
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="space-y-4 pt-2">
        <h3 className="text-lg font-black text-[#1a1a1a] tracking-tight px-2">Emergency Contact</h3>
        
        <div className={`p-6 bg-gray-50 rounded-[2.5rem] border-2 border-dashed ${isEditingEmergency ? 'border-[#065f46] bg-emerald-50/20' : 'border-gray-200'} transition-all`}>
          {!isEditingEmergency ? (
            <>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <Plus className="h-6 w-6 text-emerald-600 rotate-45" />
                </div>
                <div>
                  <p className="text-sm font-black text-[#1a1a1a]">
                    {emergencyInfo.name || 'No contact yet'}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400">
                    {emergencyInfo.relation ? `${emergencyInfo.relation} • ` : ''}{emergencyInfo.phone || 'Updates needed'}
                  </p>
                </div>
              </div>
              
              <Button 
                onClick={() => setIsEditingEmergency(true)}
                variant="ghost" 
                className="w-full bg-white rounded-2xl h-14 font-black text-[#1a1a1a] shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                <Plus className="mr-2 h-4 w-4" /> Edit Emergency Info
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</Label>
                <Input 
                  value={emergencyInfo.name} 
                  onChange={e => setEmergencyInfo({...emergencyInfo, name: e.target.value})} 
                  placeholder="e.g. Paciano Rizal" 
                  className="rounded-xl border-gray-100 h-12"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Relationship</Label>
                <Input 
                  value={emergencyInfo.relation} 
                  onChange={e => setEmergencyInfo({...emergencyInfo, relation: e.target.value})} 
                  placeholder="e.g. Brother" 
                  className="rounded-xl border-gray-100 h-12"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Phone Number</Label>
                <Input 
                  value={emergencyInfo.phone} 
                  onChange={e => setEmergencyInfo({...emergencyInfo, phone: e.target.value})} 
                  placeholder="+63 9xx..." 
                  className="rounded-xl border-gray-100 h-12"
                />
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={() => setIsEditingEmergency(false)} 
                  variant="outline" 
                  className="flex-1 rounded-xl h-12 font-bold"
                >
                  Cancel
                </Button>
                <Button 
                  disabled={savingEmergency}
                  onClick={saveEmergencyInfo} 
                  className="flex-1 rounded-xl h-12 bg-[#065f46] hover:bg-[#047857] font-bold"
                >
                  {savingEmergency ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Contact'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="space-y-3 pt-6">
        <button className="w-full flex items-center justify-center gap-2 py-3 text-sm font-black text-[#065f46] hover:underline transition-all">
          <Lock className="h-4 w-4" /> Change Password
        </button>

        <Button 
          onClick={signOut}
          className="w-full h-16 rounded-[2rem] bg-rose-50 hover:bg-rose-100 text-rose-600 border-0 shadow-none font-black text-lg gap-3 transition-all active:scale-[0.98]"
        >
          <LogOut className="h-5 w-5" /> Log Out
        </Button>
      </div>

      {/* Footer */}
      <div className="pt-8 text-center pb-20">
        <p className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.2em]">
          BoardEase v2.4.0 • Built for Sanctuary
        </p>
      </div>
    </div>
  );
};

// Helper for labels since I removed them from UI/label for speed
const Label = ({ children, className }: any) => (
  <label className={`block font-medium ${className}`}>{children}</label>
);

export default TenantProfile;
