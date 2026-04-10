import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Search, UserPlus, Users, Mail, Phone, ShieldCheck, Calendar, MapPin, X, Box } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { InviteTenantDialog } from '@/components/landlord/InviteTenantDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';

const LandlordTenants = () => {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<any>(null);

  const fetchTenants = async () => {
    if (!user) return;
    const { data: tenantData } = await supabase.from('tenants').select('*').eq('landlord_id', user.id);
    if (!tenantData) { setTenants([]); setLoading(false); return; }
    
    const [profileRes, roomRes] = await Promise.all([
      supabase.from('profiles').select('*').in('id', tenantData.map(t => t.user_id)),
      supabase.from('rooms').select('id, name').in('id', tenantData.filter(t => t.room_id).map(t => t.room_id!))
    ]);

    const enriched = tenantData.map(t => ({
      ...t,
      profile: profileRes.data?.find(p => p.id === t.user_id),
      room: roomRes.data?.find(r => r.id === t.room_id),
    }));

    setTenants(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchTenants();
  }, [user]);

  const filtered = tenants.filter(t => {
    const name = t.profile?.full_name || '';
    const email = t.profile?.email || '';
    const room = t.room?.name || '';
    return name.toLowerCase().includes(search.toLowerCase()) || 
           email.toLowerCase().includes(search.toLowerCase()) ||
           room.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="p-6 bg-white min-h-screen pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
        <p className="text-sm text-gray-400">{tenants.length} total tenants</p>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
        <Input 
          placeholder="Search tenants..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className="pl-12 h-12 rounded-xl border-gray-100 shadow-sm"
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          [1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-100">
            <Users className="h-10 w-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400 font-medium">No tenants found</p>
          </div>
        ) : (
          filtered.map((tenant) => (
            <Card 
              key={tenant.id} 
              className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
              onClick={() => setSelectedTenant(tenant)}
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-[#1e4d2b] font-bold text-lg overflow-hidden border border-emerald-100">
                    {tenant.profile?.avatar_url ? (
                      <img src={tenant.profile.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      tenant.profile?.full_name?.charAt(0) || 'T'
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{tenant.profile?.full_name || 'Anonymous'}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{tenant.room?.name || 'Unassigned'}</p>
                  </div>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-0 rounded-lg px-2 text-[9px] font-bold uppercase">ACTIVE</Badge>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Tenant Details Modal */}
      <Dialog open={!!selectedTenant} onOpenChange={() => setSelectedTenant(null)}>
        <DialogContent className="rounded-3xl p-0 overflow-hidden border-0 max-w-md bg-[#fcfaf6]">
          {selectedTenant && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Profile Header */}
              <div className="bg-[#1e4d2b] p-8 text-center relative">
                <button 
                  onClick={() => setSelectedTenant(null)}
                  className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="mx-auto w-24 h-24 rounded-[2rem] bg-white p-1 shadow-2xl mb-4">
                  <div className="w-full h-full rounded-[1.75rem] bg-emerald-50 flex items-center justify-center text-[#1e4d2b] text-3xl font-black overflow-hidden">
                    {selectedTenant.profile?.avatar_url ? (
                      <img src={selectedTenant.profile.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      selectedTenant.profile?.full_name?.charAt(0) || 'T'
                    )}
                  </div>
                </div>
                <h2 className="text-xl font-black text-white tracking-tight">{selectedTenant.profile?.full_name}</h2>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full mt-2 border border-white/10">
                  <MapPin className="h-3 w-3 text-white/70" />
                  <span className="text-[9px] font-black text-white/90 uppercase tracking-widest">
                    {selectedTenant.room?.name || 'Unassigned'}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Joined Date</p>
                    <div className="flex items-center gap-2">
                       <Calendar className="h-3 w-3 text-[#1e4d2b]" />
                       <span className="text-xs font-bold text-gray-700">
                         {selectedTenant.joined_at ? format(new Date(selectedTenant.joined_at), 'MMM dd, yyyy') : '---'}
                       </span>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                    <div className="flex items-center gap-2">
                       <ShieldCheck className="h-3 w-3 text-emerald-500" />
                       <span className="text-xs font-bold text-emerald-600">Verified Tenant</span>
                    </div>
                  </div>
                </div>

                {/* Contact Section */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Contact Details</h4>
                  <div className="space-y-2">
                    <a 
                      href={`mailto:${selectedTenant.profile?.email}`}
                      className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-50 shadow-sm hover:border-[#1e4d2b]/20 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-blue-500" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 truncate max-w-[200px]">{selectedTenant.profile?.email || 'No email provided'}</span>
                      </div>
                      <Box className="h-3 w-3 text-gray-200 group-hover:text-blue-500" />
                    </a>
                    
                    <a 
                      href={`tel:${selectedTenant.profile?.phone}`}
                      className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-50 shadow-sm hover:border-[#1e4d2b]/20 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                          <Phone className="h-4 w-4 text-emerald-500" />
                        </div>
                        <span className="text-xs font-bold text-gray-600">{selectedTenant.profile?.phone || 'No phone number'}</span>
                      </div>
                      <Box className="h-3 w-3 text-gray-200 group-hover:text-emerald-500" />
                    </a>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Emergency Contact</h4>
                  <div className="bg-amber-50/50 p-5 rounded-[2rem] border border-amber-100/50">
                    {selectedTenant.profile?.emergency_contact_name ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] font-black text-amber-600/60 uppercase tracking-widest mb-0.5">Contact Person</p>
                          <p className="text-sm font-black text-gray-800">{selectedTenant.profile.emergency_contact_name}</p>
                          <p className="text-[10px] font-bold text-amber-600/80 uppercase tracking-tighter mt-0.5">{selectedTenant.profile.emergency_contact_relationship}</p>
                        </div>
                        <a 
                          href={`tel:${selectedTenant.profile.emergency_contact_phone}`}
                          className="inline-flex items-center gap-2 text-xs font-black text-amber-700 bg-amber-100 px-4 py-2 rounded-xl hover:bg-amber-200 transition-colors"
                        >
                          <Phone className="h-3 w-3" />
                          {selectedTenant.profile.emergency_contact_phone}
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600/60 font-medium italic text-center py-2">No emergency contact information provided by tenant.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-24 right-6">
        <InviteTenantDialog trigger={
          <Button className="h-14 w-14 rounded-2xl bg-[#1e4d2b] hover:bg-[#163a20] shadow-xl flex items-center justify-center p-0">
            <UserPlus className="h-6 w-6 text-white" />
          </Button>
        } />
      </div>
    </div>
  );
};

export default LandlordTenants;
