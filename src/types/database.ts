export type AppRole = 'landlord' | 'tenant';

export type RoomStatus = 'occupied' | 'vacant';

export type PaymentMethod = 'cash' | 'gcash' | 'maya' | 'card';
export type PaymentStatus = 'pending' | 'paid' | 'overdue';

export type TicketStatus = 'new' | 'assigned' | 'in_progress' | 'done';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketCategory = 'plumbing' | 'electrical' | 'structural' | 'appliance' | 'pest_control' | 'other';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface BoardingHouse {
  id: string;
  landlord_id: string;
  name: string;
  address: string | null;
  join_code: string;
  created_at: string;
}

export interface Room {
  id: string;
  boarding_house_id: string;
  name: string;
  capacity: number;
  rent_amount: number;
  status: RoomStatus;
  created_at: string;
}

export interface Tenant {
  id: string;
  user_id: string;
  landlord_id: string;
  boarding_house_id: string;
  room_id: string | null;
  joined_at: string;
  profiles?: Profile;
  rooms?: Room;
}

export interface Payment {
  id: string;
  tenant_id: string;
  landlord_id: string;
  boarding_house_id: string;
  amount: number;
  method: PaymentMethod | null;
  reference_number: string | null;
  status: PaymentStatus;
  due_date: string;
  paid_at: string | null;
  created_at: string;
  tenants?: Tenant & { profiles?: Profile };
}

export interface Ticket {
  id: string;
  tenant_id: string;
  landlord_id: string;
  boarding_house_id: string;
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  description: string | null;
  photos: string[] | null;
  created_at: string;
  tenants?: Tenant & { profiles?: Profile };
}

export interface Announcement {
  id: string;
  landlord_id: string;
  boarding_house_id: string;
  title: string;
  content: string;
  created_at: string;
}
