import { supabase } from "./supabase"

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

export async function getUniversities(): Promise<University[]> {
  try {
    const { data, error } = await supabase.from("universities").select("*").order("name", { ascending: true })

    if (error) {
      console.error("Error fetching universities:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Failed to fetch universities:", error)
    return []
  }
}

export async function getUniversityByName(name: string): Promise<University | null> {
  try {
    const { data, error } = await supabase.from("universities").select("*").eq("name", name).single()

    if (error) {
      console.error("Error fetching university:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Failed to fetch university:", error)
    return null
  }
}
