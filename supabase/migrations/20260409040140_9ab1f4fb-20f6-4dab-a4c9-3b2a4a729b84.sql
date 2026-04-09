
-- Enable realtime for rooms and tenants
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenants;

-- Create a secure function to assign a tenant to a room with capacity check
CREATE OR REPLACE FUNCTION public.assign_room_to_tenant(
  _tenant_id uuid,
  _room_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _room rooms%ROWTYPE;
  _current_count integer;
  _tenant tenants%ROWTYPE;
BEGIN
  -- Get tenant record
  SELECT * INTO _tenant FROM tenants WHERE id = _tenant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tenant not found');
  END IF;

  -- Verify the caller is the tenant
  IF _tenant.user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get room with lock
  SELECT * INTO _room FROM rooms WHERE id = _room_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;

  -- Check room belongs to same boarding house
  IF _room.boarding_house_id != _tenant.boarding_house_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room does not belong to your boarding house');
  END IF;

  -- Count current occupants
  SELECT COUNT(*) INTO _current_count FROM tenants WHERE room_id = _room_id;

  -- Check capacity
  IF _current_count >= _room.capacity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room is full');
  END IF;

  -- Assign room
  UPDATE tenants SET room_id = _room_id WHERE id = _tenant_id;

  -- Update room status
  IF _current_count + 1 >= _room.capacity THEN
    UPDATE rooms SET status = 'occupied' WHERE id = _room_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Allow landlords to update tenants (e.g., reassign rooms)
CREATE POLICY "Landlords can update tenants"
ON public.tenants
FOR UPDATE
TO authenticated
USING (auth.uid() = landlord_id)
WITH CHECK (auth.uid() = landlord_id);

-- Allow landlords to view tenant profiles
CREATE POLICY "Landlords can view tenant profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tenants t WHERE t.user_id = profiles.id AND t.landlord_id = auth.uid()
  )
);
