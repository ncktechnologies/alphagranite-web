export interface IMember {
  id: string
  email: string
  first_name: string
  last_name: string
  middle_name?: string
  phone?: string
  date_of_birth?: string
  gender?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  church_id: string
  role: string
  profile_picture?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  membership_date?: string
  baptism_date?: string
  is_active: boolean
  is_verified: boolean
  created_at: string
  updated_at: string
}
export interface MembersResponse {
  items: IMember[]
  totalItems: number
  skip: number
  limit: number
}
export interface IChurch {
  id: string
  name: string
  description?: string
  phone: string
  logo?: string | null
  address: string
  email: string
  cover_image?: string | null
  city: string
  website?: string
  is_active: boolean
  state: string
  pastor_name: string
  is_verified: boolean
  country: string
  pastor_phone: string
  created_at: string
  postal_code: string
  pastor_email: string
  updated_at: string
  latitude?: number
  established_date: string
  denomination: string
  longitude?: number
  capacity?: number
}
export interface ChurchesResponse {
  items: IChurch[]
  totalItems: number
  skip: number
  limit: number

export interface IBulletin {
 id: string
  title: string
  bulletin_date: string
  content: string
  created_at?: string
  updated_at?: string
  is_published:boolean 
  church_id:string
  file_path:string | undefined
  file_type:string | undefined
}
export interface BulletinsResponse {
  items: IBulletin[]
  totalItems: number
  skip: number
  limit: number
}

export interface IEvent { 
  id: string
  title: string
  description: string
  location: string
  start_time: string // ISO datetime
  end_time: string // ISO datetime
  organizer_id: string
  church_id: string
  is_active: boolean
  created_at: string // ISO datetime
  updated_at: string // ISO datetime
  max_attendees: number
  event_type: string
  is_recurring: boolean
  recurrence_pattern: string
}
export interface IOnlineService { 
  id: string
  title: string
  url: string
  service_date: string // ISO datetime
  church_id: string
  is_archived: boolean
  view_count: number
  created_at: string // ISO datetime
  updated_at: string // ISO datetime
  description: string
  platform: string
  is_live: boolean
}

export interface IServiceTime { 
  id: string
  name: string
  day_of_week: number // 0-6 (Sunday = 0)
  start_time: string // Time format
  end_time: string // Time format
  church_id: string
  is_active: boolean
  created_at: string // ISO datetime
  updated_at: string // ISO datetime
  description: string
}

export interface IPrayerRequest { 
  id: string
  title: string
  description: string
  member_id: string
  church_id: string
  is_answered: boolean
  prayer_count: number
  created_at: string // ISO datetime
  updated_at: string // ISO datetime
  is_urgent: boolean
  is_anonymous: boolean
  is_public: boolean
}

export interface ITestimony { 
  id: string
  title: string
  content: string
  member_id: string
  church_id: string
  is_approved: boolean
  created_at: string // ISO datetime
  updated_at: string // ISO datetime
  is_public: boolean
}
export interface ITransaction {
  id: string
  transaction_type: string // "donation" | "tithe" | "offering" | "payment" | "topup" | "refund"
  amount: number
  payment_method: string // "wallet" | "mobile_money" | "bank_transfer" | "card"
  member_id: string
  status: string // "pending" | "completed" | "failed" | "cancelled"
  created_at: string // ISO datetime
  updated_at: string // ISO datetime
  currency: string // "USD" etc.
  description: string
  church_id: string
  reference_id: string
  meta_data: string
}
export interface EventsResponse {
  items: IEvent[]
  totalItems: number
  skip: number
  limit: number
}
export interface TestimoniesResponse {
  items: IEvent[]
  totalItems: number
  skip: number
  limit: number
}
export interface OnlineServicesResponse {
  items: IEvent[]
  totalItems: number
  skip: number
  limit: number
}
export interface ServiceTimesResponse {
  items: IServiceTime[]
  totalItems: number
  skip: number
  limit: number
}
export interface PrayerRequestsResponse {
  items: IPrayerRequest[]
  totalItems: number
  skip: number
  limit: number
}
export interface TransactionsResponse {
  items: ITransaction[]
  totalItems: number
  skip: number
  limit: number
}
