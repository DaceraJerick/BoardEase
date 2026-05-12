-- Allow tenants to view their landlord's profile
DROP POLICY IF EXISTS "Tenants can view their landlord's profile" ON public.profiles;
CREATE POLICY "Tenants can view their landlord's profile"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT landlord_id FROM public.tenants WHERE user_id = auth.uid()
  )
  OR 
  id IN (
    SELECT bh.landlord_id 
    FROM public.tenants t
    JOIN public.boarding_houses bh ON t.boarding_house_id = bh.id
    WHERE t.user_id = auth.uid()
  )
  OR id = auth.uid()
);

-- Ensure public read access to storage buckets for payment QR codes and receipts
-- Note: These policies assume the buckets 'payment_qrs' and 'receipts' exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment_qrs', 'payment_qrs', true), ('receipts', 'receipts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for payment_qrs
DROP POLICY IF EXISTS "Public Access to Payment QRs" ON storage.objects;
CREATE POLICY "Public Access to Payment QRs"
ON storage.objects FOR SELECT
USING ( bucket_id = 'payment_qrs' );

DROP POLICY IF EXISTS "Landlords can upload QRs" ON storage.objects;
CREATE POLICY "Landlords can upload QRs"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'payment_qrs' AND auth.role() = 'authenticated' );

-- Storage policies for receipts
DROP POLICY IF EXISTS "Public Access to Receipts" ON storage.objects;
CREATE POLICY "Public Access to Receipts"
ON storage.objects FOR SELECT
USING ( bucket_id = 'receipts' );

DROP POLICY IF EXISTS "Tenants can upload receipts" ON storage.objects;
CREATE POLICY "Tenants can upload receipts"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'receipts' AND auth.role() = 'authenticated' );
