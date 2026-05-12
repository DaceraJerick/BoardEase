-- add payment settings to profiles
ALTER TABLE public.profiles
ADD COLUMN gcash_number TEXT,
ADD COLUMN gcash_name TEXT,
ADD COLUMN maya_number TEXT,
ADD COLUMN maya_name TEXT;
