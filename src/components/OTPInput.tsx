import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface OTPInputProps {
  onVerify: (otp: string) => void;
  onResend: () => void;
  email: string;
  isLoading?: boolean;
}

export const OTPInput = ({ onVerify, onResend, email, isLoading = false }: OTPInputProps) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits are entered
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      onVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    onResend();
    setCountdown(60);
    setCanResend(false);
    setOtp(['', '', '', '', '', '']);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Enter Verification Code</CardTitle>
        <CardDescription>
          We've sent a 6-digit verification code to {email}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center space-x-2">
          {otp.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="w-12 h-12 text-center text-lg font-semibold"
              disabled={isLoading}
            />
          ))}
        </div>
        
        <div className="text-center">
          {!canResend ? (
            <p className="text-sm text-gray-500">
              Resend code in {countdown}s
            </p>
          ) : (
            <Button 
              variant="link" 
              onClick={handleResend}
              disabled={isLoading}
              className="text-sm"
            >
              Resend verification code
            </Button>
          )}
        </div>

        <Button
          onClick={() => onVerify(otp.join(''))}
          disabled={otp.some(digit => digit === '') || isLoading}
          className="w-full"
        >
          {isLoading ? 'Verifying...' : 'Verify Code'}
        </Button>
      </CardContent>
    </Card>
  );
};