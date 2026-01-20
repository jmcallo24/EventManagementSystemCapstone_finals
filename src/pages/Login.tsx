import logo from "@/assets/image.png";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { OTPInput } from "@/components/OTPInput";
import { generateOTP, storeOTP, verifyOTP, sendOTPEmail } from "../lib/otpService";
import bcrypt from "bcryptjs";

const ROLES = [
  { label: "Participant", value: "participant" },
  { label: "Organizer", value: "organizer" },
  { label: "Admin", value: "admin" }
];

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ 
    name: "", 
    email: "", 
    password: "", 
    confirmPassword: "",
    role: "participant"
  });
  const [showOTP, setShowOTP] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();



const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", loginForm.email)
      .single();

    if (error || !user) {
      toast({
        title: "Login Failed",
        description: "Invalid email or password.",
        variant: "destructive"
      });
      return;
    }

    // Compare entered password with stored hash
    const isValidPassword = await bcrypt.compare(loginForm.password, user.password);

    if (!isValidPassword) {
      toast({
        title: "Login Failed",
        description: "Invalid email or password.",
        variant: "destructive"
      });
      return;
    }

    // Generate and send OTP
    const otp = generateOTP();
    const { error: otpError } = await storeOTP(user.email, otp);
    
    if (otpError) {
      toast({
        title: "Error",
        description: "Failed to generate OTP. Please try again.",
        variant: "destructive"
      });
      return;
    }

    const emailResult = await sendOTPEmail(user.email, otp);
    
    if (!emailResult.success) {
      toast({
        title: "Email Error",
        description: emailResult.error || "Failed to send email. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    // Show OTP input
    setPendingUser(user);
    setOtpEmail(user.email);
    setShowOTP(true);
    
    toast({
      title: "OTP Sent",
      description: `Verification code sent to ${user.email}`,
    });

  } catch (error) {
    toast({
      title: "Error",
      description: "An unexpected error occurred.",
      variant: "destructive"
    });
  } finally {
    setIsLoading(false);
  }
};

const handleOTPVerify = async (otp: string) => {
  setIsLoading(true);
  
  try {
    const { valid, error } = await verifyOTP(otpEmail, otp);
    
    if (!valid) {
      toast({
        title: "Invalid OTP",
        description: error || "Please check your code and try again.",
        variant: "destructive"
      });
      return;
    }

    // OTP verified successfully, complete login
    localStorage.setItem("user", JSON.stringify(pendingUser));

    toast({
      title: "Login Successful!",
      description: "Welcome to the School Event Management System",
    });

    // Redirect based on user role
    if (pendingUser.role === "organizer") {
      navigate("/organizer-dashboard");
    } else if (pendingUser.role === "participant") {
      navigate("/participant-dashboard");
    } else {
      navigate("/dashboard");
    }
    
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to verify OTP. Please try again.",
      variant: "destructive"
    });
  } finally {
    setIsLoading(false);
  }
};

const handleOTPResend = async () => {
  setIsLoading(true);
  
  try {
    const otp = generateOTP();
    const { error } = await storeOTP(otpEmail, otp);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to resend OTP. Please try again.",
        variant: "destructive"
      });
      return;
    }

    const emailResult = await sendOTPEmail(otpEmail, otp);
    
    if (!emailResult.success) {
      toast({
        title: "Email Error",
        description: emailResult.error || "Failed to send email. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "OTP Resent",
      description: `New verification code sent to ${otpEmail}`,
    });
    
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to resend OTP. Please try again.",
      variant: "destructive"
    });
  } finally {
    setIsLoading(false);
  }
};



  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (signupForm.password !== signupForm.confirmPassword) {
        toast({
          title: "Password Mismatch",
          description: "Please ensure both passwords match",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      console.log('🔄 Starting signup process...');
      
      // Hash password
      const hashedPassword = await bcrypt.hash(signupForm.password, 10);

      const { error } = await supabase
        .from("users")
        .insert([{
          name: signupForm.name,
          email: signupForm.email,
          password: hashedPassword,
          role: signupForm.role
        }]);

      if (error) {
        console.error('❌ Signup error:', error);
        toast({
          title: "Signup Failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        console.log('✅ Account created successfully!');
        toast({
          title: "✅ Account Created Successfully!",
          description: `Welcome ${signupForm.name}! Please login to continue.`,
        });
        
        // Reset signup form
        setSignupForm({ 
          name: "", 
          email: "", 
          password: "", 
          confirmPassword: "",
          role: "participant"
        });
        
        // Switch to login tab after successful signup
        setTimeout(() => {
          const loginTab = document.querySelector('[data-value="login"]') as HTMLElement;
          if (loginTab) {
            loginTab.click();
          } else {
            // Fallback method
            const loginTabTrigger = document.querySelector('button[value="login"]') as HTMLElement;
            if (loginTabTrigger) {
              loginTabTrigger.click();
            }
          }
        }, 1500);
      }
    } catch (error) {
      console.error('❌ Signup error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during signup.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5"></div>
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary rounded-full blur-3xl"></div>
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 gradient-primary rounded-2xl mb-4">
            <img src={logo} alt="Logo" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Event Manager</h1>
          <p className="text-muted-foreground">School Event Management System</p>
        </div>

        {showOTP ? (
          <OTPInput
            onVerify={handleOTPVerify}
            onResend={handleOTPResend}
            email={otpEmail}
            isLoading={isLoading}
          />
        ) : (
          <Card className="card-elevated bg-white border shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl gradient-primary bg-clip-text text-transparent">
                Welcome Back
              </CardTitle>
              <CardDescription>
                Sign in to manage your school events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
              
              {/* LOGIN */}
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="Enter your email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                        required 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" variant="gradient" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Signing In...
                      </div>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* SIGN UP */}
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      placeholder="Enter your full name"
                      value={signupForm.name}
                      onChange={(e) => setSignupForm({...signupForm, name: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input 
                      id="signup-email" 
                      type="email" 
                      placeholder="Enter your email"
                      value={signupForm.email}
                      onChange={(e) => setSignupForm({...signupForm, email: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input 
                      id="signup-password" 
                      type="password"
                      placeholder="Create a password"
                      value={signupForm.password}
                      onChange={(e) => setSignupForm({...signupForm, password: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input 
                      id="confirm-password" 
                      type="password"
                      placeholder="Confirm your password"
                      value={signupForm.confirmPassword}
                      onChange={(e) => setSignupForm({...signupForm, confirmPassword: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Select Role</Label>
                    <select
                      id="role"
                      className="w-full border rounded px-3 py-2"
                      value={signupForm.role}
                      onChange={e => setSignupForm({ ...signupForm, role: e.target.value })}
                      required
                    >
                      {ROLES.map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" variant="gradient" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Creating Account...
                      </div>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        )}
        
        <div className="mt-8 text-center text-muted-foreground text-sm">
          <p>© 2025 School Event Management System</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
