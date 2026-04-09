import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { DoorOpen, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Room } from '@/types/database';

interface RoomWithOccupancy extends Room {
  current_occupants: number;
}

interface Props {
  tenantId: string;
  boardingHouseId: string;
  onRoomSelected: () => void;
}

export const RoomSelection = ({ tenantId, boardingHouseId, onRoomSelected }: Props) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<RoomWithOccupancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  const fetchRooms = async () => {
    const { data: roomsData } = await supabase
      .from('rooms')
      .select('*')
      .eq('boarding_house_id', boardingHouseId)
      .order('name');

    if (!roomsData) { setRooms([]); setLoading(false); return; }

    // Get occupant counts
    const { data: tenants } = await supabase
      .from('tenants')
      .select('room_id')
      .eq('boarding_house_id', boardingHouseId)
      .not('room_id', 'is', null);

    const counts: Record<string, number> = {};
    (tenants || []).forEach(t => {
      if (t.room_id) counts[t.room_id] = (counts[t.room_id] || 0) + 1;
    });

    setRooms(roomsData.map(r => ({
      ...r,
      current_occupants: counts[r.id] || 0,
    })));
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('room-selection')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `boarding_house_id=eq.${boardingHouseId}` }, () => fetchRooms())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants', filter: `boarding_house_id=eq.${boardingHouseId}` }, () => fetchRooms())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [boardingHouseId]);

  const selectRoom = async (roomId: string) => {
    if (!user) return;
    setSelecting(roomId);

    const { data, error } = await supabase.rpc('assign_room_to_tenant', {
      _tenant_id: tenantId,
      _room_id: roomId,
    });

    setSelecting(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    const result = data as any;
    if (!result?.success) {
      toast.error(result?.error || 'Failed to select room');
      fetchRooms(); // Refresh to show updated state
      return;
    }

    toast.success('Room selected successfully!');
    onRoomSelected();
  };

  if (loading) {
    return (
      <div className="space-y-6 pt-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4">
      <div>
        <h2 className="text-2xl font-bold">Select a Room</h2>
        <p className="text-muted-foreground">Choose an available room to move in</p>
      </div>

      {rooms.length === 0 ? (
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <DoorOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No rooms available yet. Please wait for your landlord to add rooms.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rooms.map(room => {
            const isFull = room.current_occupants >= room.capacity;
            return (
              <Card key={room.id} className={`rounded-2xl border-0 shadow-sm transition-shadow ${isFull ? 'opacity-60' : 'hover:shadow-md'}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg">{room.name}</h3>
                    <Badge
                      variant={isFull ? 'destructive' : 'secondary'}
                      className="rounded-full"
                    >
                      {isFull ? 'Full' : 'Available'}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="font-medium text-foreground">
                        {room.current_occupants}/{room.capacity}
                      </span>
                      <span>occupants</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">₱{room.rent_amount.toLocaleString()}</span>
                      <span>/month</span>
                    </div>
                  </div>
                  {/* Capacity bar */}
                  <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isFull ? 'bg-destructive' : 'bg-primary'}`}
                      style={{ width: `${(room.current_occupants / room.capacity) * 100}%` }}
                    />
                  </div>
                  <Button
                    onClick={() => selectRoom(room.id)}
                    className="w-full mt-4 rounded-xl"
                    disabled={isFull || selecting === room.id}
                  >
                    {selecting === room.id ? 'Selecting...' : isFull ? 'Room Full' : 'Select Room'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
