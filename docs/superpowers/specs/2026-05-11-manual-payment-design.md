# Manual Payment System Design

Implementation of a manual payment verification system for BoardEase Residences, replacing the automatic PayMongo flow.

## Goal
To allow tenants to pay via GCash or Maya manually by viewing the landlord's account details and uploading a screenshot of the receipt for landlord verification.

## Components

### 1. Database Schema Updates (Supabase)
- **Profiles Table**:
    - `gcash_qr_url` (TEXT): URL to the uploaded GCash QR code image.
    - `maya_qr_url` (TEXT): URL to the uploaded Maya QR code image.
- **Payments Table**:
    - `receipt_url` (TEXT): URL to the uploaded receipt screenshot.
    - `status` (payment_status): Maintain existing statuses but use 'pending' for payments with uploaded receipts.

### 2. Storage (Supabase)
- **Bucket**: `receipts` (Public or with appropriate RLS for landlord to view).
- **Bucket**: `payment_qrs` (Public for tenants to view).

### 3. Landlord Features
- **Settings Page**:
    - Add file uploaders for GCash and Maya QR codes.
    - Save URLs to the `profiles` table.
- **Payments Page**:
    - Display uploaded receipts for pending payments.
    - "Approve" button to set status to 'paid' and update `paid_at`.

### 4. Tenant Features
- **Payment Page**:
    - Remove PayMongo API calls.
    - Display landlord's GCash/Maya Name, Number, and QR Code image.
    - Add file uploader for the receipt screenshot.
    - Update `payments` record with `receipt_url` and set status to 'pending'.

## Data Flow
1. Landlord uploads QR codes in Settings.
2. Tenant selects payment method in Pay page.
3. Tenant pays via external GCash/Maya app.
4. Tenant uploads receipt screenshot in Pay page.
5. `payments` record is updated in Supabase.
6. Landlord receives notification (optional) and reviews in Payments page.
7. Landlord approves; Revenue updates on Dashboard.

## Security
- Use Supabase Storage RLS to ensure only the tenant can upload their receipt and only the landlord can view it (if possible, otherwise public with random names).
- Ensure `receipt_url` is only updatable by the tenant.
