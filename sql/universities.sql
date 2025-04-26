-- Create universities table
CREATE TABLE IF NOT EXISTS universities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  location TEXT NOT NULL,
  abbreviation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample universities
INSERT INTO universities (name, location, abbreviation)
VALUES
  ('Stanford University', 'Stanford, CA', 'Stanford'),
  ('Massachusetts Institute of Technology', 'Cambridge, MA', 'MIT'),
  ('Harvard University', 'Cambridge, MA', 'Harvard'),
  ('University of California, Berkeley', 'Berkeley, CA', 'UC Berkeley'),
  ('University of Michigan', 'Ann Arbor, MI', 'UMich'),
  ('University of Texas at Austin', 'Austin, TX', 'UT Austin'),
  ('New York University', 'New York, NY', 'NYU'),
  ('University of Washington', 'Seattle, WA', 'UW'),
  ('University of California, Los Angeles', 'Los Angeles, CA', 'UCLA'),
  ('University of Pennsylvania', 'Philadelphia, PA', 'UPenn'),
  ('Cornell University', 'Ithaca, NY', 'Cornell'),
  ('University of Chicago', 'Chicago, IL', 'UChicago'),
  ('Columbia University', 'New York, NY', 'Columbia'),
  ('Yale University', 'New Haven, CT', 'Yale'),
  ('Princeton University', 'Princeton, NJ', 'Princeton'),
  ('Duke University', 'Durham, NC', 'Duke'),
  ('University of Wisconsin-Madison', 'Madison, WI', 'UW-Madison'),
  ('University of Illinois Urbana-Champaign', 'Champaign, IL', 'UIUC'),
  ('Georgia Institute of Technology', 'Atlanta, GA', 'Georgia Tech'),
  ('University of Florida', 'Gainesville, FL', 'UF')
ON CONFLICT (name) DO NOTHING;

-- Set up Row Level Security (RLS)
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read universities
CREATE POLICY "Universities are viewable by everyone" 
ON universities FOR SELECT 
USING (true);
