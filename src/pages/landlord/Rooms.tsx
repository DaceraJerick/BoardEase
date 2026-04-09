import { useState, useEffect } from 'react'; // v2
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Bed, DoorOpen, Users, X, Trash2, Edit2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Room {
  id: string;
  name: string;
  capacity: number;
  rent_amount: number;
  boarding_house_id: string;
  status: 'vacant' | 'occupied';
  created_at: string;
}

const LandlordRooms = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'occupied' | 'vacant'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [newRoom, setNewRoom] = useState({ name: '', floor: '', capacity: 1, rent_amount: 4500 });
  const [occupancyCounts, setOccupancyCounts] = useState<Record<string, number>>({});

  const fetchRooms = async () => {
    if (!user) return;
    setLoading(true);
    const { data: bh } = await supabase.from('boarding_houses').select('id').eq('landlord_id', user.id).maybeSingle();
    if (!bh) { setLoading(false); return; }

    const [roomsRes, tenantsRes] = await Promise.all([
      supabase.from('rooms').select('*').eq('boarding_house_id', bh.id).order('name', { ascending: true }),
      supabase.from('tenants').select('room_id').eq('boarding_house_id', bh.id)
    ]);

    if (roomsRes.data) {
      setRooms(roomsRes.data as Room[]);
    }
    
    const counts: Record<string, number> = {};
    tenantsRes.data?.forEach(t => {
      if (t.room_id) counts[t.room_id] = (counts[t.room_id] || 0) + 1;
    });
    setOccupancyCounts(counts);
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
  }, [user]);

  const handleOpenAdd = () => {
    setEditingRoomId(null);
    setNewRoom({ name: '', floor: '', capacity: 1, rent_amount: 4500 });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (room: Room) => {
    setEditingRoomId(room.id);
    // Try to extract name and floor if they were combined
    const match = room.name.match(/^(.*) \((.*)\)$/);
    if (match) {
      setNewRoom({ name: match[1], floor: match[2], capacity: room.capacity, rent_amount: room.rent_amount });
    } else {
      setNewRoom({ name: room.name, floor: '', capacity: room.capacity, rent_amount: room.rent_amount });
    }
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this room? This cannot be undone.')) return;
    const { error } = await supabase.from('rooms').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Room deleted successfully');
    fetchRooms();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { data: bh } = await supabase.from('boarding_houses').select('id').eq('landlord_id', user.id).maybeSingle();
    if (!bh) return;

    const finalName = newRoom.floor 
      ? `${newRoom.name} (${newRoom.floor})`
      : newRoom.name;

    const roomData = { 
      name: finalName,
      capacity: newRoom.capacity || 1,
      rent_amount: newRoom.rent_amount || 0,
      boarding_house_id: bh.id,
      status: 'vacant' as const
    };

    if (editingRoomId) {
      const { error } = await supabase.from('rooms').update(roomData).eq('id', editingRoomId);
      if (error) { toast.error(error.message); return; }
      toast.success('Room updated successfully');
    } else {
      const { error } = await supabase.from('rooms').insert([roomData]);
      if (error) { toast.error(error.message); return; }
      toast.success('Room added successfully');
    }

    setIsDialogOpen(false);
    setNewRoom({ name: '', floor: '', capacity: 1, rent_amount: 4500 });
    setEditingRoomId(null);
    fetchRooms();
  };

  const filteredRooms = rooms.filter(room => {
    const occupantCount = occupancyCounts[room.id] || 0;
    const isOccupied = occupantCount >= room.capacity;
    if (filter === 'occupied') return isOccupied;
    if (filter === 'vacant') return !isOccupied;
    return true;
  });

  if (loading) return <div className="p-6 max-w-4xl mx-auto w-full space-y-4"><Skeleton className="h-10 w-40" /><Skeleton className="h-8 w-60" /><Skeleton className="h-10 w-full" /><Skeleton className="h-40 w-full" /></div>;

  return (
    <div className="p-6 bg-[#fcfdfc] min-h-screen pb-24 max-w-4xl mx-auto w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e4d2b]">Rooms</h1>
          <p className="text-sm text-gray-400">{rooms.length} total rooms</p>
        </div>
      </div>

      <div className="flex gap-2 mb-8 items-center overflow-x-auto scrollbar-hide">
        {['all', 'occupied', 'vacant'].map((f) => (
          <button 
            key={f}
            onClick={() => setFilter(f as typeof filter)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${filter === f ? 'bg-[#1e4d2b] text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}
          >
            {f.toUpperCase()} ({
              f === 'all' ? rooms.length :
              f === 'occupied' ? rooms.filter(r => (occupancyCounts[r.id] || 0) >= r.capacity).length :
              rooms.filter(r => (occupancyCounts[r.id] || 0) < r.capacity).length
            })
          </button>
        ))}
      </div>

      {filteredRooms.length > 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
          <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-50">
            {filteredRooms.map((room) => {
              const occupantCount = occupancyCounts[room.id] || 0;
              const isOccupied = occupantCount >= room.capacity;
              return (
                <div key={room.id} className="p-8 min-w-[280px] hover:bg-gray-50/50 transition-colors relative group">
                  <div className="absolute right-4 top-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-gray-400 hover:text-gray-900">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-2xl p-2 border-gray-100 shadow-xl">
                        <DropdownMenuItem onClick={() => handleOpenEdit(room)} className="rounded-xl flex items-center gap-2 text-xs font-bold py-3 px-4 focus:bg-gray-50">
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit Room
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(room.id)} className="rounded-xl flex items-center gap-2 text-xs font-bold py-3 px-4 text-rose-600 focus:bg-rose-50 focus:text-rose-600">
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete Room
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex justify-between items-start mb-6 pr-6">
                    <h3 className="text-base font-black text-gray-900 tracking-tight">{room.name}</h3>
                    <Badge className={`border-0 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-wider ${
                      isOccupied ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {isOccupied ? 'Occupied' : 'Vacant'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-2 text-gray-400">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                        <Users className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest">{occupantCount} / {room.capacity} OCCUPANCY</span>
                    </div>
                  </div>

                  <p className="text-xl font-black text-[#1e4d2b] tracking-tight">
                    ₱{(room.rent_amount || 0).toLocaleString()}
                    <span className="text-[10px] text-gray-300 ml-1 uppercase font-bold">PHP / MO</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-gray-100 rounded-[3rem] p-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-[#fcfaf6] flex items-center justify-center mb-6 shadow-inner">
            <Bed className="h-10 w-10 text-gray-200" />
          </div>
          <p className="text-sm text-gray-400 mb-2 font-black uppercase tracking-widest">No matching rooms</p>
          <p className="text-xs text-gray-300">Try changing your filter or add a new room.</p>
        </div>
      )}

      {/* Room Dialog (Add or Edit) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <div className="fixed bottom-24 right-6 flex items-center justify-center">
           <Button onClick={handleOpenAdd} className="h-16 w-16 rounded-[1.5rem] bg-[#1e4d2b] hover:bg-[#163a20] shadow-2xl shadow-emerald-900/30 flex items-center justify-center p-0 transition-transform hover:scale-105 active:scale-95">
              <Plus className="h-7 w-7 text-white" />
           </Button>
        </div>
        <DialogContent className="sm:max-w-[440px] rounded-[2.5rem] p-0 border-0 shadow-2xl overflow-hidden bg-white [&>button:last-child]:hidden">
          <div className="p-8 sm:p-10 relative">
            <DialogClose className="absolute right-6 top-6 w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors">
              <X className="h-5 w-5" />
            </DialogClose>
            
            <DialogHeader className="mb-8">
              <DialogTitle className="text-2xl font-black text-[#1a1a1a] tracking-tight">
                {editingRoomId ? 'Edit Room' : 'Add New Room'}
              </DialogTitle>
              <p className="text-xs font-bold text-gray-400 tracking-tight mt-1">Fill in the details below</p>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] font-black text-[#1a1a1a] uppercase tracking-[0.15em] ml-1">Room Name / #</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. Room 101" 
                  className="rounded-2xl border-gray-100 h-14 text-sm font-medium px-5 focus:ring-[#1e4d2b] focus:border-[#1e4d2b]" 
                  value={newRoom.name} 
                  onChange={(e) => setNewRoom({...newRoom, name: e.target.value})} 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="floor" className="text-[10px] font-black text-[#1a1a1a] uppercase tracking-[0.15em] ml-1">Floor</Label>
                  <Input 
                    id="floor" 
                    placeholder="e.g. 1st Floor" 
                    className="rounded-2xl border-gray-100 h-14 text-sm font-medium px-5" 
                    value={newRoom.floor} 
                    onChange={(e) => setNewRoom({...newRoom, floor: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity" className="text-[10px] font-black text-[#1a1a1a] uppercase tracking-[0.15em] ml-1">Capacity</Label>
                  <Input 
                    id="capacity" 
                    type="number" 
                    placeholder="1"
                    className="rounded-2xl border-gray-100 h-14 text-sm font-medium px-5" 
                    value={newRoom.capacity || ''} 
                    onChange={(e) => setNewRoom({...newRoom, capacity: parseInt(e.target.value) || 0})} 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rent" className="text-[10px] font-black text-[#1a1a1a] uppercase tracking-[0.15em] ml-1">Monthly Rent (₱)</Label>
                <Input 
                  id="rent" 
                  type="number" 
                  placeholder="e.g. 4500" 
                  className="rounded-2xl border-gray-100 h-14 text-sm font-medium px-5" 
                  value={newRoom.rent_amount || ''} 
                  onChange={(e) => setNewRoom({...newRoom, rent_amount: parseInt(e.target.value) || 0})} 
                  required 
                />
              </div>

              <Button type="submit" className="w-full h-16 rounded-[1.25rem] bg-[#1e4d2b] hover:bg-[#163a20] text-white font-black text-sm flex items-center justify-center gap-2 mt-4 shadow-xl shadow-emerald-900/20">
                <Plus className="h-5 w-5" />
                {editingRoomId ? 'Update Room' : 'Create Room'}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandlordRooms;
