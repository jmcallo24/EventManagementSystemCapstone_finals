import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import ParticipantDashboard from "./pages/ParticipantDashboard";
import EventRequest from "./pages/EventRequest";
import NotFound from "./pages/NotFound";
import Calendar from "./pages/Calendar";
import Notifications from "./pages/Notifications";
import Participants from "./pages/Participants";
import VenueAndRegistration from "./pages/Venue-And-Registration";
import Approvals from "./pages/approvals";
import AdminReports from "./pages/AdminReports";
import AdminAnalytics from "./pages/AdminAnalytics";
import Multimedia from "./pages/multimedia";
import AdminMultimedia from "./pages/AdminMultimedia";
import AdminProgramFlow from "./pages/AdminProgramFlow";
 

// 1. Change the wrapper to use a white background
const WhiteWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen min-w-full bg-white">
    {children}
  </div>
);

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = localStorage.getItem("user");
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WhiteWrapper><Index /></WhiteWrapper>} />
          <Route path="/login" element={<WhiteWrapper><Login /></WhiteWrapper>} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <WhiteWrapper>
                  <Dashboard />
                </WhiteWrapper>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/organizer-dashboard" 
            element={
              <ProtectedRoute>
                <WhiteWrapper>
                  <OrganizerDashboard />
                </WhiteWrapper>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/participant-dashboard" 
            element={
              <ProtectedRoute>
                <WhiteWrapper>
                  <ParticipantDashboard />
                </WhiteWrapper>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/event-request"
            element={
              <ProtectedRoute>
                <WhiteWrapper>
                  <EventRequest />
                </WhiteWrapper>
              </ProtectedRoute>
            } 
          />
        
          <Route path="/calendar" element={
            <ProtectedRoute>
              <WhiteWrapper>
                <Calendar />
              </WhiteWrapper>
            </ProtectedRoute>
          } />
          <Route 
            path="/notifications" 
            element={
              <ProtectedRoute>
                <WhiteWrapper>
                <Notifications/>
                </WhiteWrapper>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/participants" 
            element={
              <ProtectedRoute>
                <WhiteWrapper>
                <Participants/>
                </WhiteWrapper>
              </ProtectedRoute>
            } 
          />
          <Route
            path="/venue"
            element={
              <ProtectedRoute>
                <WhiteWrapper>
                 <VenueAndRegistration/> 
                </WhiteWrapper>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/program" 
            element={
              <ProtectedRoute>
                <WhiteWrapper>
                  <AdminProgramFlow/> 
                </WhiteWrapper>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/multimedia" 
            element={
              <ProtectedRoute>
                <WhiteWrapper>
                  <Multimedia/> 
                </WhiteWrapper>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin-multimedia" 
            element={
              <ProtectedRoute>
                <WhiteWrapper>
                  <AdminMultimedia/> 
                </WhiteWrapper>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/approvals" 
            element={
               <ProtectedRoute>
                <WhiteWrapper>
                 <Approvals/> 
                </WhiteWrapper>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin-reports" 
            element={
               <ProtectedRoute>
                <WhiteWrapper>
                 <AdminReports/> 
                </WhiteWrapper>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin-program-flow" 
            element={
               <ProtectedRoute>
                <WhiteWrapper>
                 <AdminProgramFlow/> 
                </WhiteWrapper>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/feedback" 
            element={
              <ProtectedRoute>
                <WhiteWrapper>
                  <AdminReports/> 
                </WhiteWrapper>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports" 
            element={
              <ProtectedRoute>
                <WhiteWrapper>
                  <AdminAnalytics/> 
                </WhiteWrapper>
              </ProtectedRoute>
            } 
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<WhiteWrapper><NotFound /></WhiteWrapper>} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;