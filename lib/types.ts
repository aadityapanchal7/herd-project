export type EventCategory = "Social" | "Academic" | "Sports" | "Arts" | "All"

export interface Event {
  id: number
  title: string
  category: Exclude<EventCategory, "All">
  description: string
  date: string
  time: string
  location: string
  max_attendees: number 
  current_attendees: number
  verified: boolean
  created_by: string
  created_at: string
  university_id?: number
  latitude?: number
  longitude?: number
  creator_name?: string;
  is_private: boolean;

}

export interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  university: string
  avatar_url?: string
}

export interface EventRSVP {
  id: number
  event_id: number
  user_id: string
  created_at: string
}

export interface University {
  id: number
  name: string
  location: string
  abbreviation?: string
  primary_color: string
  secondary_color: string
  text_color: string
  latitude: number
  longitude: number
  zoom_level: number
}


