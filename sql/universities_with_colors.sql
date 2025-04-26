-- Alter universities table to add color columns
ALTER TABLE universities 
ADD COLUMN IF NOT EXISTS primary_color TEXT,
ADD COLUMN IF NOT EXISTS secondary_color TEXT,
ADD COLUMN IF NOT EXISTS text_color TEXT;

-- Update existing universities with their colors
UPDATE universities SET 
  primary_color = '#8C1515', 
  secondary_color = '#4D4F53',
  text_color = '#FFFFFF'
WHERE name = 'Stanford University';

UPDATE universities SET 
  primary_color = '#A31F34', 
  secondary_color = '#8A8B8C',
  text_color = '#FFFFFF'
WHERE name = 'Massachusetts Institute of Technology';

UPDATE universities SET 
  primary_color = '#A41034', 
  secondary_color = '#000000',
  text_color = '#FFFFFF'
WHERE name = 'Harvard University';

UPDATE universities SET 
  primary_color = '#003262', 
  secondary_color = '#FDB515',
  text_color = '#FFFFFF'
WHERE name = 'University of California, Berkeley';

UPDATE universities SET 
  primary_color = '#00274C', 
  secondary_color = '#FFCB05',
  text_color = '#FFFFFF'
WHERE name = 'University of Michigan';

UPDATE universities SET 
  primary_color = '#BF5700', 
  secondary_color = '#333F48',
  text_color = '#FFFFFF'
WHERE name = 'University of Texas at Austin';

UPDATE universities SET 
  primary_color = '#57068C', 
  secondary_color = '#FFFFFF',
  text_color = '#FFFFFF'
WHERE name = 'New York University';

UPDATE universities SET 
  primary_color = '#4B2E83', 
  secondary_color = '#B7A57A',
  text_color = '#FFFFFF'
WHERE name = 'University of Washington';

UPDATE universities SET 
  primary_color = '#2774AE', 
  secondary_color = '#FFD100',
  text_color = '#FFFFFF'
WHERE name = 'University of California, Los Angeles';

UPDATE universities SET 
  primary_color = '#011F5B', 
  secondary_color = '#990000',
  text_color = '#FFFFFF'
WHERE name = 'University of Pennsylvania';

UPDATE universities SET 
  primary_color = '#B31B1B', 
  secondary_color = '#222222',
  text_color = '#FFFFFF'
WHERE name = 'Cornell University';

UPDATE universities SET 
  primary_color = '#800000', 
  secondary_color = '#767676',
  text_color = '#FFFFFF'
WHERE name = 'University of Chicago';

UPDATE universities SET 
  primary_color = '#0072CE', 
  secondary_color = '#D9E1E2',
  text_color = '#FFFFFF'
WHERE name = 'Columbia University';

UPDATE universities SET 
  primary_color = '#00356B', 
  secondary_color = '#FFFFFF',
  text_color = '#FFFFFF'
WHERE name = 'Yale University';

UPDATE universities SET 
  primary_color = '#F58025', 
  secondary_color = '#000000',
  text_color = '#FFFFFF'
WHERE name = 'Princeton University';

UPDATE universities SET 
  primary_color = '#012169', 
  secondary_color = '#00539B',
  text_color = '#FFFFFF'
WHERE name = 'Duke University';

UPDATE universities SET 
  primary_color = '#C5050C', 
  secondary_color = '#9B0000',
  text_color = '#FFFFFF'
WHERE name = 'University of Wisconsin-Madison';

UPDATE universities SET 
  primary_color = '#13294B', 
  secondary_color = '#E84A27',
  text_color = '#FFFFFF'
WHERE name = 'University of Illinois Urbana-Champaign';

UPDATE universities SET 
  primary_color = '#B3A369', 
  secondary_color = '#003057',
  text_color = '#FFFFFF'
WHERE name = 'Georgia Institute of Technology';

UPDATE universities SET 
  primary_color = '#FA4616', 
  secondary_color = '#0021A5',
  text_color = '#FFFFFF'
WHERE name = 'University of Florida';

-- Set default colors for any universities without colors
UPDATE universities SET 
  primary_color = '#8a70d6', 
  secondary_color = '#7a60c6',
  text_color = '#FFFFFF'
WHERE primary_color IS NULL;
