-- Add university_id column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS university_id INTEGER REFERENCES universities(id);

-- Update existing events to associate with universities based on creator's university
UPDATE events
SET university_id = (
  SELECT u.id 
  FROM universities u 
  JOIN profiles p ON u.name = p.university 
  WHERE p.id = events.created_by
)
WHERE university_id IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_events_university_id ON events(university_id);
