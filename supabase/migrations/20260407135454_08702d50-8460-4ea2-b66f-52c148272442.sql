
-- Enums
CREATE TYPE public.app_role AS ENUM ('landlord', 'tenant');
CREATE TYPE public.room_status AS ENUM ('occupied', 'vacant');
CREATE TYPE public.payment_method AS ENUM ('cash', 'gcash', 'maya', 'card');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'overdue');
CREATE TYPE public.ticket_status AS ENUM ('new', 'assigned', 'in_progress', 'done');
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.ticket_category AS ENUM ('plumbing', 'electrical', 'structural', 'appliance', 'pest_control', 'other');

-- Tables (in dependency order)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT, email TEXT, phone TEXT, avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE TABLE public.boarding_houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, address TEXT,
  join_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boarding_house_id UUID NOT NULL REFERENCES public.boarding_houses(id) ON DELETE CASCADE,
  name TEXT NOT NULL, capacity INT NOT NULL DEFAULT 1,
  rent_amount NUMERIC NOT NULL DEFAULT 0,
  status public.room_status NOT NULL DEFAULT 'vacant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES auth.users(id),
  boarding_house_id UUID NOT NULL REFERENCES public.boarding_houses(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES auth.users(id),
  landlord_id UUID NOT NULL REFERENCES auth.users(id),
  boarding_house_id UUID NOT NULL REFERENCES public.boarding_houses(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL, method public.payment_method,
  reference_number TEXT, status public.payment_status NOT NULL DEFAULT 'pending',
  due_date DATE NOT NULL, paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES auth.users(id),
  landlord_id UUID NOT NULL REFERENCES auth.users(id),
  boarding_house_id UUID NOT NULL REFERENCES public.boarding_houses(id) ON DELETE CASCADE,
  title TEXT NOT NULL, category public.ticket_category NOT NULL DEFAULT 'other',
  priority public.ticket_priority NOT NULL DEFAULT 'medium',
  status public.ticket_status NOT NULL DEFAULT 'new',
  description TEXT, photos TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES auth.users(id),
  boarding_house_id UUID NOT NULL REFERENCES public.boarding_houses(id) ON DELETE CASCADE,
  title TEXT NOT NULL, content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boarding_houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- Boarding houses policies
CREATE POLICY "Landlords can manage own boarding houses" ON public.boarding_houses FOR ALL TO authenticated USING (auth.uid() = landlord_id) WITH CHECK (auth.uid() = landlord_id);
CREATE POLICY "Anyone can view boarding houses" ON public.boarding_houses FOR SELECT TO authenticated USING (true);

-- Rooms policies
CREATE POLICY "Landlords can manage rooms" ON public.rooms FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.boarding_houses bh WHERE bh.id = rooms.boarding_house_id AND bh.landlord_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.boarding_houses bh WHERE bh.id = rooms.boarding_house_id AND bh.landlord_id = auth.uid()));
CREATE POLICY "Tenants can view rooms" ON public.rooms FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenants t WHERE t.boarding_house_id = rooms.boarding_house_id AND t.user_id = auth.uid()));

-- Tenants policies
CREATE POLICY "Landlords can view their tenants" ON public.tenants FOR SELECT TO authenticated USING (auth.uid() = landlord_id);
CREATE POLICY "Tenants can view own record" ON public.tenants FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Tenants can insert own record" ON public.tenants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Payments policies
CREATE POLICY "Landlords can manage payments" ON public.payments FOR ALL TO authenticated USING (auth.uid() = landlord_id) WITH CHECK (auth.uid() = landlord_id);
CREATE POLICY "Tenants can view own payments" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = tenant_id);
CREATE POLICY "Tenants can update own payments" ON public.payments FOR UPDATE TO authenticated USING (auth.uid() = tenant_id) WITH CHECK (auth.uid() = tenant_id);

-- Tickets policies
CREATE POLICY "Landlords can manage tickets" ON public.tickets FOR ALL TO authenticated USING (auth.uid() = landlord_id) WITH CHECK (auth.uid() = landlord_id);
CREATE POLICY "Tenants can view own tickets" ON public.tickets FOR SELECT TO authenticated USING (auth.uid() = tenant_id);
CREATE POLICY "Tenants can create tickets" ON public.tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = tenant_id);

-- Announcements policies
CREATE POLICY "Landlords can manage announcements" ON public.announcements FOR ALL TO authenticated USING (auth.uid() = landlord_id) WITH CHECK (auth.uid() = landlord_id);
CREATE POLICY "Tenants can view announcements" ON public.announcements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenants t WHERE t.boarding_house_id = announcements.boarding_house_id AND t.user_id = auth.uid()));

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
