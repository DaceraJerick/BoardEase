
# BoardEase — Boarding House Management App

## Overview
A single unified app with two role-based panels (Landlord & Tenant), connected via Supabase Auth and a QR-based tenant join system. Philippine Peso (₱) currency throughout.

## Design System
- **Primary:** #1A5C38 (deep green), **Secondary:** #0F6E56 (teal)
- **Background:** #F8F9F5, **Cards:** white, rounded-2xl, soft shadow
- **Accent:** #D97706 (warning), **Danger:** #DC2626
- Mobile-first responsive, clean SaaS dashboard aesthetic
- Skeleton loaders, smooth transitions, toast notifications

## Authentication & Routing
- Single login page (email/password + Google OAuth option)
- Signup includes role selection (Landlord or Tenant)
- Role stored in `user_roles` table (security best practice)
- Post-login redirect: Landlord → `/landlord`, Tenant → `/tenant`
- Protected routes based on role

## Database Schema (Supabase)
- **profiles** — id (FK auth.users), full_name, email, phone, avatar_url, created_at
- **user_roles** — id, user_id (FK auth.users), role (enum: landlord, tenant)
- **boarding_houses** — id, landlord_id, name, address, join_code, created_at
- **rooms** — id, boarding_house_id, name, capacity, rent_amount, status (occupied/vacant)
- **tenants** — id, user_id (FK auth.users), landlord_id, boarding_house_id, room_id, joined_at
- **payments** — id, tenant_id, landlord_id, boarding_house_id, amount, method (cash/gcash/maya/card), reference_number, status (pending/paid/overdue), due_date, paid_at
- **tickets** — id, tenant_id, landlord_id, title, category, priority, status (new/assigned/in_progress/done), description, photos (array), created_at
- **announcements** — id, landlord_id, boarding_house_id, title, content, created_at
- RLS policies enforcing tenant_id = auth.uid() or landlord_id = auth.uid()

## QR Code Join System
- Each boarding house gets a unique `join_code`
- Landlord "Invite Tenant" button → modal with QR code + join code + copy button
- Tenant onboarding: if no landlord assigned → "Join Boarding House" screen with QR scanner (camera) or manual code entry
- On join: assigns tenant to boarding house and redirects to tenant dashboard

## Landlord Panel (`/landlord/*`)
- **Sidebar navigation:** Dashboard, Rooms, Tenants, Payments, Tickets, Announcements, Settings
- **Dashboard:** Stats cards (revenue, overdue payments, vacant rooms, open tickets), recent activity, quick actions
- **Rooms:** Grid of room cards with status badges, add/edit room modal
- **Tenants:** Searchable list, tenant profiles
- **Payments:** Payment tracking table, manual payment entry, filter by status
- **Tickets:** Kanban board (New → Assigned → In Progress → Done), assign tickets
- **Announcements:** Create/send notices
- **Settings:** Profile, boarding house info, QR/join code management

## Tenant Panel (`/tenant/*`)
- **Bottom navigation:** Home, Pay, Requests, Receipts, Profile
- **Home:** Rent status card (amount, due date, status badge), "Pay Now" CTA
- **Pay Rent:** Payment method selection, reference number input, submit
- **Receipts:** Payment history list with download option
- **Maintenance Requests:** Submit ticket form (title, category, priority, photo upload), status timeline
- **Announcements:** View landlord notices
- **Profile:** Edit info, view room, logout

## Key Libraries
- `qrcode.react` for QR generation
- `html5-qrcode` for QR scanning
- `@tanstack/react-query` for data fetching
- `react-router-dom` for routing
- `sonner` for toast notifications
- `lucide-react` for icons

## Implementation Order
1. Design system setup (colors, theme)
2. Supabase schema + RLS policies
3. Auth flow (login, signup, role selection, redirect)
4. Landlord panel (dashboard, rooms, tenants, payments, tickets, announcements, settings)
5. Tenant panel (home, pay, requests, receipts, profile)
6. QR code join system
7. Polish (skeletons, empty states, transitions)
