import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Search, UserPlus, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { InviteTenantDialog } from '@/components/landlord/InviteTenantDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const LandlordTenants = () => {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
            <Card key={tenant.id} className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-[#1e4d2b] font-bold text-lg">
                    {tenant.profile?.full_name?.charAt(0) || 'T'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{tenant.profile?.full_name || 'Anonymous'}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{tenant.room?.name || 'Unassigned'}</p>
                  </div>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-0 rounded-lg px-2 text-[9px] font-bold uppercase">PAID</Badge>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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
