-- Create OTP table for storing one-time passwords
CREATE TABLE otps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_otps_email ON otps(email);
CREATE INDEX idx_otps_expires_at ON otps(expires_at);

-- Add Row Level Security (RLS)
ALTER TABLE otps ENABLE ROW LEVEL SECURITY;

-- Create policy to allow inserts and selects for OTP verification
CREATE POLICY "Allow OTP operations" ON otps
  FOR ALL USING (true);