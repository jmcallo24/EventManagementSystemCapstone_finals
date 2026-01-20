import { supabase } from './supabaseClient';

// Generate a 6-digit OTP
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTP in database with expiration
export const storeOTP = async (email: string, otp: string) => {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
  
  // First, delete any existing OTPs for this email
  await supabase
    .from('otps')
    .delete()
    .eq('email', email);
    
  // Insert new OTP
  const { error } = await supabase
    .from('otps')
    .insert([{
      email,
      otp,
      expires_at: expiresAt.toISOString(),
      used: false
    }]);
    
  return { error };
};

// Verify OTP
export const verifyOTP = async (email: string, otp: string) => {
  const { data, error } = await supabase
    .from('otps')
    .select('*')
    .eq('email', email)
    .eq('otp', otp)
    .eq('used', false)
    .gte('expires_at', new Date().toISOString())
    .single();
    
  if (error || !data) {
    return { valid: false, error: 'Invalid or expired OTP' };
  }
  
  // Mark OTP as used
  await supabase
    .from('otps')
    .update({ used: true })
    .eq('id', data.id);
    
  return { valid: true, error: null };
};

// Send OTP via email - USING YOUR GMAIL CREDENTIALS
export const sendOTPEmail = async (email: string, otp: string) => {
  try {
    console.log(`📧 Sending REAL EMAIL to: ${email}`);
    
    // Call your backend server that uses PHPMailer equivalent (Nodemailer)
    const response = await fetch('http://localhost:3001/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        otp: otp
      })
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log(`✅ REAL EMAIL SENT to ${email} using your Gmail!`);
      return { success: true, error: null };
    } else {
      throw new Error(result.error || 'Email sending failed');
    }

  } catch (error) {
    console.error('Email sending failed:', error);
    
    // Return error instead of showing alert
    return { success: false, error: 'Failed to send email. Please try again.' };
  }
};