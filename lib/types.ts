export interface Client {
  id: string
  name: string
  email: string
  phone?: string
  source?: string
  visit_count: number
  last_visit?: string
  health_notes?: string
  created_at: string
}

export interface Service {
  id: string
  name: string
  slug: string
  description?: string
  duration_minutes: number
  price: number
  prep_instructions?: string
  is_active: boolean
  created_at: string
}

export interface Booking {
  id: string
  client_id?: string
  service_id?: string
  appointment_date: string
  appointment_time: string
  location_type: string
  location_address?: string
  wellness_goal?: string
  symptoms?: string
  status: string
  is_new_client: boolean
  confirmation_sent: boolean
  reminder_sent: boolean
  followup_sent: boolean
  created_at: string
  // joined
  client?: Client
  service?: Service
}

export interface AiLog {
  id: string
  booking_id?: string
  client_id?: string
  trigger: string
  action: string
  result: string
  reasoning?: string
  created_at: string
  // joined
  client?: Client
  booking?: Booking
}

export interface Settings {
  [key: string]: string
}
