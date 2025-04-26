import { supabase } from "@/lib/supabase"
import { getUniversities } from "@/lib/universities"
import { geocodeLocation } from "@/lib/geocoding"

// Sample event templates for different categories
const eventTemplates = {
  Social: [
    {
      title: "Welcome Mixer",
      description:
        "Meet fellow students and faculty at our start-of-semester social event with refreshments and activities.",
      locations: ["Student Union", "Main Quad", "Campus Center"],
      maxAttendees: [50, 100, 150],
      timeOptions: ["18:00", "19:00", "20:00"],
    },
    {
      title: "Cultural Festival",
      description: "Celebrate diversity with performances, food, and activities from cultures around the world.",
      locations: ["International Center", "Main Quad", "Arts Building"],
      maxAttendees: [200, 300, 400],
      timeOptions: ["12:00", "13:00", "14:00"],
    },
    {
      title: "Game Night",
      description: "Join us for board games, video games, and fun competitions with prizes.",
      locations: ["Student Lounge", "Recreation Center", "Dormitory Common Room"],
      maxAttendees: [30, 40, 50],
      timeOptions: ["19:00", "20:00", "21:00"],
    },
  ],
  Academic: [
    {
      title: "Research Symposium",
      description: "Undergraduate and graduate students present their research projects across all disciplines.",
      locations: ["Science Building", "Library", "Conference Center"],
      maxAttendees: [100, 150, 200],
      timeOptions: ["10:00", "13:00", "15:00"],
    },
    {
      title: "Guest Lecture Series",
      description: "Distinguished speaker discussing cutting-edge developments in their field.",
      locations: ["Lecture Hall", "Auditorium", "Conference Room"],
      maxAttendees: [75, 100, 125],
      timeOptions: ["16:00", "17:00", "18:00"],
    },
    {
      title: "Study Group Formation",
      description: "Find study partners and form groups for upcoming exams and projects.",
      locations: ["Library", "Study Center", "Academic Building"],
      maxAttendees: [20, 30, 40],
      timeOptions: ["15:00", "16:00", "17:00"],
    },
  ],
  Sports: [
    {
      title: "Intramural Tournament",
      description: "Compete in our semester intramural sports tournament with teams from across campus.",
      locations: ["Recreation Center", "Sports Field", "Gymnasium"],
      maxAttendees: [100, 150, 200],
      timeOptions: ["14:00", "15:00", "16:00"],
    },
    {
      title: "Fitness Workshop",
      description: "Learn proper techniques and health tips from certified fitness instructors.",
      locations: ["Fitness Center", "Yoga Studio", "Recreation Room"],
      maxAttendees: [25, 35, 45],
      timeOptions: ["17:00", "18:00", "19:00"],
    },
    {
      title: "Outdoor Adventure",
      description: "Join us for hiking, climbing, or other outdoor activities near campus.",
      locations: ["Campus Green", "Outdoor Center", "Meeting Point"],
      maxAttendees: [20, 30, 40],
      timeOptions: ["09:00", "10:00", "11:00"],
    },
  ],
  Arts: [
    {
      title: "Student Art Exhibition",
      description: "Showcasing artwork created by talented students across all departments.",
      locations: ["Art Gallery", "Exhibition Hall", "Arts Building"],
      maxAttendees: [75, 100, 125],
      timeOptions: ["17:00", "18:00", "19:00"],
    },
    {
      title: "Theater Performance",
      description: "Student-directed play featuring our talented drama department.",
      locations: ["Theater", "Auditorium", "Performance Space"],
      maxAttendees: [50, 75, 100],
      timeOptions: ["19:00", "19:30", "20:00"],
    },
    {
      title: "Music Concert",
      description: "Live performances by student musicians and bands from various genres.",
      locations: ["Concert Hall", "Amphitheater", "Music Building"],
      maxAttendees: [60, 80, 100],
      timeOptions: ["19:00", "20:00", "21:00"],
    },
  ],
}

// Generate random dates within the next 30 days
function generateRandomDate() {
  const now = new Date()
  const futureDate = new Date(now.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000)
  return futureDate
}

// Format date for database
function formatDate(date: Date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

// Random selection from array
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Generate events for a specific university
async function generateEventsForUniversity(
  universityId: number,
  universityName: string,
  adminUserId: string,
  eventsPerCategory = 3,
) {
  const categories = Object.keys(eventTemplates) as Array<keyof typeof eventTemplates>
  const events = []

  for (const category of categories) {
    for (let i = 0; i < eventsPerCategory; i++) {
      const template = randomChoice(eventTemplates[category])
      const eventDate = generateRandomDate()
      const formattedDate = formatDate(eventDate)
      const location = `${randomChoice(template.locations)}, ${universityName}`
      const maxAttendees = randomChoice(template.maxAttendees)
      const time = randomChoice(template.timeOptions)

      // Try to geocode the location
      let coordinates = null
      try {
        coordinates = await geocodeLocation(`${location}, ${universityName}`)
      } catch (error) {
        console.error(`Failed to geocode location for ${location}:`, error)
      }

      events.push({
        title: template.title,
        category,
        description: template.description,
        date: formattedDate,
        time,
        location,
        max_attendees: maxAttendees,
        current_attendees: Math.floor(Math.random() * (maxAttendees / 2)),
        verified: Math.random() > 0.3, // 70% chance of being verified
        created_by: adminUserId,
        university_id: universityId,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
      })
    }
  }

  return events
}

// Main function to generate sample events
export async function generateSampleEvents() {
  try {
    console.log("Starting sample event generation...")

    // Get all universities
    const universities = await getUniversities()
    if (universities.length === 0) {
      console.error("No universities found")
      return
    }

    // Get or create admin user for sample events
    let adminUserId
    const { data: existingAdmin } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", "admin@herdapp.com")
      .single()

    if (existingAdmin) {
      adminUserId = existingAdmin.id
    } else {
      // Create admin user if doesn't exist
      const { data: authUser, error: authError } = await supabase.auth.signUp({
        email: "admin@herdapp.com",
        password: "Admin123!",
        options: {
          data: {
            first_name: "Admin",
            last_name: "User",
            university: universities[0].name,
          },
        },
      })

      if (authError || !authUser.user) {
        console.error("Failed to create admin user:", authError)
        return
      }

      adminUserId = authUser.user.id
    }

    // Delete existing sample events
    await supabase.from("events").delete().eq("created_by", adminUserId)

    // Generate and insert events for each university
    for (const university of universities) {
      console.log(`Generating events for ${university.name}...`)
      const events = await generateEventsForUniversity(university.id, university.name, adminUserId)

      // Insert events in batches
      const { error } = await supabase.from("events").insert(events)
      if (error) {
        console.error(`Error inserting events for ${university.name}:`, error)
      } else {
        console.log(`Successfully created ${events.length} events for ${university.name}`)
      }
    }

    console.log("Sample event generation completed!")
  } catch (error) {
    console.error("Error generating sample events:", error)
  }
}

// Execute if this file is run directly
if (typeof window === "undefined" && require.main === module) {
  generateSampleEvents()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Error:", error)
      process.exit(1)
    })
}
