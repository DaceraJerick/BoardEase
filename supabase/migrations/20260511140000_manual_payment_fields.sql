-- Add QR code fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gcash_qr_url TEXT,
ADD COLUMN IF NOT EXISTS maya_qr_url TEXT;

-- Add receipt field to payments
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS receipt_url TEXT;
