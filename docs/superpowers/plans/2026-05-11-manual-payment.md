# Manual Payment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace PayMongo with a manual payment flow where tenants view landlord's GCash/Maya info and upload a receipt for verification.

**Architecture:** 
- **Storage**: Supabase buckets for receipts and QR codes.
- **Database**: Add `receipt_url` to `payments` and `gcash_qr_url`/`maya_qr_url` to `profiles`.
- **UI**: High-fidelity React components using Tailwind CSS and shadcn/ui.

**Tech Stack:** React, Supabase (DB & Storage), Tailwind CSS.

---

### Task 1: Database & Storage Configuration

**Files:**
- Create: `supabase/migrations/20260511140000_manual_payment_fields.sql`

- [ ] **Step 1: Create migration for new fields**
```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gcash_qr_url TEXT,
ADD COLUMN IF NOT EXISTS maya_qr_url TEXT;

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS receipt_url TEXT;
```

- [ ] **Step 2: Create Storage Buckets (Manual via Dashboard or SQL if possible)**
```sql
-- Ensure buckets exist
-- insert into storage.buckets (id, name, public) values ('receipts', 'receipts', true);
-- insert into storage.buckets (id, name, public) values ('payment_qrs', 'payment_qrs', true);
```

---

### Task 2: Landlord QR Code Management

**Files:**
- Modify: `src/pages/landlord/Settings.tsx`

- [ ] **Step 1: Add QR Code uploaders to Landlord Settings**
Update the "Payment Accounts" card to include file inputs for QR code images.

- [ ] **Step 2: Implement Upload Logic**
Use `supabase.storage.from('payment_qrs').upload()` to store images and update the profile.

---

### Task 3: Tenant Manual Payment Interface

**Files:**
- Modify: `src/pages/tenant/Pay.tsx`

- [ ] **Step 1: Remove PayMongo Logic**
Strip out PayMongo secret key usage and the fetch call to PayMongo API.

- [ ] **Step 2: Display Landlord Info & QR**
Display `gcash_qr_url` and `maya_qr_url` from the landlord's profile.

- [ ] **Step 3: Add Receipt Uploader**
Add a file input for the receipt screenshot.

- [ ] **Step 4: Update Submit Handler**
Upload receipt to storage and update `payments` record.

---

### Task 4: Landlord Payment Verification

**Files:**
- Modify: `src/pages/landlord/Payments.tsx`

- [ ] **Step 1: Show Receipt Preview**
Add a way to view the receipt image for pending payments.

- [ ] **Step 2: Implement Approval Action**
Add an "Approve" button to finalize the payment.

---

### Task 5: Dashboard Revenue Logic

**Files:**
- Modify: `src/pages/landlord/Dashboard.tsx`

- [ ] **Step 1: Update Revenue Logic**
Ensure revenue only counts 'paid' status.
