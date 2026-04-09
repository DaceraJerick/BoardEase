
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role text;
  _full_name text;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email)
  ON CONFLICT (id) DO NOTHING;

  -- Create user role
  _role := NEW.raw_user_meta_data->>'role';
  IF _role IS NOT NULL AND _role IN ('landlord', 'tenant') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- If landlord, create boarding house
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'My');
  IF _role = 'landlord' THEN
    INSERT INTO public.boarding_houses (landlord_id, name, join_code)
    VALUES (NEW.id, _full_name || '''s Boarding House', upper(substr(md5(random()::text), 1, 6)));
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure unique constraint on user_roles for ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_role_key'
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END $$;
