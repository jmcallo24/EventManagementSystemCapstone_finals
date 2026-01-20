import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle, 
  Plus, 
  TrendingUp, 
  AlertCircle,
  Activity,
  CalendarDays,
  MapPin,
  Bell,
  FileText,
  Award,
  Star,
  Heart,
  Share2,
  Download,
  LogOut,
  User,
  Settings,
  Filter,
  Search,
  Send,
  Workflow,
  Camera,
  MessageCircle,
  ThumbsUp,
  Eye,
  Share,
  Image,
  Video,
  Play
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import logo from "@/assets/image.png";
import { supabase } from "@/lib/supabaseClient";
import { registrationService } from "@/lib/registrationService";
import { useToast } from "@/hooks/use-toast";
import { 
  getAllMultimediaPosts, 
  likePost, 
  addComment, 
  getPostComments,
  MultimediaPost,
  MultimediaComment
} from "@/lib/multimediaService";

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  organizer_name: string;
  current_participants: number;
  max_participants: number;
  status: "pending" | "approved" | "rejected" | "completed";
  event_type: string;
  description: string;
  isRegistered: boolean;
  isFavorite: boolean;
  isMyEvent: boolean; // NEW - indicates if this is user's approved request
}

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  type: "event_approved" | "event_rejected" | "event_reminder" | "registration_confirmed" | "announcement";
  is_read: boolean;
  related_event_id?: string;
}

interface Report {
  id: string;
  title: string;
  description: string;
  report_type: "rejection_complaint" | "technical_issue" | "general_inquiry" | "event_feedback";
  status: "open" | "in_progress" | "resolved" | "closed";
  admin_response?: string;
  created_at: string;
  related_event_id?: string;
  event_title?: string;
}

interface ReportMessage {
  id: string;
  message: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  created_at: string;
}

interface EventRequest {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  event_type: string;
  expected_participants: number;
  requirements?: string;
  budget_estimate?: number;
  request_reason: string;
  status: "pending" | "approved" | "rejected" | "under_review";
  admin_comments?: string;
  created_at: string;
  form_data?: any; // Store complete official form data
}

interface ProgramFlowActivity {
  id?: string;
  time: string;
  title: string;
  description: string;
  location: string;
  duration: number;
  activity_type: 'activity' | 'break' | 'meal' | 'presentation' | 'workshop';
  is_active: boolean;
  order_index: number;
}

interface ProgramFlow {
  id: string;
  event_id: string;
  event_title: string;
  title: string;
  description: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  activities: ProgramFlowActivity[];
  admin_comments?: string;
  created_at: string;
  updated_at: string;
}

const ParticipantDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // UI States
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  
  // Calendar specific states
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [calendarSearch, setCalendarSearch] = useState("");
  const [calendarFilter, setCalendarFilter] = useState<'all' | 'upcoming' | 'today' | 'this_week' | 'this_month'>('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Events tab specific states
  const [eventsFilter, setEventsFilter] = useState<'all' | 'approved' | 'rejected' | 'pending' | 'my_events' | 'registered'>('all');
  const [eventsSearch, setEventsSearch] = useState("");
  
  // Event details modal
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  
  // Multimedia states (VIEW ONLY for participants)
  const [multimediaPosts, setMultimediaPosts] = useState<MultimediaPost[]>([]);
  const [newComment, setNewComment] = useState<{ [postId: string]: string }>({});
  const [postComments, setPostComments] = useState<{ [postId: string]: MultimediaComment[] }>({});
  const [showComments, setShowComments] = useState<{ [postId: string]: boolean }>({});
  
  // Program Flow states (VIEW ONLY for participants)
  const [approvedProgramFlows, setApprovedProgramFlows] = useState<ProgramFlow[]>([]);
  const [selectedProgramFlow, setSelectedProgramFlow] = useState<ProgramFlow | null>(null);
  const [showProgramFlowDetails, setShowProgramFlowDetails] = useState(false);
  
  // Event Request states
  const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState<string>("");
  const [selectedEventRequest, setSelectedEventRequest] = useState<EventRequest | null>(null);
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  
  // Reports states
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportMessages, setReportMessages] = useState<ReportMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newReportTitle, setNewReportTitle] = useState("");
  const [newReportDescription, setNewReportDescription] = useState("");
  const [newReportType, setNewReportType] = useState<"rejection_complaint" | "technical_issue" | "general_inquiry" | "event_feedback">("rejection_complaint");
  const [showNewReportForm, setShowNewReportForm] = useState(false);
  
  // Enhanced event request form with detailed fields to match admin form
  const [newEventRequest, setNewEventRequest] = useState({
    // Requester Details
    event_requested_by: "",
    position: "",
    organization: "",
    contact_number: "",
    
    // Event Information
    title: "",
    purpose_of_event: "Academic", // Dropdown field for purpose
    purpose_other: "", // For "Others" option
    participants: "", // Changed from expected_participants 
    modality: "Face-to-Face",
    date: "",
    time: "",
    venue: "",
    custom_venue: "", // For "Others" venue option
    specific_place: "", // Specific room/place within the venue
    overall_in_charge: "",
    
    // Event Committee Assignments
    invitation_committee: "",
    program_committee: "",
    sound_system_committee: "",
    stage_decoration_committee: "",
    demolition_cleanup_committee: "",
    food_refreshments_committee: "",
    safety_security_committee: "",
    documentation_committee: "",
    registration_committee: "",
    evaluation_committee: "",
    
    // Legacy fields for compatibility
    description: "",
    event_type: "Academic",
    expected_participants: 50,
    requirements: "",
    budget_estimate: 0,
    request_reason: ""
  });

  // Real data from Supabase
  const [events, setEvents] = useState<Event[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  // Auth check
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Check if user is participant
      if (parsedUser.role !== "participant") {
        if (parsedUser.role === "organizer") {
          navigate("/organizer-dashboard");
        } else {
          navigate("/dashboard");
        }
      }
    } else {
      navigate("/login");
    }
  }, [navigate]);

  // Load data when user is set
  useEffect(() => {
    if (user?.id) {
      loadEvents();
      loadCalendarEvents();
      loadNotifications();
      loadReports();
      loadEventRequests();
      loadMultimediaPosts(); // Load multimedia posts for viewing
      loadApprovedProgramFlows(); // Load approved program flows for viewing
    }
  }, [user]);

  // Auto-refresh multimedia posts every 10 seconds
  useEffect(() => {
    if (user?.id) {
      const interval = setInterval(loadMultimediaPosts, 10000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  // Data loading functions
  const loadCalendarEvents = async () => {
    try {
      setLoading(true);
      console.log('Loading calendar events...');
      
      const { data: calendarData, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('date', { ascending: true });
      
      if (error) {
        console.error('Error loading calendar events:', error);
        toast({
          title: "Error",
          description: "Failed to load calendar events",
          variant: "destructive"
        });
        return;
      }
      
      console.log('Calendar events loaded:', calendarData?.length || 0);
      setCalendarEvents(calendarData || []);
      
    } catch (error) {
      console.error('Calendar events error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      
      // Get ALL approved events
      const [{ data: organizerEvents }, { data: approvedRequests }] = await Promise.all([
        supabase
          .from('events')
          .select(`
            *,
            organizer:organizer_id (name)
          `)
          .eq('status', 'approved')
          .order('date', { ascending: true }),
        
        supabase
          .from('event_requests')
          .select('*')
          .eq('status', 'approved')
          .order('date', { ascending: true })
      ]);

      if (!user?.id) {
        setEvents([]);
        return;
      }

      // Get user's registrations and all registrations for participant count
      let registrations = [];
      let userRegistrations = [];
      try {
        // Get all registrations for participant counting
        const { data: allRegData } = await supabase
          .from('event_registrations') 
          .select('event_id, participant_id');
        registrations = allRegData || [];
        
        // Get user's specific registrations
        const { data: userRegData } = await supabase
          .from('event_registrations')
          .select('event_id')
          .eq('participant_id', user.id);
        userRegistrations = userRegData || [];
      } catch (error) {
        registrations = [];
        userRegistrations = [];
      }

      const registrationIds = userRegistrations?.map(r => r.event_id) || [];

      // Format organizer events
      const formattedOrganizerEvents: Event[] = (organizerEvents || []).map(event => {
        // Get real participant count from event_registrations
        const realParticipantCount = registrations?.filter(r => r.event_id === event.id).length || event.current_participants || 0;
        
        return {
          id: event.id,
          title: event.title,
          date: event.date,
          time: event.time,
          venue: event.venue,
          organizer_name: event.organizer?.name || 'Unknown',
          current_participants: realParticipantCount,
          max_participants: event.max_participants || 100,
          status: event.status,
          event_type: event.event_type,
          description: event.description || '',
          isRegistered: registrationIds.includes(event.id),
          isFavorite: false,
          isMyEvent: false
        };
      });

      // Format approved participant request events - these should be registrable if not user's own
      const formattedRequestEvents: Event[] = (approvedRequests || []).map(request => {
        // Get real participant count for event requests too
        const realParticipantCount = registrations?.filter(r => r.event_id === request.id).length || 0;
        
        return {
          id: request.id,
          title: request.title,
          date: request.date,
          time: request.time,
          venue: request.venue,
          organizer_name: request.user_name || (request.form_data?.eventRequestedBy) || 'Event Organizer',
          current_participants: realParticipantCount,
          max_participants: request.expected_participants || 50,
          status: 'approved',
          event_type: request.event_type,
          description: request.description || '',
          isRegistered: registrationIds.includes(request.id),
          isFavorite: false,
          isMyEvent: request.requester_id === user.id
        };
      });

      const allEvents = [...formattedOrganizerEvents, ...formattedRequestEvents];
      console.log('🔥 DEBUG - Loaded events:', {
        userId: user.id,
        organizerEvents: formattedOrganizerEvents.length,
        requestEvents: formattedRequestEvents.length,
        total: allEvents.length,
        rawApprovedRequests: approvedRequests?.length || 0,
        eventDetails: allEvents.map(e => ({ 
          id: e.id, 
          title: e.title, 
          isMyEvent: e.isMyEvent,
          organizer: e.organizer_name,
          venue: e.venue
        }))
      });
      setEvents(allEvents);
      
    } catch (error) {
      console.error('Error loading events:', error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive"
      });
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }
      
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error clearing notifications:', error);
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );

      toast({
        title: "Notifications Cleared",
        description: "All notifications have been marked as read",
      });
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const loadReports = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('reporter_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Reports query error:', error);
        setReports([]);
        return;
      }
      
      const formattedReports: Report[] = (data || []).map(report => ({
        ...report,
        event_title: report.related_event_id ? 'Related Event' : 'General Report'
      }));
      
      setReports(formattedReports);
    } catch (error) {
      console.error('Error loading reports:', error);
      setReports([]);
    }
  };

  // Submit new report
  const handleSubmitReport = async () => {
    if (!user?.id || !newReportTitle.trim() || !newReportDescription.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      const reportData = {
        reporter_id: user.id,
        title: newReportTitle.trim(),
        description: newReportDescription.trim(),
        report_type: newReportType,
        status: 'open',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('reports')
        .insert([reportData])
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      toast({
        title: "Report Submitted",
        description: "Your report has been submitted successfully. Admin will review it soon.",
      });

      // Reset form
      setNewReportTitle("");
      setNewReportDescription("");
      setNewReportType("rejection_complaint");
      setShowNewReportForm(false);

      // Reload reports
      await loadReports();
      
    } catch (error) {
      console.error('Submit report error:', error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load report messages for chat
  const loadReportMessages = async (reportId: string) => {
    try {
      const { data, error } = await supabase
        .from('report_messages')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading report messages:', error);
        toast({
          title: "Error",
          description: "Failed to load messages",
          variant: "destructive"
        });
        return;
      }
      
      // Format messages with sender info
      const formattedMessages = (data || []).map(msg => ({
        ...msg,
        sender_name: msg.sender_id === user.id ? 'You' : 'Admin',
        sender_role: msg.sender_id === user.id ? 'participant' : 'admin'
      }));
      
      setReportMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading report messages:', error);
      setReportMessages([]);
    }
  };

  // Send message in report chat
  const handleSendMessage = async () => {
    if (!selectedReport || !newMessage.trim()) return;

    try {
      const messageData = {
        report_id: selectedReport.id,
        message: newMessage.trim(),
        sender_id: user.id
      };

      const { data, error } = await supabase
        .from('report_messages')
        .insert([messageData])
        .select();

      if (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Message Failed",
          description: "Failed to send message. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Immediately add the message to local state for instant UI update
      const newMessageObj = {
        ...data[0],
        sender_name: 'You',
        sender_role: 'participant'
      };
      
      setReportMessages(prev => [...prev, newMessageObj]);
      setNewMessage("");

      // Create notification for admin about new message
      try {
        const adminIds = [
          'b7cc74a6-de67-4b03-9481-f59a33a4d7f4',
          'cdcdefb1-0cbf-44be-a8ae-5e23008878ee', 
          '04b63328-231f-4d7b-bad0-4a18d0c0d3f5',
          'fde6ec11-e1ef-4663-a93b-de1e48ff2b6d',
          '72150cf8-b7b7-4a66-90a4-479720ceebef',
          'fd174ebc-7386-4a25-aee5-da6741d43905'
        ];
        
        const adminNotifications = adminIds.map(adminId => ({
          user_id: adminId,
          title: '💬 New Message in Report',
          message: `${user.name || 'Participant'} sent a message in report: "${selectedReport.title}"`,
          type: 'report_message',
          is_read: false,
          related_event_id: selectedReport.id
        }));
        
        await supabase
          .from('notifications')
          .insert(adminNotifications);
          
      } catch (notifError) {
        console.log('Admin notification error (non-critical):', notifError);
      }
      
      toast({
        title: "Message Sent",
        description: "Your message has been sent to admin successfully.",
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Message Failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const loadEventRequests = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('event_requests')
        .select('*')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      setEventRequests(data || []);
    } catch (error) {
      console.error('Error loading event requests:', error);
      setEventRequests([]);
    }
  };

  // Event interaction handlers
  const handleEventRegister = async (eventId: string) => {
    if (!user?.id) return;
    
    try {
      console.log('Attempting to register for event:', eventId);
      const event = events.find(e => e.id === eventId);
      
      if (!event) {
        console.error('Event not found in events array:', eventId);
        console.log('Available events:', events.map(e => ({ id: e.id, title: e.title, isMyEvent: e.isMyEvent })));
        toast({
          title: "Error",
          description: "Event not found. Please refresh the page and try again.",
          variant: "destructive"
        });
        return;
      }

      console.log('Found event:', { id: event.id, title: event.title, isMyEvent: event.isMyEvent, isRegistered: event.isRegistered });

      // Check if this is user's own event (they can't register for their own events)
      if (event.isMyEvent) {
        toast({
          title: "Cannot Register",
          description: "You cannot register for your own event",
          variant: "destructive"
        });
        return;
      }

      if (event.isRegistered) {
        console.log('Unregistering from event...');
        
        // Direct database approach like organizer dashboard
        const { error } = await supabase
          .from('event_registrations')
          .delete()
          .eq('event_id', eventId)
          .eq('participant_id', user.id);

        if (error) {
          console.error('Unregister error:', error);
          toast({
            title: "Unregistration Failed",
            description: "Failed to unregister. Please try again.",
            variant: "destructive"
          });
          return;
        }

        // Update participant count directly (only for events table, not event_requests)
        try {
          await supabase
            .from('events')
            .update({ current_participants: Math.max(0, event.current_participants - 1) })
            .eq('id', eventId);
        } catch (updateError) {
          // If event doesn't exist in events table (e.g., from event_requests), that's ok
          console.log('Event count update skipped (event may be from event_requests):', updateError);
        }

        toast({
          title: "Unregistered",
          description: `You have been unregistered from ${event.title}`,
        });
      } else {
        if (event.current_participants >= event.max_participants) {
          toast({
            title: "Event Full",
            description: "This event has reached maximum capacity",
            variant: "destructive"
          });
          return;
        }

        console.log('Registering for event...');
        
        // Direct database approach like organizer dashboard
        const { error } = await supabase
          .from('event_registrations')
          .insert([{
            event_id: eventId,
            participant_id: user.id,
            registration_date: new Date().toISOString(),
            attendance_status: 'registered'
          }]);

        if (error) {
          console.error('Register error:', error);
          toast({
            title: "Registration Failed",
            description: "Failed to register. Please try again.",
            variant: "destructive"
          });
          return;
        }

        // Update participant count directly (only for events table, not event_requests)
        try {
          await supabase
            .from('events')
            .update({ current_participants: event.current_participants + 1 })
            .eq('id', eventId);
        } catch (updateError) {
          // If event doesn't exist in events table (e.g., from event_requests), that's ok
          console.log('Event count update skipped (event may be from event_requests):', updateError);
        }

        // Create notification for successful registration
        try {
          await supabase
            .from('notifications')
            .insert([{
              user_id: user.id,
              title: "Registration Confirmed",
              message: `Your registration for "${event.title}" has been confirmed.`,
              type: "registration_confirmed",
              related_event_id: eventId
            }]);
        } catch (notifError) {
          console.log('Notification creation failed (non-critical):', notifError);
        }

        toast({
          title: "Registered Successfully",
          description: `You have been registered for ${event.title}`,
        });
      }

      console.log('Reloading events after registration change...');
      await loadEvents();
      await loadNotifications();
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed", 
        description: error instanceof Error ? error.message : "Failed to update registration. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSubmitEventRequest = async () => {
    // Build final venue string with error handling
    const finalVenue = newEventRequest.venue === 'Others' ? 
      (newEventRequest.custom_venue || '').trim() : 
      (newEventRequest.venue || '').trim();
    const specificPlace = (newEventRequest.specific_place || '').trim();
    const fullVenueInfo = finalVenue + (specificPlace ? ` - ${specificPlace}` : '');
    
    // Check required fields
    const requiredFields = {
      title: newEventRequest.title.trim(),
      purpose_of_event: newEventRequest.purpose_of_event,
      date: newEventRequest.date,
      time: newEventRequest.time,
      venue: finalVenue, // Use finalVenue instead of fullVenueInfo for validation
      participants: newEventRequest.participants.trim(),
      overall_in_charge: newEventRequest.overall_in_charge.trim(),
      event_requested_by: newEventRequest.event_requested_by.trim(),
      position: newEventRequest.position.trim(),
      organization: newEventRequest.organization.trim(),
      contact_number: newEventRequest.contact_number.trim()
    };

    // Check if purpose is "Others" and purpose_other is empty
    if (newEventRequest.purpose_of_event === 'Others' && !newEventRequest.purpose_other.trim()) {
      toast({
        title: "Missing Information",
        description: "Please specify the purpose when selecting 'Others'",
        variant: "destructive"
      });
      return;
    }

    // Check for empty required fields
    const emptyFields = Object.entries(requiredFields).filter(([key, value]) => !value);
    
    if (!user?.id || emptyFields.length > 0) {
      const fieldNames = emptyFields.map(([key]) => {
        switch(key) {
          case 'title': return 'Event Name';
          case 'purpose_of_event': return 'Purpose of Event';
          case 'date': return 'Event Date';
          case 'time': return 'Time';
          case 'venue': return 'Venue';
          case 'participants': return 'Participants';
          case 'overall_in_charge': return 'Overall In-Charge';
          case 'event_requested_by': return 'Event Requested By';
          case 'position': return 'Position/Designation';
          case 'organization': return 'Organization/Department';
          case 'contact_number': return 'Contact Number';
          default: return key;
        }
      }).join(', ');
      
      toast({
        title: "Missing Information",
        description: `Please fill in the following required fields: ${fieldNames}`,
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      const requestData = {
        requester_id: user.id,
        title: newEventRequest.title,
        description: newEventRequest.description || (newEventRequest.purpose_of_event === 'Others' ? newEventRequest.purpose_other : newEventRequest.purpose_of_event), // Use purpose if no description
        date: newEventRequest.date,
        time: newEventRequest.time,
        venue: fullVenueInfo,
        event_type: newEventRequest.event_type,
        expected_participants: newEventRequest.expected_participants,
        requirements: newEventRequest.requirements,
        budget_estimate: newEventRequest.budget_estimate,
        request_reason: newEventRequest.request_reason,
        // Store complete form data for PDF generation matching admin form
        form_data: {
          // REQUEST DETAILS
          eventRequestedBy: newEventRequest.event_requested_by || user.name,
          position: newEventRequest.position,
          organization: newEventRequest.organization,
          contactNumber: newEventRequest.contact_number || user.email,
          
          // EVENT INFORMATION
          eventName: newEventRequest.title,
          purpose: newEventRequest.purpose_of_event === 'Others' ? newEventRequest.purpose_other : newEventRequest.purpose_of_event,
          participants: newEventRequest.participants,
          modality: newEventRequest.modality,
          eventDate: newEventRequest.date,
          time: newEventRequest.time,
          venue: fullVenueInfo,
          overallInCharge: newEventRequest.overall_in_charge,
          
          // EVENT COMMITTEE ASSIGNMENTS
          invitationCommittee: newEventRequest.invitation_committee,
          programCommittee: newEventRequest.program_committee,
          soundSystemCommittee: newEventRequest.sound_system_committee,
          stageDecorationCommittee: newEventRequest.stage_decoration_committee,
          demolitionCleanupCommittee: newEventRequest.demolition_cleanup_committee,
          foodRefreshmentsCommittee: newEventRequest.food_refreshments_committee,
          safetySecurityCommittee: newEventRequest.safety_security_committee,
          documentationCommittee: newEventRequest.documentation_committee,
          registrationCommittee: newEventRequest.registration_committee,
          evaluationCommittee: newEventRequest.evaluation_committee,
          
          // Legacy compatibility
          purposeOfEvent: newEventRequest.purpose_of_event === "Others" ? newEventRequest.purpose_other : newEventRequest.purpose_of_event
        }
      };

      const { data, error } = await supabase
        .from('event_requests')
        .insert([requestData])
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      // Create admin notifications
      try {
        const exactAdminIds = [
          'b7cc74a6-de67-4b03-9481-f59a33a4d7f4',
          'cdcdefb1-0cbf-44be-a8ae-5e23008878ee', 
          '04b63328-231f-4d7b-bad0-4a18d0c0d3f5',
          'fde6ec11-e1ef-4663-a93b-de1e48ff2b6d',
          '72150cf8-b7b7-4a66-90a4-479720ceebef',
          'fd174ebc-7386-4a25-aee5-da6741d43905'
        ];
        
        const adminNotifications = exactAdminIds.map(adminId => ({
          user_id: adminId,
          title: '📋 New Event Request from Participant',
          message: `${user.name || user.email || 'Participant'} submitted event request: "${newEventRequest.title}". Please review and approve.`,
          type: 'event_request',
          is_read: false,
          related_event_id: data.id
        }));
        
        await supabase
          .from('notifications')
          .insert(adminNotifications);
          
      } catch (adminNotifError) {
        console.log('Admin notification error (non-critical):', adminNotifError);
      }

      // Show success modal instead of toast
      console.log('Setting success modal to show with request ID:', data.id);
      setSubmittedRequestId(data.id);
      setShowSuccessModal(true);
      console.log('Success modal state set to true');

      // Reset form
      setNewEventRequest({
        event_requested_by: "",
        position: "",
        organization: "",
        contact_number: "",
        title: "",
        purpose_of_event: "Academic",
        purpose_other: "",
        participants: "",
        modality: "Face-to-Face",
        date: "",
        time: "",
        venue: "",
        custom_venue: "",
        specific_place: "",
        overall_in_charge: "",
        invitation_committee: "",
        program_committee: "",
        sound_system_committee: "",
        stage_decoration_committee: "",
        demolition_cleanup_committee: "",
        food_refreshments_committee: "",
        safety_security_committee: "",
        documentation_committee: "",
        registration_committee: "",
        evaluation_committee: "",
        description: "",
        event_type: "Academic",
        expected_participants: 50,
        requirements: "",
        budget_estimate: 0,
        request_reason: ""
      });

      setShowNewRequestForm(false);
      await loadEventRequests();
      await loadNotifications();
      
    } catch (error) {
      console.error('Submit event request error:', error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Utility functions
  const formatDate = (dateString: string) => {
    // Use Philippine timezone to avoid date offset issues
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Manila'
    });
  };

  // Multimedia functions (VIEW ONLY for participants)
  const loadMultimediaPosts = async () => {
    try {
      console.log('📱 PARTICIPANT: Loading multimedia posts...');
      const allPosts = await getAllMultimediaPosts();
      setMultimediaPosts(allPosts);
      console.log('✅ PARTICIPANT: Loaded posts:', allPosts.length);
    } catch (error) {
      console.error("Error loading posts:", error);
    }
  };

  const loadCommentsForPost = async (postId: string) => {
    try {
      console.log('💬 Loading comments for post:', postId);
      const comments = await getPostComments(postId);
      setPostComments(prev => ({ ...prev, [postId]: comments }));
      console.log('✅ Loaded comments:', comments?.length || 0);
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const toggleComments = async (postId: string) => {
    const isCurrentlyShowing = showComments[postId];
    setShowComments(prev => ({ ...prev, [postId]: !isCurrentlyShowing }));
    
    // Always reload comments when toggling to show
    if (!isCurrentlyShowing) {
      console.log('🔄 PARTICIPANT: Loading comments for post:', postId);
      await loadCommentsForPost(postId);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      console.log('👍 PARTICIPANT: Liking post...', postId);
      const success = await likePost(postId, user?.id || "participant-user");
      
      if (success) {
        await loadMultimediaPosts();
        toast({
          title: "👍 Liked!",
          description: "You liked this post"
        });
      } else {
        toast({
          title: "Like Failed",
          description: "Could not like this post",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error liking post:", error);
      toast({
        title: "Error",
        description: "Failed to like post",
        variant: "destructive"
      });
    }
  };

  const handleComment = async (postId: string) => {
    const commentText = newComment[postId];
    if (!commentText?.trim()) return;

    try {
      console.log('💬 PARTICIPANT: Adding comment...', postId, commentText);
      const comment = await addComment(postId, user?.id || "participant-user", user?.name || "Participant", commentText);
      
      if (comment) {
        // Clear comment input immediately
        setNewComment(prev => ({ ...prev, [postId]: "" }));
        
        // Reload both posts and comments for this specific post
        await loadMultimediaPosts();
        await loadCommentsForPost(postId);
        
        toast({
          title: "💬 Comment Added!",
          description: "Your comment has been posted"
        });
      } else {
        toast({
          title: "Comment Failed",
          description: "Could not add comment",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive"
      });
    }
  };

  // Program Flow functions (VIEW ONLY for participants)
  const loadApprovedProgramFlows = async () => {
    if (!user?.id) return;
    
    try {
      console.log('📋 PARTICIPANT: Loading approved program flows...');
      
      // Get approved event requests by this participant that have program flows
      const { data, error } = await supabase
        .from('event_requests')
        .select('*')
        .eq('requester_id', user.id)
        .eq('status', 'approved')
        .ilike('admin_comments', 'PROGRAM_FLOW:%');

      if (error) {
        console.error('Error loading program flows:', error);
        return;
      }

      // Convert to ProgramFlow objects
      const flows: ProgramFlow[] = data?.map(req => {
        try {
          if (req.admin_comments?.startsWith('PROGRAM_FLOW:')) {
            const jsonData = req.admin_comments.substring('PROGRAM_FLOW:'.length);
            const programData = JSON.parse(jsonData);
            
            return {
              id: req.id,
              event_id: req.id,
              event_title: req.title,
              title: programData.title || 'Program Flow',
              description: programData.description || '',
              status: programData.status || 'approved',
              activities: programData.activities || [],
              admin_comments: programData.admin_comments,
              created_at: req.created_at,
              updated_at: req.updated_at || req.created_at
            };
          }
          return null;
        } catch (parseError) {
          console.error('Error parsing program flow:', parseError);
          return null;
        }
      }).filter(Boolean) || [];

      // Only show approved program flows
      const approvedFlows = flows.filter(flow => flow.status === 'approved');
      
      setApprovedProgramFlows(approvedFlows);
      console.log('✅ PARTICIPANT: Loaded approved program flows:', approvedFlows.length);
      
    } catch (error) {
      console.error('Error loading approved program flows:', error);
      setApprovedProgramFlows([]);
    }
  };

  const handlePrintProgramFlow = (flow: ProgramFlow) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Program Flow - ${flow.event_title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .event-title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .program-title { font-size: 18px; color: #666; }
            .description { margin: 20px 0; padding: 10px; background-color: #f5f5f5; border-radius: 5px; }
            .activities { margin-top: 20px; }
            .activity { margin-bottom: 15px; padding: 10px; border-left: 4px solid #2563eb; background-color: #f8fafc; }
            .activity-time { font-weight: bold; color: #2563eb; }
            .activity-title { font-size: 16px; font-weight: bold; margin: 5px 0; }
            .activity-details { color: #666; font-size: 14px; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 10px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="event-title">${flow.event_title}</div>
            <div class="program-title">${flow.title}</div>
          </div>
          
          ${flow.description ? `<div class="description"><strong>Description:</strong> ${flow.description}</div>` : ''}
          
          <div class="activities">
            <h3>Program Activities</h3>
            ${flow.activities.map((activity, index) => `
              <div class="activity">
                <div class="activity-time">${activity.time} (${activity.duration} minutes)</div>
                <div class="activity-title">${activity.title}</div>
                <div class="activity-details">
                  <strong>Location:</strong> ${activity.location}<br>
                  <strong>Type:</strong> ${activity.activity_type}<br>
                  ${activity.description ? `<strong>Details:</strong> ${activity.description}` : ''}
                </div>
              </div>
            `).join('')}
          </div>
          
          <div class="footer">
            <p>Generated on ${new Date().toLocaleDateString()} | Event Management System</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "event_approved":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "event_rejected":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case "event_reminder":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "registration_confirmed":
        return <Calendar className="w-4 h-4 text-green-600" />;
      case "announcement":
        return <Bell className="w-4 h-4 text-purple-600" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          event.organizer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          event.venue?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === "all") return matchesSearch;
    if (filterType === "available") return matchesSearch && !event.isMyEvent;
    if (filterType === "myevents") return matchesSearch && event.isMyEvent;
    if (filterType === "registered") return matchesSearch && event.isRegistered;
    
    return matchesSearch && event.event_type.toLowerCase() === filterType.toLowerCase();
  });

  const unreadNotifications = notifications.filter(n => !n.is_read).length;

  // Calendar helper functions
  const getFilteredCalendarEvents = () => {
    let filtered = calendarEvents;

    // Apply date filter - Use Philippine timezone
    const now = new Date();
    const today = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    if (calendarFilter === 'today') {
      filtered = filtered.filter(event => {
        if (!event.date) return false;
        // Parse date in Philippine timezone
        const eventDate = new Date(event.date + 'T00:00:00+08:00'); // Force Philippine timezone
        const eventStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        return eventStart.getTime() === startOfToday.getTime();
      });
    } else if (calendarFilter === 'upcoming') {
      filtered = filtered.filter(event => {
        if (!event.date) return false;
        const eventDate = new Date(event.date + 'T00:00:00+08:00'); // Force Philippine timezone
        return eventDate >= startOfToday;
      });
    } else if (calendarFilter === 'this_week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(event => {
        if (!event.date) return false;
        const eventDate = new Date(event.date + 'T00:00:00+08:00'); // Force Philippine timezone
        return eventDate >= startOfWeek && eventDate <= endOfWeek;
      });
    } else if (calendarFilter === 'this_month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(event => {
        if (!event.date) return false;
        const eventDate = new Date(event.date + 'T00:00:00+08:00'); // Force Philippine timezone
        return eventDate >= startOfMonth && eventDate <= endOfMonth;
      });
    }

    // Apply search filter
    if (calendarSearch.trim()) {
      const searchLower = calendarSearch.toLowerCase();
      filtered = filtered.filter(event => 
        event.title?.toLowerCase().includes(searchLower) ||
        event.description?.toLowerCase().includes(searchLower) ||
        event.venue?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  };

  const getCalendarEventsByFilter = (filter: string) => {
    // Use Philippine timezone
    const now = new Date();
    const today = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    switch (filter) {
      case 'today':
        return calendarEvents.filter(event => {
          if (!event.date) return false;
          const eventDate = new Date(event.date + 'T00:00:00+08:00'); // Force Philippine timezone
          const eventStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
          return eventStart.getTime() === startOfToday.getTime();
        });
      case 'upcoming':
        return calendarEvents.filter(event => {
          if (!event.date) return false;
          const eventDate = new Date(event.date + 'T00:00:00+08:00'); // Force Philippine timezone
          return eventDate >= startOfToday;
        });
      case 'this_week':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return calendarEvents.filter(event => {
          if (!event.date) return false;
          const eventDate = new Date(event.date + 'T00:00:00+08:00'); // Force Philippine timezone
          return eventDate >= startOfWeek && eventDate <= endOfWeek;
        });
      case 'this_month':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        return calendarEvents.filter(event => {
          if (!event.date) return false;
          const eventDate = new Date(event.date + 'T00:00:00+08:00'); // Force Philippine timezone
          return eventDate >= startOfMonth && eventDate <= endOfMonth;
        });
      default:
        return calendarEvents;
    }
  };

  // Generate PDF for event requests - matches admin version
  const generatePDF = (request: EventRequest) => {
    let formData;
    try {
      formData = request.form_data || {};
    } catch (e) {
      formData = {};
    }
    
    const printContent = `
      <div style="max-width: 800px; margin: 0 auto; padding: 30px; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; background: white;">
        <!-- Form Header with Status -->
        <div style="text-align: center; margin-bottom: 30px; position: relative;">
          <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 20px; letter-spacing: 2px;">EVENT REQUEST FORM</h1>
          <!-- Status Stamp -->
          <div style="position: absolute; top: 0; right: 0;">
            <div style="display: inline-block; padding: 12px 24px; color: white; font-weight: bold; font-size: 18px; border: 3px solid ${request.status === 'approved' ? '#065f46' : request.status === 'rejected' ? '#991b1b' : '#92400e'}; background: ${request.status === 'approved' ? '#16a34a' : request.status === 'rejected' ? '#dc2626' : '#ca8a04'}; transform: rotate(12deg); border-radius: 8px; box-shadow: 2px 2px 8px rgba(0,0,0,0.3);">
              ${request.status.toUpperCase()}
            </div>
          </div>
          <p style="margin-top: 10px; color: #666; font-size: 14px;">Request ID: ${request.id}</p>
        </div>

        <!-- REQUEST DETAILS Section -->
        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 4px;">REQUEST DETAILS</h2>
          <div style="margin-bottom: 12px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">• Event Requested By:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.eventRequestedBy || user?.name || ''}</span>
          </div>
          <div style="margin-bottom: 12px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">• Position / Designation:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.position || 'Participant'}</span>
          </div>
          <div style="margin-bottom: 12px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">• Organization / Department:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.organization || 'Student Organization'}</span>
          </div>
          <div style="margin-bottom: 12px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">• Contact Number / Email:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.contactNumber || user?.email || ''}</span>
          </div>
          <div style="margin-bottom: 12px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">• Date of Submission:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${new Date(request.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <!-- EVENT INFORMATION Section -->
        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 4px;">EVENT INFORMATION</h2>
          <div style="margin-bottom: 12px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">• Event Name:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.eventName || request.title}</span>
          </div>
          <div style="margin-bottom: 12px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">• Purpose:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.purpose || request.description}</span>
          </div>
          <div style="margin-bottom: 12px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">• Participants:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.participants || request.expected_participants}</span>
          </div>
          <div style="margin-bottom: 12px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">• Modality: (Face-to-Face / Online / Hybrid)</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.modality || 'Face-to-Face'}</span>
          </div>
          <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 30px;">
            <div style="display: flex; align-items: center; flex: 1;">
              <span style="font-weight: bold; margin-right: 8px;">• Event Date:</span>
              <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${request.date}</span>
            </div>
            <div style="display: flex; align-items: center; flex: 1;">
              <span style="font-weight: bold; margin-right: 8px;">Time:</span>
              <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${request.time}</span>
            </div>
          </div>
          <div style="margin-bottom: 12px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">• Venue:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${request.venue}</span>
          </div>
          <div style="margin-bottom: 12px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">• Overall In-Charge:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.overallInCharge || 'TBA'}</span>
          </div>
        </div>

        <!-- EVENT COMMITTEE ASSIGNMENTS Section -->
        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 4px;">EVENT COMMITTEE ASSIGNMENTS</h2>
          <div style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">1. Invitation:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.invitationCommittee || ''}</span>
          </div>
          <div style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">2. Program:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.programCommittee || ''}</span>
          </div>
          <div style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">3. Sound System:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.soundSystemCommittee || ''}</span>
          </div>
          <div style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">4. Stage Decoration:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.stageDecorationCommittee || ''}</span>
          </div>
          <div style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">5. Demolition / Clean-Up:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.demolitionCleanupCommittee || ''}</span>
          </div>
          <div style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">6. Food / Refreshments:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.foodRefreshmentsCommittee || ''}</span>
          </div>
          <div style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">7. Safety & Security:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.safetySecurityCommittee || ''}</span>
          </div>
          <div style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">8. Documentation:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.documentationCommittee || ''}</span>
          </div>
          <div style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">9. Registration:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.registrationCommittee || ''}</span>
          </div>
          <div style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">10. Evaluation:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.evaluationCommittee || ''}</span>
          </div>
        </div>

        <!-- PRE-EVENT REQUIREMENTS Section -->
        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 4px;">PRE-EVENT REQUIREMENTS (to be attached upon submission)</h2>
          <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>• Letter of Request (signed by Program Head or Dean)</li>
            <li>• Student Board Resolution (if the event will be held outside the school or involves a proposal for collections)</li>
            <li>• Event Program / Invitation</li>
            <li>• List of Permits Needed (if applicable)</li>
            <li>• Copy of Certificate (if applicable)</li>
          </ul>
        </div>

        <!-- POST-EVENT REQUIREMENTS Section -->
        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 4px;">POST-EVENT REQUIREMENTS (to be submitted within 3-5 days after the event)</h2>
          <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>• Post-Event Result</li>
            <li>• Accomplishment / Narrative Report</li>
          </ul>
        </div>

        ${request.admin_comments ? `
        <!-- ADMIN COMMENTS Section -->
        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 4px;">ADMIN COMMENTS</h2>
          <div style="padding: 15px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px;">
            <p style="margin: 0;">${request.admin_comments}</p>
          </div>
        </div>
        ` : ''}

        <!-- IMPORTANT REMINDERS Section -->
        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 4px;">IMPORTANT REMINDERS:</h2>
          <div style="space-y-2 text-sm;">
            <p>• Requests must be submitted to the Office of the School Activities <strong>8 days or more before the event date</strong> to comply with the VPAA's 7-day requirement.</p>
            <p>• The Office of the School Activities is open <strong>Monday to Friday, 8:00 a.m. to 5:00 p.m. only</strong>.</p>
            <p>• Incomplete requirements will not be accepted.</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; font-size: 12px; color: #666;">
          <p>Generated on: ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })}</p>
          <p>School Event Management System - Participant Dashboard</p>
        </div>
      </div>
    `;

    // Create a temporary window for PDF generation
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Event Request - ${request.title}</title>
            <style>
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            ${printContent}
            <div class="no-print" style="text-align: center; margin: 20px;">
              <button onclick="window.print(); setTimeout(() => window.close(), 1000);" style="padding: 10px 20px; background: #16a34a; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; margin-right: 10px;">Save as PDF</button>
              <button onclick="window.close()" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 5px; cursor: pointer;">Close</button>
            </div>
            <script>
              // Auto-trigger print dialog for direct PDF save
              setTimeout(() => {
                window.print();
              }, 500);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-white">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-border p-6">
          <div className="flex items-center justify-between">
            <img src={logo} alt="Logo" className="w-12 h-12 object-contain rounded-xl shadow" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Welcome back, {user?.name || "Participant"}!
              </h1>
              <p className="text-muted-foreground mt-1">
                Here's what's happening with your school events today.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">{user.name}</span>
              <Badge variant="secondary">Participant</Badge>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              {/* Welcome Section */}
              <Card className="card-elevated">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-500 to-violet-500 rounded-full flex items-center justify-center">
                      <User className="w-10 h-10 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Welcome, {user?.name}!</h2>
                      <p className="text-muted-foreground">Participant Dashboard</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="card-elevated">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">All Events</p>
                        <p className="text-3xl font-bold gradient-primary bg-clip-text text-transparent">
                          {events.length}
                        </p>
                      </div>
                      <CalendarDays className="w-8 h-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-elevated">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">My Events</p>
                        <p className="text-3xl font-bold text-green-600">
                          {events.filter(e => e.isMyEvent).length}
                        </p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-elevated">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Registered</p>
                        <p className="text-3xl font-bold text-blue-600">
                          {events.filter(e => e.isRegistered).length}
                        </p>
                      </div>
                      <Users className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-elevated">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Event Requests</p>
                        <p className="text-3xl font-bold text-purple-600">
                          {eventRequests.length}
                        </p>
                      </div>
                      <Plus className="w-8 h-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Frequently used actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Button 
                      className="h-20 flex-col space-y-2 bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600"
                      onClick={() => setActiveTab("events")}
                    >
                      <Plus className="w-6 h-6" />
                      <span>Request Event</span>
                    </Button>
                    
                    <Button 
                      variant="outline"
                      className="h-20 flex-col space-y-2"
                      onClick={() => setActiveTab("calendar")}
                    >
                      <Calendar className="w-6 h-6" />
                      <span>View Calendar</span>
                    </Button>
                    
                    <Button 
                      variant="outline"
                      className="h-20 flex-col space-y-2 relative"
                      onClick={() => setActiveTab("notifications")}
                    >
                      <Bell className="w-6 h-6" />
                      <span>Notifications</span>
                      {unreadNotifications > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {unreadNotifications}
                        </span>
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline"
                      className="h-20 flex-col space-y-2"
                      onClick={() => setActiveTab("reports")}
                    >
                      <FileText className="w-6 h-6" />
                      <span>Reports</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your latest events and notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {notifications.slice(0, 5).map((notification) => (
                      <div key={notification.id} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                        <div className="p-2 rounded-full bg-primary/10">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{notification.title}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(notification.created_at)}</p>
                        </div>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        )}
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No recent activity</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="space-y-6">
              {/* Header */}
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>Event Management</CardTitle>
                  <CardDescription>Manage your event requests and discover new events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-end">
                    <Button 
                      onClick={() => setShowNewRequestForm(true)}
                      className="gradient-primary"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Request Event
                    </Button>
                  </div>
                </CardContent>
              </Card>

                    {/* Event Request Modal */}
                    {showNewRequestForm && (
                      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9998] backdrop-blur-sm">
                        <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4 shadow-2xl animate-in zoom-in-95 duration-300 relative z-[9999]">
                          <CardHeader className="bg-gradient-to-r from-blue-500 to-violet-500 text-white">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-white text-xl">✨ New Event Request</CardTitle>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setShowNewRequestForm(false)}
                                className="text-white hover:bg-white/20"
                              >
                                ✕
                              </Button>
                            </div>
                          </CardHeader>
                        <CardContent className="space-y-6">
                          {/* REQUEST DETAILS Section */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-primary border-b pb-2">Requester Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="requested_by">Event Requested By *</Label>
                                <Input
                                  id="requested_by"
                                  value={newEventRequest.event_requested_by}
                                  onChange={(e) => setNewEventRequest({...newEventRequest, event_requested_by: e.target.value})}
                                  placeholder={user?.name || "Your full name"}
                                />
                              </div>
                              <div>
                                <Label htmlFor="position">Position / Designation *</Label>
                                <Input
                                  id="position"
                                  value={newEventRequest.position}
                                  onChange={(e) => setNewEventRequest({...newEventRequest, position: e.target.value})}
                                  placeholder="e.g. Student, President, Secretary"
                                />
                              </div>
                              <div>
                                <Label htmlFor="organization">Organization / Department *</Label>
                                <Input
                                  id="organization"
                                  value={newEventRequest.organization}
                                  onChange={(e) => setNewEventRequest({...newEventRequest, organization: e.target.value})}
                                  placeholder="e.g. Student Council, IT Department"
                                />
                              </div>
                              <div>
                                <Label htmlFor="contact">Contact Number *</Label>
                                <Input
                                  id="contact"
                                  value={newEventRequest.contact_number}
                                  onChange={(e) => setNewEventRequest({...newEventRequest, contact_number: e.target.value})}
                                  placeholder="09XXXXXXXXX"
                                />
                              </div>
                            </div>
                          </div>

                          {/* EVENT INFORMATION Section */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-primary border-b pb-2">Event Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="title">Event Name *</Label>
                                <Input
                                  id="title"
                                  value={newEventRequest.title}
                                  onChange={(e) => setNewEventRequest({...newEventRequest, title: e.target.value})}
                                  placeholder="Event name"
                                />
                              </div>
                              <div>
                                <Label htmlFor="purpose_of_event">Purpose of Event *</Label>
                                <Select 
                                  value={newEventRequest.purpose_of_event} 
                                  onValueChange={(value) => setNewEventRequest({...newEventRequest, purpose_of_event: value, purpose_other: value === 'Others' ? newEventRequest.purpose_other : ''})}
                                >
                                  <SelectTrigger className="z-10">
                                    <SelectValue placeholder="Select purpose of event" />
                                  </SelectTrigger>
                                  <SelectContent className="z-[10000]" sideOffset={5}>
                                    <SelectItem value="Academic">Academic Activity</SelectItem>
                                    <SelectItem value="Sports">Sports Event</SelectItem>
                                    <SelectItem value="Games">Games & Competition</SelectItem>
                                    <SelectItem value="Cultural">Cultural Event</SelectItem>
                                    <SelectItem value="Social">Social Activity</SelectItem>
                                    <SelectItem value="Community">Community Service</SelectItem>
                                    <SelectItem value="Workshop">Workshop/Seminar</SelectItem>
                                    <SelectItem value="Meeting">Meeting/Conference</SelectItem>
                                    <SelectItem value="Others">Others</SelectItem>
                                  </SelectContent>
                                </Select>
                                {newEventRequest.purpose_of_event === 'Others' && (
                                  <Input
                                    className="mt-2"
                                    placeholder="Please specify..."
                                    value={newEventRequest.purpose_other}
                                    onChange={(e) => setNewEventRequest({...newEventRequest, purpose_other: e.target.value})}
                                  />
                                )}
                              </div>
                              <div>
                                <Label htmlFor="participants">Participants *</Label>
                                <Input
                                  id="participants"
                                  value={newEventRequest.participants}
                                  onChange={(e) => setNewEventRequest({...newEventRequest, participants: e.target.value})}
                                  placeholder="Number/description of participants"
                                />
                              </div>
                              <div>
                                <Label htmlFor="modality">Modality *</Label>
                                <Select 
                                  value={newEventRequest.modality} 
                                  onValueChange={(value) => setNewEventRequest({...newEventRequest, modality: value})}
                                >
                                  <SelectTrigger className="z-10">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="z-[10000]" sideOffset={5}>
                                    <SelectItem value="Face-to-Face">Face-to-Face</SelectItem>
                                    <SelectItem value="Online">Online</SelectItem>
                                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="date">Event Date *</Label>
                                <Input
                                  id="date"
                                  type="date"
                                  value={newEventRequest.date}
                                  onChange={(e) => setNewEventRequest({...newEventRequest, date: e.target.value})}
                                />
                              </div>
                              <div>
                                <Label htmlFor="time">Time *</Label>
                                <Input
                                  id="time"
                                  type="time"
                                  value={newEventRequest.time}
                                  onChange={(e) => setNewEventRequest({...newEventRequest, time: e.target.value})}
                                />
                              </div>
                              <div>
                                <Label htmlFor="venue">Venue *</Label>
                                <Select 
                                  value={newEventRequest.venue} 
                                  onValueChange={(value) => setNewEventRequest({...newEventRequest, venue: value})}
                                >
                                  <SelectTrigger className="z-10">
                                    <SelectValue placeholder="Select venue" />
                                  </SelectTrigger>
                                  <SelectContent className="z-[10000]" sideOffset={5}>
                                    <SelectItem value="Main Campus (Kaligayahan) – #1071 Barangay Kaligayahan, Quirino Highway, Novaliches, Quezon City">Main Campus (Kaligayahan) – #1071 Barangay Kaligayahan, Quirino Highway, Novaliches, Quezon City</SelectItem>
                                    <SelectItem value="Millionaire's Village Campus (MV Campus) – Lot 762 cor. Topaz St. & Sapphire St., Millionaire's Village, Barangay San Agustin, Novaliches, Quezon City">Millionaire's Village Campus (MV Campus) – Lot 762 cor. Topaz St. & Sapphire St., Millionaire's Village, Barangay San Agustin, Novaliches, Quezon City</SelectItem>
                                    <SelectItem value="San Agustin Campus – 109 Susano Street, Barangay San Agustin, Novaliches, Quezon City">San Agustin Campus – 109 Susano Street, Barangay San Agustin, Novaliches, Quezon City</SelectItem>
                                    <SelectItem value="Heavenly Drive / Susano Road, San Agustin Annex – Heavenly Drive, Susano Road, San Agustin, Quezon City">Heavenly Drive / Susano Road, San Agustin Annex – Heavenly Drive, Susano Road, San Agustin, Quezon City</SelectItem>
                                    <SelectItem value="Annex at Greenfields I, Barangay Kaligayahan – #0006 Le Palm Street, Greenfields I, Barangay Kaligayahan, Novaliches, Quezon City">Annex at Greenfields I, Barangay Kaligayahan – #0006 Le Palm Street, Greenfields I, Barangay Kaligayahan, Novaliches, Quezon City</SelectItem>
                                    <SelectItem value="Bulacan Campus – IPO Road, Barangay Minuyan Proper, City of San Jose del Monte, Bulacan">Bulacan Campus – IPO Road, Barangay Minuyan Proper, City of San Jose del Monte, Bulacan</SelectItem>
                                    <SelectItem value="Others">Others</SelectItem>
                                  </SelectContent>
                                </Select>
                                {newEventRequest.venue === 'Others' && (
                                  <Input
                                    className="mt-2"
                                    placeholder="Please specify the venue..."
                                    value={newEventRequest.custom_venue || ''}
                                    onChange={(e) => setNewEventRequest({...newEventRequest, custom_venue: e.target.value})}
                                  />
                                )}
                                {newEventRequest.venue && (
                                  <Input
                                    className="mt-2"
                                    placeholder="Specific place/room (e.g., Gymnasium, Room 101, Audio Visual Room, etc.)"
                                    value={newEventRequest.specific_place || ''}
                                    onChange={(e) => setNewEventRequest({...newEventRequest, specific_place: e.target.value})}
                                  />
                                )}
                              </div>
                              <div>
                                <Label htmlFor="overall_in_charge">Overall In-Charge *</Label>
                                <Input
                                  id="overall_in_charge"
                                  value={newEventRequest.overall_in_charge}
                                  onChange={(e) => setNewEventRequest({...newEventRequest, overall_in_charge: e.target.value})}
                                  placeholder="Person responsible for the event"
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* EVENT COMMITTEE ASSIGNMENTS Section */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-primary border-b pb-2">Event Committee Assignments</h3>
                            <p className="text-sm text-muted-foreground mb-4">Assign committee members for different aspects of the event</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="invitation_committee">1. Invitation</Label>
                                <Input
                                  id="invitation_committee"
                                  value={newEventRequest.invitation_committee}
                                  onChange={(e) => setNewEventRequest({...newEventRequest, invitation_committee: e.target.value})}
                                  placeholder="Committee member for invitations"
                                />
                              </div>
                              <div>
                                <Label htmlFor="program_committee">2. Program</Label>
                                <Input
                                  id="program_committee"
                                  value={newEventRequest.program_committee}
                                  onChange={(e) => setNewEventRequest({...newEventRequest, program_committee: e.target.value})}
                                  placeholder="Committee member for program"
                                />
                              </div>
                              <div>
                                <Label htmlFor="sound_system_committee">3. Sound System</Label>
                                <Input
                                  id="sound_system_committee"
                                  value={newEventRequest.sound_system_committee}
                                  onChange={(e) => setNewEventRequest({...newEventRequest, sound_system_committee: e.target.value})}
                                  placeholder="Committee member for sound system"
                                />
                              </div>
                              <div>
                                <Label htmlFor="stage_decoration_committee">4. Stage Decoration</Label>
                                <Input
                                  id="stage_decoration_committee"
                                  value={newEventRequest.stage_decoration_committee}
                                  onChange={(e) => setNewEventRequest({...newEventRequest, stage_decoration_committee: e.target.value})}
                                  placeholder="Committee member for stage decoration"
                                />
                              </div>
                              <div>
                                <Label htmlFor="demolition_cleanup_committee">5. Demolition / Clean-Up</Label>
                                <Input
                                  id="demolition_cleanup_committee"
                                  value={newEventRequest.demolition_cleanup_committee}
                                  onChange={(e) => setNewEventRequest({...newEventRequest, demolition_cleanup_committee: e.target.value})}
                                  placeholder="Committee member for clean-up"
                                />
                              </div>
                              <div>
                                <Label htmlFor="food_refreshments_committee">6. Food / Refreshments</Label>
                                <Input
                                  id="food_refreshments_committee"
                                  value={newEventRequest.food_refreshments_committee}
                                  onChange={(e) => setNewEventRequest({...newEventRequest, food_refreshments_committee: e.target.value})}
                                  placeholder="Committee member for food/refreshments"
                                />
                              </div>
                              <div>
                                <Label htmlFor="safety_security_committee">7. Safety & Security</Label>
                                <Input
                                  id="safety_security_committee"
                                  value={newEventRequest.safety_security_committee}
                                  onChange={(e) => setNewEventRequest({...newEventRequest, safety_security_committee: e.target.value})}
                                  placeholder="Committee member for safety & security"
                                />
                              </div>
                              <div>
                                <Label htmlFor="documentation_committee">8. Documentation</Label>
                                <Input
                                  id="documentation_committee"
                                  value={newEventRequest.documentation_committee}
                                  onChange={(e) => setNewEventRequest({...newEventRequest, documentation_committee: e.target.value})}
                                  placeholder="Committee member for documentation"
                                />
                              </div>
                              <div>
                                <Label htmlFor="registration_committee">9. Registration</Label>
                                <Input
                                  id="registration_committee"
                                  value={newEventRequest.registration_committee}
                                  onChange={(e) => setNewEventRequest({...newEventRequest, registration_committee: e.target.value})}
                                  placeholder="Committee member for registration"
                                />
                              </div>
                              <div>
                                <Label htmlFor="evaluation_committee">10. Evaluation</Label>
                                <Input
                                  id="evaluation_committee"
                                  value={newEventRequest.evaluation_committee}
                                  onChange={(e) => setNewEventRequest({...newEventRequest, evaluation_committee: e.target.value})}
                                  placeholder="Committee member for evaluation"
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* REQUIREMENTS INFORMATION Section */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-primary border-b pb-2">Requirements Information</h3>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                              <h4 className="font-semibold text-blue-900 mb-2">📋 PRE-EVENT REQUIREMENTS (to be attached upon submission)</h4>
                              <ul className="text-sm text-blue-800 space-y-1">
                                <li>• Letter of Request (signed by Program Head or Dean)</li>
                                <li>• Student Board Resolution (if the event will be held outside the school or involves a proposal for collections)</li>
                                <li>• Event Program / Invitation</li>
                                <li>• List of Permits Needed (if applicable)</li>
                                <li>• Copy of Certificate (if applicable)</li>
                              </ul>
                            </div>
                            
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                              <h4 className="font-semibold text-yellow-900 mb-2">📊 POST-EVENT REQUIREMENTS (to be submitted within 3-5 days after the event)</h4>
                              <ul className="text-sm text-yellow-800 space-y-1">
                                <li>• Post-Event Result</li>
                                <li>• Accomplishment / Narrative Report</li>
                              </ul>
                            </div>
                            
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <h4 className="font-semibold text-red-900 mb-2">⚠️ IMPORTANT REMINDERS:</h4>
                              <ul className="text-sm text-red-800 space-y-1">
                                <li>• Requests must be submitted to the Office of the School Activities <strong>8 days or more before the event date</strong> to comply with the VPAA's 7-day requirement.</li>
                                <li>• The Office of the School Activities is open <strong>Monday to Friday, 8:00 a.m. to 5:00 p.m. only</strong>.</li>
                                <li>• Incomplete requirements will not be accepted.</li>
                              </ul>
                            </div>
                          </div>
                          <div className="flex justify-end space-x-3 pt-6 border-t">
                            <Button 
                              variant="outline"
                              onClick={() => setShowNewRequestForm(false)}
                              className="px-6"
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleSubmitEventRequest}
                              disabled={loading}
                              className="gradient-primary px-6"
                            >
                              {loading ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Submitting...
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4 mr-2" />
                                  Submit Request
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    )}

              {/* Inner Tabs for My Events and All Events */}
              <Tabs defaultValue="all-events" className="space-y-6">
                <div className="flex justify-center">
                  <TabsList className="grid w-[400px] grid-cols-2">
                    <TabsTrigger value="all-events" className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      All Events
                    </TabsTrigger>
                    <TabsTrigger value="my-events" className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      My Events
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* My Events Tab */}
                <TabsContent value="my-events" className="space-y-6">
                  <Card className="card-elevated">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            My Event Requests
                          </CardTitle>
                          <CardDescription>Track your event requests and download certificates</CardDescription>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {eventRequests.length} Total Requests
                        </Badge>
                      </div>
                      
                      {/* Filter Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                        <Card 
                          className={`cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
                            eventsFilter === 'all' ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                          }`}
                          onClick={() => setEventsFilter('all')}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Activity className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-xl font-bold">{eventRequests.length}</p>
                                <p className="text-xs text-muted-foreground">All Requests</p>
                              </div>
                            </div>
                            {eventsFilter === 'all' && (
                              <div className="mt-2 text-xs text-blue-600 font-medium">
                                ✓ Currently viewing all
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        
                        <Card 
                          className={`cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
                            eventsFilter === 'approved' ? 'ring-2 ring-green-500 bg-green-50' : ''
                          }`}
                          onClick={() => setEventsFilter('approved')}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-green-100 rounded-lg">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </div>
                              <div>
                                <p className="text-xl font-bold">{eventRequests.filter(r => r.status === 'approved').length}</p>
                                <p className="text-xs text-muted-foreground">Approved</p>
                              </div>
                            </div>
                            {eventsFilter === 'approved' && (
                              <div className="mt-2 text-xs text-green-600 font-medium">
                                ✓ Currently viewing approved
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        
                        <Card 
                          className={`cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
                            eventsFilter === 'rejected' ? 'ring-2 ring-red-500 bg-red-50' : ''
                          }`}
                          onClick={() => setEventsFilter('rejected')}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-red-100 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-red-600" />
                              </div>
                              <div>
                                <p className="text-xl font-bold">{eventRequests.filter(r => r.status === 'rejected').length}</p>
                                <p className="text-xs text-muted-foreground">Declined</p>
                              </div>
                            </div>
                            {eventsFilter === 'rejected' && (
                              <div className="mt-2 text-xs text-red-600 font-medium">
                                ✓ Currently viewing declined
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        
                        <Card 
                          className={`cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
                            eventsFilter === 'pending' ? 'ring-2 ring-yellow-500 bg-yellow-50' : ''
                          }`}
                          onClick={() => setEventsFilter('pending')}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-yellow-100 rounded-lg">
                                <Clock className="w-4 h-4 text-yellow-600" />
                              </div>
                              <div>
                                <p className="text-xl font-bold">{eventRequests.filter(r => r.status === 'pending').length}</p>
                                <p className="text-xs text-muted-foreground">Pending</p>
                              </div>
                            </div>
                            {eventsFilter === 'pending' && (
                              <div className="mt-2 text-xs text-yellow-600 font-medium">
                                ✓ Currently viewing pending
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        let filteredRequests = eventRequests;
                        if (eventsFilter === 'approved') {
                          filteredRequests = eventRequests.filter(r => r.status === 'approved');
                        } else if (eventsFilter === 'rejected') {
                          filteredRequests = eventRequests.filter(r => r.status === 'rejected');
                        } else if (eventsFilter === 'pending') {
                          filteredRequests = eventRequests.filter(r => r.status === 'pending');
                        }
                        
                        return filteredRequests.length === 0 ? (
                          <div className="text-center py-8">
                            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <h3 className="text-lg font-medium mb-2 text-muted-foreground">
                              {eventsFilter === 'approved' && 'No Approved Events'}
                              {eventsFilter === 'rejected' && 'No Declined Events'}
                              {eventsFilter === 'pending' && 'No Pending Events'}
                              {eventsFilter === 'all' && 'No Event Requests Yet'}
                            </h3>
                            <p className="text-muted-foreground mb-4">
                              {eventsFilter === 'all' ? 'Submit an event request to get started.' : `No ${eventsFilter} event requests found.`}
                            </p>
                            {eventsFilter === 'all' && (
                              <Button 
                                onClick={() => setShowNewRequestForm(true)}
                                className="gradient-primary"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Request Your First Event
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredRequests.map((request) => (
                              <Card key={request.id} className={`overflow-hidden hover:shadow-lg transition-shadow border-l-4 ${
                                request.status === 'approved' ? 'border-l-green-500' :
                                request.status === 'rejected' ? 'border-l-red-500' :
                                request.status === 'pending' ? 'border-l-yellow-500' :
                                'border-l-gray-500'
                              }`}>
                                <CardContent className="p-6">
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center space-x-2">
                                      <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">My Request</Badge>
                                    </div>
                                  </div>
                                  
                                  <h3 className="font-bold text-lg mb-2">
                                    {request.title}
                                  </h3>
                                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                    {request.description}
                                  </p>
                                  
                                  <div className="space-y-2 text-sm">
                                    <div className="flex items-center space-x-2">
                                      <Calendar className="w-4 h-4 text-muted-foreground" />
                                      <span>{formatDate(request.date)} at {request.time}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <MapPin className="w-4 h-4 text-muted-foreground" />
                                      <span>{request.venue}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Users className="w-4 h-4 text-muted-foreground" />
                                      <span>{request.expected_participants} expected participants</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <FileText className="w-4 h-4 text-muted-foreground" />
                                      <span>{request.event_type}</span>
                                    </div>
                                  </div>
                                  
                                  {request.admin_comments && (
                                    <div className="mt-4 p-3 bg-muted rounded-lg">
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Admin Comments:</p>
                                      <p className="text-sm">{request.admin_comments}</p>
                                    </div>
                                  )}
                                  
                                  <div className="mt-4 pt-4 border-t space-y-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedEventRequest(request);
                                        setShowEventDetailsModal(true);
                                      }}
                                      className="w-full"
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Full Details
                                    </Button>
                                    {request.status === 'approved' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => generatePDF(request)}
                                        className="w-full"
                                      >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download PDF Certificate
                                      </Button>
                                    )}
                                    {request.status === 'pending' && (
                                      <Badge variant="secondary" className="w-full justify-center py-2">
                                        <Clock className="w-4 h-4 mr-2" />
                                        Awaiting Admin Review
                                      </Badge>
                                    )}
                                    {request.status === 'rejected' && (
                                      <Badge variant="destructive" className="w-full justify-center py-2">
                                        <AlertCircle className="w-4 h-4 mr-2" />
                                        Request Declined
                                      </Badge>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        );
                      })()
                      }
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* All Events Tab */}
                <TabsContent value="all-events" className="space-y-6">
                  <Card className="card-elevated">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-600" />
                            All Available Events
                          </CardTitle>
                          <CardDescription>Discover and register for events from all organizers</CardDescription>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center space-x-2">
                            <Search className="w-4 h-4 text-muted-foreground" />
                            <Input
                              placeholder="Search events..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-64"
                            />
                          </div>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            {events.length} Available
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {events.length === 0 ? (
                        <div className="text-center py-8">
                          <Activity className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                          <h3 className="text-lg font-medium mb-2 text-muted-foreground">No Events Available</h3>
                          <p className="text-muted-foreground">
                            No events are currently available for registration.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {events.filter(e => {
                            const event = e;
                            const matchesSearch = !searchTerm || 
                              event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              event.organizer_name.toLowerCase().includes(searchTerm.toLowerCase());
                            return matchesSearch; // Removed !event.isMyEvent condition
                          }).map((event) => (
                            <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                              <CardContent className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex items-center space-x-2">
                                    <Badge className={getStatusColor(event.status)}>{event.status}</Badge>
                                    {event.isRegistered && (
                                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                        Registered
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                <h3 
                                  className="font-bold text-lg mb-2 cursor-pointer hover:text-primary"
                                  onClick={() => {
                                    setSelectedEvent(event);
                                    setShowEventDetails(true);
                                  }}
                                >
                                  {event.title}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                  {event.description}
                                </p>
                                
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center space-x-2">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <span>{formatDate(event.date)} at {event.time}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <MapPin className="w-4 h-4 text-muted-foreground" />
                                    <span>{event.venue}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <span>by {event.organizer_name}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                    <span>{event.current_participants}/{event.max_participants} participants</span>
                                  </div>
                                </div>
                                
                                <div className="mt-4 pt-4 border-t">
                                  {!event.isRegistered ? (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => handleEventRegister(event.id)}
                                      className="w-full"
                                      disabled={loading || event.status === "completed" || event.current_participants >= event.max_participants}
                                    >
                                      {loading ? "Registering..." : 
                                       event.current_participants >= event.max_participants ? "Event Full" : "Register"}
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => handleEventRegister(event.id)}
                                      className="w-full"
                                      disabled={loading}
                                    >
                                      {loading ? "Loading..." : "Unregister"}
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Calendar Tab - Functional Calendar View */}
            <TabsContent value="calendar" className="space-y-6">
              {/* Header with Search and Filter */}
              <Card className="card-elevated">
                <CardHeader>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Event Calendar
                      </CardTitle>
                      <CardDescription>View all school events in calendar format</CardDescription>
                    </div>
                  </div>
                  
                  {/* Search and Filter Bar */}
                  <div className="flex flex-col sm:flex-row gap-4 mt-4 pt-4 border-t">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search calendar events..."
                        value={calendarSearch}
                        onChange={(e) => setCalendarSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                      <select
                        value={calendarFilter}
                        onChange={(e) => setCalendarFilter(e.target.value as any)}
                        className="px-3 py-2 border border-input bg-background rounded-md"
                      >
                        <option value="all">All Events</option>
                        <option value="today">Today</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="this_week">This Week</option>
                        <option value="this_month">This Month</option>
                      </select>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Statistics Cards - Quick Filters */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card 
                  className={`card-elevated cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
                    calendarFilter === 'all' ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => {
                    setCalendarFilter('all');
                    setCalendarSearch('');
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{calendarEvents.length}</p>
                        <p className="text-sm text-muted-foreground">Total Events</p>
                      </div>
                    </div>
                    {calendarFilter === 'all' && (
                      <div className="mt-2 text-xs text-blue-600 font-medium">
                        ✓ Currently viewing all
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card 
                  className={`card-elevated cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
                    calendarFilter === 'today' ? 'ring-2 ring-green-500 bg-green-50' : ''
                  }`}
                  onClick={() => {
                    setCalendarFilter('today');
                    setCalendarSearch('');
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CalendarDays className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{getCalendarEventsByFilter('today').length}</p>
                        <p className="text-sm text-muted-foreground">Today</p>
                      </div>
                    </div>
                    {calendarFilter === 'today' && (
                      <div className="mt-2 text-xs text-green-600 font-medium">
                        ✓ Currently viewing today
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card 
                  className={`card-elevated cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
                    calendarFilter === 'this_week' ? 'ring-2 ring-purple-500 bg-purple-50' : ''
                  }`}
                  onClick={() => {
                    setCalendarFilter('this_week');
                    setCalendarSearch('');
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Clock className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{getCalendarEventsByFilter('this_week').length}</p>
                        <p className="text-sm text-muted-foreground">This Week</p>
                      </div>
                    </div>
                    {calendarFilter === 'this_week' && (
                      <div className="mt-2 text-xs text-purple-600 font-medium">
                        ✓ Currently viewing week
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card 
                  className={`card-elevated cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
                    calendarFilter === 'upcoming' ? 'ring-2 ring-orange-500 bg-orange-50' : ''
                  }`}
                  onClick={() => {
                    setCalendarFilter('upcoming');
                    setCalendarSearch('');
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{getCalendarEventsByFilter('upcoming').length}</p>
                        <p className="text-sm text-muted-foreground">Upcoming</p>
                      </div>
                    </div>
                    {calendarFilter === 'upcoming' && (
                      <div className="mt-2 text-xs text-orange-600 font-medium">
                        ✓ Currently viewing upcoming
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Calendar Grid Display */}
              <Card className="card-elevated">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const prevMonth = new Date(selectedDate);
                          prevMonth.setMonth(prevMonth.getMonth() - 1);
                          setSelectedDate(prevMonth);
                        }}
                      >
                        ←
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedDate(new Date())}
                      >
                        Today
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const nextMonth = new Date(selectedDate);
                          nextMonth.setMonth(nextMonth.getMonth() + 1);
                          setSelectedDate(nextMonth);
                        }}
                      >
                        →
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 mb-4">
                    {/* Header row */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="p-2 text-center text-sm font-semibold text-muted-foreground">
                        {day}
                      </div>
                    ))}
                    
                    {/* Calendar cells */}
                    {(() => {
                      const year = selectedDate.getFullYear();
                      const month = selectedDate.getMonth();
                      const firstDay = new Date(year, month, 1);
                      const lastDay = new Date(year, month + 1, 0);
                      const startDate = new Date(firstDay);
                      startDate.setDate(startDate.getDate() - firstDay.getDay());
                      
                      const cells = [];
                      for (let i = 0; i < 42; i++) {
                        const currentDate = new Date(startDate);
                        currentDate.setDate(startDate.getDate() + i);
                        
                        const isCurrentMonth = currentDate.getMonth() === month;
                        // Use Philippine timezone for today comparison
                        const philippineToday = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
                        const isToday = currentDate.toDateString() === philippineToday.toDateString();
                        
                        // Get events for this date from calendar_events
                        const dateString = currentDate.toISOString().split('T')[0];
                        const dayEvents = getFilteredCalendarEvents().filter(event => {
                          if (!event.date) return false;
                          // Parse both dates consistently in Philippine timezone
                          const eventDate = new Date(event.date + 'T00:00:00+08:00');
                          const eventDateString = eventDate.toISOString().split('T')[0];
                          return eventDateString === dateString;
                        });
                        
                        cells.push(
                          <div
                            key={i}
                            className={`min-h-[100px] p-1 border border-gray-200 ${
                              isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                            } ${isToday ? 'bg-blue-50 border-blue-300' : ''}`}
                          >
                            <div className={`text-sm font-medium mb-1 ${
                              isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                            } ${isToday ? 'text-blue-600' : ''}`}>
                              {currentDate.getDate()}
                            </div>
                            
                            {/* Events for this date */}
                            <div className="space-y-1">
                              {dayEvents.slice(0, 3).map((event, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs p-1 rounded text-white bg-blue-500 truncate cursor-pointer hover:bg-blue-600"
                                  onClick={() => {
                                    // Show event details in a simple alert or modal
                                    alert(`📅 ${event.title}\n📍 ${event.venue || 'TBA'}\n⏰ ${event.time || 'TBA'}\n📝 ${event.description || 'No description'}`);
                                  }}
                                  title={`${event.title} - ${event.venue || 'TBA'}`}
                                >
                                  {event.time && (
                                    <span className="font-mono">{event.time.slice(0, 5)} </span>
                                  )}
                                  {event.title}
                                </div>
                              ))}
                              {dayEvents.length > 3 && (
                                <div className="text-xs text-gray-500 text-center">
                                  +{dayEvents.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return cells;
                    })()}
                  </div>
                  
                  {/* Calendar Legend */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span>Calendar Events</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                      <span>Today</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-50 border border-gray-200 rounded"></div>
                      <span>Other Month</span>
                    </div>
                  </div>
                </CardContent>
              </Card>


            </TabsContent>

            <TabsContent value="multimedia" className="space-y-6">
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Multimedia Feed
                  </CardTitle>
                  <CardDescription>View posts, photos, and videos from organizers</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-muted-foreground">Discover posts, photos, and updates from event organizers</p>
                </CardContent>
              </Card>

              {/* Posts Feed */}
              <div className="space-y-6">
                {multimediaPosts.length === 0 ? (
                  <Card className="card-elevated">
                    <CardContent className="text-center py-12">
                      <Image className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-medium mb-2 text-muted-foreground">No Posts Yet</h3>
                      <p className="text-muted-foreground">Check back later for multimedia content from organizers</p>
                    </CardContent>
                  </Card>
                ) : (
                  multimediaPosts.map((post) => (
                    <Card key={post.id} className="card-elevated overflow-hidden">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{post.user_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {post.user_role} • {new Date(post.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {post.media_type}
                          </Badge>
                        </div>
                        {post.title && (
                          <CardTitle className="text-lg">{post.title}</CardTitle>
                        )}
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Post Content */}
                        <p className="text-sm leading-relaxed">{post.content}</p>

                        {/* Media Content */}
                        {post.media_url && (
                          <div className="rounded-lg overflow-hidden border">
                            {post.media_type === 'image' ? (
                              <img 
                                src={post.media_url} 
                                alt={post.title || "Post image"}
                                className="w-full h-auto max-h-96 object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : post.media_type === 'video' ? (
                              <div className="relative">
                                <video 
                                  src={post.media_url}
                                  controls
                                  className="w-full h-auto max-h-96"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                >
                                  Your browser does not support the video tag.
                                </video>
                              </div>
                            ) : null}
                          </div>
                        )}

                        {/* Tags */}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {post.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Engagement Stats */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Heart className="w-4 h-4" />
                              {post.likes_count || 0} likes
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-4 h-4" />
                              {post.comments_count || 0} comments
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLike(post.id)}
                              className="flex items-center gap-2 hover:text-red-500"
                            >
                              <Heart className="w-4 h-4" />
                              Like
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleComments(post.id)}
                              className="flex items-center gap-2"
                            >
                              <MessageCircle className="w-4 h-4" />
                              Comment
                            </Button>
                          </div>
                        </div>

                        {/* Comments Section */}
                        {showComments[post.id] && (
                          <div className="space-y-3 pt-3 border-t">
                            {/* Add Comment */}
                            <div className="flex items-center space-x-2">
                              <Input
                                placeholder="Write a comment..."
                                value={newComment[post.id] || ""}
                                onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleComment(post.id);
                                  }
                                }}
                                className="flex-1"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleComment(post.id)}
                                disabled={!newComment[post.id]?.trim()}
                              >
                                Post
                              </Button>
                            </div>

                            {/* Display Comments */}
                            {showComments[post.id] && (
                              <div className="space-y-2 max-h-48 overflow-y-auto border-t pt-2">
                                {postComments[post.id] && postComments[post.id].length > 0 ? (
                                  postComments[post.id].map((comment, index) => (
                                    <div key={comment.id || index} className="flex space-x-2 p-2 bg-muted/30 rounded">
                                      <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                        <User className="w-3 h-3 text-white" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-xs font-medium">{comment.user_name}</p>
                                        <p className="text-sm">{comment.comment_text}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {new Date(comment.created_at).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </p>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs text-muted-foreground text-center py-2">No comments yet. Be the first to comment!</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="program" className="space-y-6">
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Workflow className="w-5 h-5" />
                    My Program Flows
                  </CardTitle>
                  <CardDescription>View approved program flows for your events</CardDescription>
                </CardHeader>
                <CardContent>
                  {approvedProgramFlows.length === 0 ? (
                    <div className="text-center py-12">
                      <Workflow className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-medium mb-2 text-muted-foreground">No Program Flows Yet</h3>
                      <p className="text-muted-foreground">
                        Program flows will appear here once they are created and approved for your events
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {approvedProgramFlows.map((flow) => (
                        <Card key={flow.id} className="cursor-pointer hover:shadow-md transition-all">
                          <CardHeader>
                            <div className="flex items-center justify-between mb-2">
                              <Badge className="bg-green-100 text-green-800">Approved</Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrintProgramFlow(flow);
                                }}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Print
                              </Button>
                            </div>
                            <CardTitle className="text-lg">{flow.event_title}</CardTitle>
                            <CardDescription className="text-sm">{flow.title}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            {flow.description && (
                              <p className="text-sm text-muted-foreground mb-3">{flow.description}</p>
                            )}
                            
                            <div className="space-y-2">
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Activity className="w-4 h-4 mr-2" />
                                {flow.activities.length} activities planned
                              </div>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Clock className="w-4 h-4 mr-2" />
                                {flow.activities.reduce((total, activity) => total + activity.duration, 0)} minutes total
                              </div>
                            </div>

                            <div className="mt-4 flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">
                                Created {new Date(flow.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </CardContent>
                          <div className="p-4 pt-0">
                            <Button 
                              className="w-full"
                              onClick={() => {
                                setSelectedProgramFlow(flow);
                                setShowProgramFlowDetails(true);
                              }}
                            >
                              View Details
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card className="card-elevated">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Notifications</CardTitle>
                      <CardDescription>Your notifications and updates</CardDescription>
                    </div>
                    {unreadNotifications > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={clearAllNotifications}
                        className="ml-auto"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark All as Read
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {notifications.length === 0 ? (
                      <div className="text-center py-12">
                        <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-medium mb-2 text-muted-foreground">No Notifications</h3>
                        <p className="text-muted-foreground">You'll receive notifications here</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <Card 
                          key={notification.id} 
                          className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                            !notification.is_read 
                              ? 'border-l-4 border-l-primary bg-primary/5 hover:bg-primary/10' 
                              : 'hover:bg-muted/20'
                          }`}
                          onClick={() => !notification.is_read && markNotificationAsRead(notification.id)}
                        >
                          <div className="flex items-start space-x-4">
                            <div className={`p-2 rounded-full ${
                              !notification.is_read ? 'bg-primary/10' : 'bg-muted'
                            }`}>
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <h4 className={`font-semibold ${
                                  !notification.is_read ? 'text-primary' : ''
                                }`}>
                                  {notification.title}
                                </h4>
                                {!notification.is_read && (
                                  <div className="w-2 h-2 bg-primary rounded-full mt-1 ml-2 flex-shrink-0"></div>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <p className="text-xs text-muted-foreground">
                                  {new Date(notification.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    timeZone: 'Asia/Manila'
                                  })}
                                </p>
                                {!notification.is_read && (
                                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                                    New
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
                {/* Reports List */}
                <div className="lg:col-span-1">
                  <Card className="card-elevated h-full">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>My Reports</CardTitle>
                          <CardDescription>Support & Help Center</CardDescription>
                        </div>
                        <Button 
                          onClick={() => setShowNewReportForm(true)}
                          size="sm"
                          className="gradient-primary"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="overflow-y-auto h-[calc(100%-120px)]">
                      {/* New Report Form */}
                      {showNewReportForm && (
                        <Card className="mb-4 border-2 border-primary/20">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">New Report</CardTitle>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setShowNewReportForm(false)}
                              >
                                ✕
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <Label className="text-sm">Type</Label>
                              <Select value={newReportType} onValueChange={(value: any) => setNewReportType(value)}>
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="rejection_complaint">Rejection Complaint</SelectItem>
                                  <SelectItem value="technical_issue">Technical Issue</SelectItem>
                                  <SelectItem value="general_inquiry">General Inquiry</SelectItem>
                                  <SelectItem value="event_feedback">Event Feedback</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-sm">Title</Label>
                              <Input
                                value={newReportTitle}
                                onChange={(e) => setNewReportTitle(e.target.value)}
                                placeholder="Brief title"
                                className="h-9"
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Description</Label>
                              <Textarea
                                value={newReportDescription}
                                onChange={(e) => setNewReportDescription(e.target.value)}
                                placeholder="Describe your issue"
                                rows={3}
                                className="text-sm"
                              />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => setShowNewReportForm(false)}
                              >
                                Cancel
                              </Button>
                              <Button 
                                size="sm"
                                onClick={handleSubmitReport}
                                disabled={loading}
                              >
                                {loading ? "Submitting..." : "Submit"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Reports List */}
                      <div className="space-y-3">
                        {reports.length === 0 ? (
                          <div className="text-center py-8">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                            <p className="text-sm text-muted-foreground mb-3">No reports yet</p>
                            <Button 
                              size="sm"
                              onClick={() => setShowNewReportForm(true)}
                              className="gradient-primary"
                            >
                              Create Report
                            </Button>
                          </div>
                        ) : (
                          reports.map((report) => (
                            <Card 
                              key={report.id} 
                              className={`cursor-pointer transition-all hover:shadow-md ${
                                selectedReport?.id === report.id ? 'ring-2 ring-primary bg-primary/5' : ''
                              }`}
                              onClick={() => {
                                setSelectedReport(report);
                                loadReportMessages(report.id);
                              }}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="font-medium text-sm truncate pr-2">{report.title}</h4>
                                  <Badge className={`${getStatusColor(report.status)} text-xs`}>
                                    {report.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{report.description}</p>
                                <div className="flex items-center justify-between">
                                  <Badge variant="outline" className="text-xs">
                                    {report.report_type.replace('_', ' ')}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(report.created_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Chat Area */}
                <div className="lg:col-span-2">
                  <Card className="card-elevated h-full">
                    {selectedReport ? (
                      <>
                        <CardHeader className="bg-gradient-to-r from-blue-500 to-violet-500 text-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-white text-lg">{selectedReport.title}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className="bg-white/20 text-white border-white/30 text-xs">
                                  {selectedReport.status}
                                </Badge>
                                <Badge className="bg-white/10 text-white border-white/20 text-xs">
                                  {selectedReport.report_type.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedReport(null)}
                              className="text-white hover:bg-white/20"
                            >
                              ✕
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="flex flex-col h-[calc(100%-120px)] p-0">
                          {/* Report Description */}
                          <div className="p-4 bg-muted/20 border-b">
                            <p className="text-sm text-muted-foreground"><strong>Original Report:</strong> {selectedReport.description}</p>
                          </div>

                          {/* Messages */}
                          <div className="flex-1 overflow-y-auto p-4 space-y-4 h-96 max-h-96">
                            {reportMessages.length === 0 ? (
                              <div className="text-center py-12">
                                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full flex items-center justify-center">
                                  <FileText className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-lg font-medium mb-2">Start the Conversation</h3>
                                <p className="text-muted-foreground">Send a message to get support from admin</p>
                              </div>
                            ) : (
                              reportMessages.map((message) => {
                                const isParticipantMessage = message.sender_role === 'participant';

                                return (
                                  <div
                                    key={message.id}
                                    className={`flex ${isParticipantMessage ? 'justify-end' : 'justify-start'} mb-2`}
                                  >
                                    <div
                                      className={`max-w-[70%] p-3 rounded-lg ${
                                        isParticipantMessage
                                          ? 'bg-blue-500 text-white'
                                          : 'bg-gray-100 text-gray-800'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-medium">
                                          {isParticipantMessage ? 'You' : 'Admin'}
                                        </span>
                                        <span className={`text-xs ${isParticipantMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                                          {new Date(message.created_at).toLocaleTimeString()}
                                        </span>
                                      </div>
                                      <p className="text-sm">{message.message}</p>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                          
                          {/* Message Input */}
                          <div className="p-4 border-t bg-muted/10">
                            <div className="flex space-x-3">
                              <Input
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type your message to admin..."
                                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                className="flex-1"
                              />
                              <Button 
                                onClick={handleSendMessage} 
                                disabled={!newMessage.trim()}
                                className="gradient-primary"
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </>
                    ) : (
                      <CardContent className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full flex items-center justify-center">
                            <FileText className="w-10 h-10 text-white" />
                          </div>
                          <h3 className="text-xl font-medium mb-2">Select a Report</h3>
                          <p className="text-muted-foreground mb-4">Choose a report from the left to start chatting with admin</p>
                          <Button 
                            onClick={() => setShowNewReportForm(true)}
                            className="gradient-primary"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Create New Report
                          </Button>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      
      {/* Event Details Modal */}
      {showEventDetails && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto m-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedEvent.title}</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowEventDetails(false)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Date</Label>
                  <p className="text-sm">{formatDate(selectedEvent.date)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Time</Label>
                  <p className="text-sm">{selectedEvent.time}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Venue</Label>
                  <p className="text-sm">{selectedEvent.venue}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Organizer</Label>
                  <p className="text-sm">{selectedEvent.organizer_name}</p>
                </div>
              </div>
              
              {selectedEvent.description && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1">{selectedEvent.description}</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowEventDetails(false)}>
                  Close
                </Button>
                {!selectedEvent.isRegistered ? (
                  <Button
                    onClick={() => {
                      handleEventRegister(selectedEvent.id);
                      setShowEventDetails(false);
                    }}
                    disabled={loading}
                  >
                    Register
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      handleEventRegister(selectedEvent.id);
                      setShowEventDetails(false);
                    }}
                    disabled={loading}
                  >
                    Unregister
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sweet Success Modal */}
      {(() => {
        if (showSuccessModal) {
          console.log('Success modal is rendering, showSuccessModal:', showSuccessModal, 'submittedRequestId:', submittedRequestId);
        }
        return null;
      })()}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 text-center shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="mb-8">
              {/* Animated Success Icon */}
              <div className="relative mx-auto mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg animate-pulse">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                {/* Confetti Effect */}
                <div className="absolute -top-2 -left-2 w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
                <div className="absolute -top-1 -right-3 w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce delay-100"></div>
                <div className="absolute -bottom-1 -left-3 w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-200"></div>
                <div className="absolute -bottom-2 -right-2 w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-300"></div>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                🎉 Request Submitted Successfully!
              </h2>
              
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-4 border border-green-200">
                <p className="text-green-800 font-medium mb-2">
                  ✅ Your event request "{newEventRequest.title || submittedRequestId || 'New Event'}" has been submitted!
                </p>
                <p className="text-green-700 text-sm">
                  📋 Request ID: <span className="font-mono bg-white px-2 py-1 rounded">{submittedRequestId.slice(0, 8)}...</span>
                </p>
              </div>
              
              <div className="text-left bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <Bell className="w-4 h-4 mr-2" />
                  What happens next?
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                    Admin will review your request within 24-48 hours
                  </li>
                  <li className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                    You'll receive a notification with the decision
                  </li>
                  <li className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                    Check "My Events" tab to track your request status
                  </li>
                </ul>
              </div>
              
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-4">
                  💝 Thank you for being part of our school community events!
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={() => {
                  setShowSuccessModal(false);
                  setActiveTab("events");
                }}
                className="flex-1"
              >
                <FileText className="w-4 h-4 mr-2" />
                View My Requests
              </Button>
              <Button 
                onClick={() => setShowSuccessModal(false)}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                <Heart className="w-4 h-4 mr-2" />
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Event Request Details Modal */}
      {showEventDetailsModal && selectedEventRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selectedEventRequest.title}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={
                      selectedEventRequest.status === 'approved' ? 'bg-green-100 text-green-800' :
                      selectedEventRequest.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      selectedEventRequest.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {selectedEventRequest.status.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Submitted: {new Date(selectedEventRequest.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setShowEventDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </Button>
              </div>

              {/* Basic Event Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Event Type</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEventRequest.event_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Date & Time</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedEventRequest.date).toLocaleDateString()} at {selectedEventRequest.time}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Venue</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEventRequest.venue}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Expected Participants</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEventRequest.expected_participants}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Budget Estimate</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedEventRequest.budget_estimate ? `₱${selectedEventRequest.budget_estimate.toLocaleString()}` : 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedEventRequest.description}</p>
              </div>

              {/* Request Reason */}
              <div className="mb-6">
                <label className="text-sm font-medium text-gray-700">Request Reason</label>
                <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedEventRequest.request_reason}</p>
              </div>

              {/* Requirements */}
              {selectedEventRequest.requirements && (
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-700">Requirements</label>
                  <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedEventRequest.requirements}</p>
                </div>
              )}

              {/* Committee Assignments */}
              {selectedEventRequest.form_data && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Event Committee Assignments</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: 'invitationCommittee', label: '1. Invitation Committee' },
                      { key: 'programCommittee', label: '2. Program Committee' },
                      { key: 'soundSystemCommittee', label: '3. Sound System Committee' },
                      { key: 'stageDecorationCommittee', label: '4. Stage Decoration Committee' },
                      { key: 'demolitionCleanupCommittee', label: '5. Demolition/Clean-Up Committee' },
                      { key: 'foodRefreshmentsCommittee', label: '6. Food/Refreshments Committee' },
                      { key: 'safetySecurityCommittee', label: '7. Safety & Security Committee' },
                      { key: 'documentationCommittee', label: '8. Documentation Committee' },
                      { key: 'registrationCommittee', label: '9. Registration Committee' },
                      { key: 'evaluationCommittee', label: '10. Evaluation Committee' }
                    ].map(({ key, label }) => {
                      const value = selectedEventRequest.form_data?.[key];
                      return value ? (
                        <div key={key} className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <label className="text-sm font-medium text-blue-900">{label}</label>
                          <p className="mt-1 text-sm text-blue-800">{value}</p>
                        </div>
                      ) : null;
                    })}
                  </div>
                  
                  {/* Show message if no committee assignments found */}
                  {!Object.keys(selectedEventRequest.form_data || {}).some(key => 
                    ['invitationCommittee', 'programCommittee', 'soundSystemCommittee', 'stageDecorationCommittee', 
                     'demolitionCleanupCommittee', 'foodRefreshmentsCommittee', 'safetySecurityCommittee', 
                     'documentationCommittee', 'registrationCommittee', 'evaluationCommittee'].includes(key) &&
                    selectedEventRequest.form_data[key]
                  ) && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
                      <p className="text-gray-600">No committee assignments have been made for this event yet.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Admin Comments */}
              {selectedEventRequest.admin_comments && (
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-700">Admin Comments</label>
                  <p className={`mt-1 text-sm p-3 rounded-lg ${
                    selectedEventRequest.status === 'rejected' 
                      ? 'bg-red-50 text-red-900 border border-red-200' 
                      : 'bg-green-50 text-green-900 border border-green-200'
                  }`}>
                    {selectedEventRequest.admin_comments}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                {selectedEventRequest.status === 'approved' && (
                  <Button
                    variant="default"
                    onClick={() => generatePDF(selectedEventRequest)}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF Certificate
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowEventDetailsModal(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Program Flow Details Modal */}
      {showProgramFlowDetails && selectedProgramFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selectedProgramFlow.event_title}</h2>
                  <p className="text-lg text-muted-foreground">{selectedProgramFlow.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800">
                    {selectedProgramFlow.status}
                  </Badge>
                  <Button
                    variant="outline"
                    onClick={() => handlePrintProgramFlow(selectedProgramFlow)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Print Program
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowProgramFlowDetails(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </Button>
                </div>
              </div>

              {selectedProgramFlow.description && (
                <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-sm">{selectedProgramFlow.description}</p>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Program Activities</h3>
                {selectedProgramFlow.activities.length === 0 ? (
                  <p className="text-muted-foreground">No activities defined yet.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedProgramFlow.activities
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((activity, index) => (
                        <div key={activity.id || index} className="border rounded-lg p-4 bg-card">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                                {index + 1}
                              </div>
                              <div>
                                <h4 className="font-medium">{activity.title}</h4>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {activity.time}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {activity.location}
                                  </span>
                                  <span>{activity.duration} minutes</span>
                                </div>
                              </div>
                            </div>
                            <Badge variant="outline" className="capitalize">
                              {activity.activity_type}
                            </Badge>
                          </div>
                          {activity.description && (
                            <div className="ml-11">
                              <p className="text-sm text-muted-foreground">{activity.description}</p>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Total Duration: {selectedProgramFlow.activities.reduce((total, activity) => total + activity.duration, 0)} minutes</span>
                  <span>Created: {new Date(selectedProgramFlow.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipantDashboard;