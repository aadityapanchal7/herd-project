-- Add coordinate columns to universities table
ALTER TABLE universities 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS zoom_level INTEGER DEFAULT 15;

-- Update coordinates for universities
UPDATE universities SET 
  latitude = 37.4275, 
  longitude = -122.1697,
  zoom_level = 15
WHERE name = 'Stanford University';

UPDATE universities SET 
  latitude = 42.3601, 
  longitude = -71.0942,
  zoom_level = 15
WHERE name = 'Massachusetts Institute of Technology';

UPDATE universities SET 
  latitude = 42.3770, 
  longitude = -71.1167,
  zoom_level = 15
WHERE name = 'Harvard University';

UPDATE universities SET 
  latitude = 37.8719, 
  longitude = -122.2585,
  zoom_level = 15
WHERE name = 'University of California, Berkeley';

UPDATE universities SET 
  latitude = 42.2780, 
  longitude = -83.7382,
  zoom_level = 15
WHERE name = 'University of Michigan';

UPDATE universities SET 
  latitude = 30.2849, 
  longitude = -97.7341,
  zoom_level = 15
WHERE name = 'University of Texas at Austin';

UPDATE universities SET 
  latitude = 40.7295, 
  longitude = -73.9965,
  zoom_level = 14
WHERE name = 'New York University';

UPDATE universities SET 
  latitude = 47.6553, 
  longitude = -122.3035,
  zoom_level = 15
WHERE name = 'University of Washington';

UPDATE universities SET 
  latitude = 34.0689, 
  longitude = -118.4452,
  zoom_level = 15
WHERE name = 'University of California, Los Angeles';

UPDATE universities SET 
  latitude = 39.9522, 
  longitude = -75.1932,
  zoom_level = 15
WHERE name = 'University of Pennsylvania';

UPDATE universities SET 
  latitude = 42.4534, 
  longitude = -76.4735,
  zoom_level = 15
WHERE name = 'Cornell University';

UPDATE universities SET 
  latitude = 41.7886, 
  longitude = -87.5987,
  zoom_level = 15
WHERE name = 'University of Chicago';

UPDATE universities SET 
  latitude = 40.8075, 
  longitude = -73.9626,
  zoom_level = 15
WHERE name = 'Columbia University';

UPDATE universities SET 
  latitude = 41.3163, 
  longitude = -72.9223,
  zoom_level = 15
WHERE name = 'Yale University';

UPDATE universities SET 
  latitude = 40.3431, 
  longitude = -74.6551,
  zoom_level = 15
WHERE name = 'Princeton University';

UPDATE universities SET 
  latitude = 36.0014, 
  longitude = -78.9382,
  zoom_level = 15
WHERE name = 'Duke University';

UPDATE universities SET 
  latitude = 43.0766, 
  longitude = -89.4125,
  zoom_level = 15
WHERE name = 'University of Wisconsin-Madison';

UPDATE universities SET 
  latitude = 40.1020, 
  longitude = -88.2272,
  zoom_level = 15
WHERE name = 'University of Illinois Urbana-Champaign';

UPDATE universities SET 
  latitude = 33.7756, 
  longitude = -84.3963,
  zoom_level = 15
WHERE name = 'Georgia Institute of Technology';

UPDATE universities SET 
  latitude = 29.6436, 
  longitude = -82.3549,
  zoom_level = 15
WHERE name = 'University of Florida';

-- Set default coordinates for any universities without coordinates (center of US)
UPDATE universities SET 
  latitude = 39.8283, 
  longitude = -98.5795,
  zoom_level = 4
WHERE latitude IS NULL;
