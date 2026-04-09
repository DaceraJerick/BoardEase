import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Megaphone, Calendar, Quote, Trash2 } from 'lucide-react';
import type { Announcement } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';

const LandlordAnnouncements = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });

  const fetchData = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .eq('landlord_id', user.id)
      .order('created_at', { ascending: false });
    setAnnouncements(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { data: bh } = await supabase.from('boarding_houses').select('id').eq('landlord_id', user.id).maybeSingle();
    if (!bh) { toast.error('No boarding house found'); return; }

    const { error } = await supabase.from('announcements').insert({
      landlord_id: user.id,
      boarding_house_id: bh.id,
      title: form.title,
      content: form.content,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Announcement posted');
    setDialogOpen(false);
    setForm({ title: '', content: '' });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Announcement deleted');
    fetchData();
  };

  return (
    <div className="p-6 bg-white min-h-screen pb-24">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-sm text-gray-400">Communication with your tenants</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl bg-[#1e4d2b] hover:bg-[#163a20] flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Post
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl p-8 border-gray-100 sm:max-w-[425px]">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-bold">New Announcement</DialogTitle>
              <p className="text-xs text-gray-400">Share important updates with all tenants</p>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Title</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Schedule for Water Tank Cleaning" required className="h-12 rounded-xl border-gray-100" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Content</Label>
                <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} placeholder="Write your announcement details here..." required className="rounded-xl border-gray-100" />
              </div>
              <Button type="submit" className="w-full h-14 rounded-2xl bg-[#1e4d2b] hover:bg-[#163a20] text-white font-bold text-sm">
                Post Announcement
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-4">
           <Skeleton className="h-32 rounded-2xl" />
           <Skeleton className="h-32 rounded-2xl" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="py-20 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-100">
          <Megaphone className="h-10 w-10 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400 font-medium">No announcements found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map(a => (
            <Card key={a.id} className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex items-start gap-4 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <Quote className="h-5 w-5 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 leading-tight">{a.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3 text-gray-300" />
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{new Date(a.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="ml-auto h-8 w-8 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-full"
                    onClick={() => handleDelete(a.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-50">
                  <p className="text-xs text-gray-500 font-medium leading-relaxed">
                     {a.content}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LandlordAnnouncements;
