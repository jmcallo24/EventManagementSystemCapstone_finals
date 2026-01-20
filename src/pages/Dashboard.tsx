import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Users, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  Activity,
  CalendarDays,
  MessageCircle,
  Bell,
  LogOut,
  Eye,
  UserCheck,
  User
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import logo from "@/assets/image.png";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";

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
}

interface Participant {
  id: string;
  name: string;
  email: string;
  role: string;
  registration_date: string;
  attendance_status: string;
  student_id?: string;
  department?: string;
  year_level?: string;
  phone?: string;
}

interface EventWithParticipants extends Event {
  participants: Participant[];
}

const Dashboard = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsWithParticipants, setEventsWithParticipants] = useState<EventWithParticipants[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventWithParticipants | null>(null);
  const [loading, setLoading] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Load all events with real participant counts from ACTUAL DATABASE
  const loadEvents = async () => {
    setLoading(true);
    try {
      console.log('🔄 ADMIN DASHBOARD: Loading REAL data from database...');
      
      // Get ALL events from BOTH tables (events + event_requests)
      const [{ data: eventsData }, { data: eventRequestsData }] = await Promise.all([
        // Organizer-created events 
        supabase
          .from('events')
          .select(`
            *,
            organizer:organizer_id (name)
          `)
          .order('created_at', { ascending: false }),

        // Participant-requested events (approved ones become events)
        supabase
          .from('event_requests')
          .select(`
            *,
            requester:requester_id (name, email)
          `)
          .order('created_at', { ascending: false })
      ]);

      console.log('📊 REAL DATA LOADED:');
      console.log('- Events table:', eventsData?.length || 0, 'events');
      console.log('- Event requests table:', eventRequestsData?.length || 0, 'requests');

      const allEvents: Event[] = [];

      // Process events from events table
      if (eventsData) {
        for (const event of eventsData) {
          // Get REAL participant count from event_registrations
          const { count, error: countError } = await supabase
            .from('event_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);

          const realParticipantCount = countError ? 0 : (count || 0);

          allEvents.push({
            id: event.id,
            title: event.title,
            date: event.date,
            time: event.time || '00:00',
            venue: event.venue || 'TBA',
            current_participants: realParticipantCount,
            max_participants: event.max_participants || 100,
            status: event.status,
            event_type: event.event_type || 'General',
            description: event.description || '',
            organizer_name: event.organizer?.name || 'Unknown'
          });
        }
      }

      // Process approved event requests (these are also "events" now)
      if (eventRequestsData) {
        for (const request of eventRequestsData) {
          // Get REAL participant count from event_registrations
          const { count, error: countError } = await supabase
            .from('event_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', request.id);

          const realParticipantCount = countError ? 0 : (count || 0);

          allEvents.push({
            id: request.id,
            title: request.title,
            date: request.date,
            time: request.time || '00:00',
            venue: request.venue || 'TBA',
            current_participants: realParticipantCount,
            max_participants: request.expected_participants || 50,
            status: request.status,
            event_type: request.event_type || 'General',
            description: request.description || '',
            organizer_name: request.requester?.name || 'Unknown Requester'
          });
        }
      }

      console.log('✅ PROCESSED EVENTS:', allEvents.length);
      console.log('📈 TOTAL PARTICIPANTS:', allEvents.reduce((sum, e) => sum + e.current_participants, 0));
      
      setEvents(allEvents);
    } catch (error) {
      console.error('❌ Error loading REAL events data:', error);
      toast({
        title: "Error",
        description: "Failed to load events data from database",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load recent participants for the dashboard
  const loadRecentParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          id,
          registration_date,
          attendance_status,
          participant:participant_id (
            id,
            name,
            email,
            role,
            student_id,
            department
          ),
          event:event_id (
            id,
            title,
            date
          )
        `)
        .order('registration_date', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading recent participants:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in loadRecentParticipants:', error);
      return [];
    }
  };

  // Load approved events with their participants (REAL DATA using your working method)
  const loadEventsWithParticipants = async () => {
    setLoading(true);
    try {
      console.log('👥 LOADING REAL PARTICIPANTS DATA using your working method...');
      
      // Use the SAME method as Participants.tsx - get events from event_requests table
      const { data: eventRequestsData } = await supabase
        .from('event_requests')
        .select(`
          *,
          requester:requester_id (name)
        `)
        .eq('status', 'approved')
        .order('date', { ascending: true });

      console.log('� Event requests loaded:', eventRequestsData?.length || 0);
      console.log('Event Request IDs:', eventRequestsData?.map(e => e.id));

      const eventsWithParticipantsData: EventWithParticipants[] = [];

      // Process events from event_requests table (approved events) - EXACTLY like Participants.tsx
      for (const request of eventRequestsData || []) {
        console.log(`\n🔄 Processing event: ${request.title} (ID: ${request.id})`);
        
        // Try to get REAL participants using RPC functions (like the registration service does)
        let participants: Participant[] = [];
        
        try {
          // Method 1: Try RPC function to get event participants  
          const { data: rpcParticipants, error: rpcError } = await supabase.rpc('get_event_participants', {
            event_id: request.id
          });
          
          console.log(`RPC get_event_participants for ${request.title}:`, rpcParticipants, rpcError);
          
          if (rpcParticipants && !rpcError) {
            participants = rpcParticipants.map((p: any, index: number) => ({
              id: p.id || `participant-${index}`,
              name: p.name || p.user_name || 'Registered User',
              email: p.email || p.user_email || 'user@student.edu', 
              role: p.role || p.user_role || 'participant',
              student_id: p.student_id || '',
              department: p.department || '',
              year_level: p.year_level || '',
              phone: p.phone || '',
              registration_date: p.registration_date || p.created_at || new Date().toISOString(),
              attendance_status: p.attendance_status || 'registered'
            }));
            console.log(`✅ FOUND ${participants.length} REAL PARTICIPANTS via RPC!`);
          }
        } catch (error) {
          console.log('RPC method failed:', error);
        }
        
        // Method 2: Try direct query on event_registrations without foreign key joins
        if (participants.length === 0) {
          try {
            const { data: directParticipants, error: directError } = await supabase
              .from('event_registrations')
              .select('*')
              .eq('event_id', request.id);
              
            console.log(`Direct query event_registrations for ${request.title}:`, directParticipants, directError);
            
            if (directParticipants && directParticipants.length > 0 && !directError) {
              // Get user details separately for each registration
              for (const reg of directParticipants) {
                const { data: userData } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', reg.participant_id || reg.user_id)
                  .single();
                  
                if (userData) {
                  participants.push({
                    id: userData.id,
                    name: userData.name || 'Registered User',
                    email: userData.email || 'user@student.edu',
                    role: userData.role || 'participant',
                    student_id: userData.student_id || '',
                    department: userData.department || '',
                    year_level: userData.year_level || '',
                    phone: userData.phone || '',
                    registration_date: reg.registration_date || reg.created_at || new Date().toISOString(),
                    attendance_status: reg.attendance_status || 'registered'
                  });
                }
              }
              console.log(`✅ FOUND ${participants.length} REAL PARTICIPANTS via direct query + user lookup!`);
            }
          } catch (error) {
            console.log('Direct query method failed:', error);
          }
        }
        
        console.log(`📊 Final result for "${request.title}": ${participants.length} users who actually registered for THIS event`);

        eventsWithParticipantsData.push({
          id: request.id,
          title: request.title,
          date: request.date,
          time: request.time || '00:00',
          venue: request.venue || 'TBA',
          current_participants: participants.length, // Use actual found participants
          max_participants: request.expected_participants || 50,
          status: 'approved',
          event_type: request.event_type || 'General',
          description: request.description || '',
          organizer_name: request.requester?.name || 'Unknown Requester',
          participants
        });
      }

      const totalParticipants = eventsWithParticipantsData.reduce((sum, event) => sum + event.participants.length, 0);
      console.log('🎉 FINAL RESULTS:');
      console.log(`📊 Total events with participants: ${eventsWithParticipantsData.length}`);
      console.log(`👥 Total participants across all events: ${totalParticipants}`);
      
      setEventsWithParticipants(eventsWithParticipantsData);
    } catch (error) {
      console.error('❌ Error loading REAL participants data:', error);
      toast({
        title: "Error",
        description: "Failed to load participants data from database",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      if (parsedUser.role !== "admin") {
        if (parsedUser.role === "participant") {
          navigate("/participant-dashboard");
        } else if (parsedUser.role === "organizer") {
          navigate("/organizer-dashboard");
        } else {
          navigate("/login");
        }
      }
    } else {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    if (user?.role === "admin") {
      loadEvents();
      loadEventsWithParticipants(); // Load participants data on mount
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleViewParticipants = () => {
    setShowParticipants(true);
    loadEventsWithParticipants();
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  const totalParticipants = events.reduce((sum, event) => sum + event.current_participants, 0);
  const approvedEvents = events.filter(e => e.status === "approved").length;
  const pendingEvents = events.filter(e => e.status === "pending").length;

  return (
    <div className="flex h-screen bg-white">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-border p-6">
          <div className="flex items-center justify-between">
            <img src={logo} alt="Logo" className="w-12 h-12 object-contain rounded-xl shadow" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Welcome back, {user?.name || "Admin"}!
              </h1>
              <p className="text-muted-foreground mt-1">
                Here's what's happening with your school events today.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="relative hover:bg-muted/50 transition-smooth"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-accent rounded-full border-2 border-card"></span>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">
          {/* Refresh Button */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Dashboard Overview</h2>
            <div className="flex gap-2">
            
              <Button 
                variant="outline" 
                onClick={() => {
                  loadEvents();
                  loadEventsWithParticipants();
                }}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh Data"}
              </Button>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <Calendar className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? "..." : events.length}</div>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved Events</CardTitle>
                <Activity className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{loading ? "..." : approvedEvents}</div>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {loading ? "..." : eventsWithParticipants.reduce((sum, event) => sum + event.participants.length, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across {eventsWithParticipants.length} events
                </p>
                {eventsWithParticipants.length > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    ↗ {eventsWithParticipants.filter(e => e.participants.length > 0).length} active events
                  </p>
                )}
              </CardContent>
            </Card>
            
            <Card className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Events</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{loading ? "..." : pendingEvents}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting approval
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Events */}
            <div className="lg:col-span-2">
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="w-5 h-5" />
                    <span>Recent Events</span>
                  </CardTitle>
                  <CardDescription>
                    Overview of your latest school events
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-sm text-muted-foreground">Loading events...</p>
                    </div>
                  ) : events.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No events in the system yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {events.slice(0, 5).map((event) => (
                        <div key={event.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 gradient-secondary rounded-lg flex items-center justify-center">
                              <CalendarDays className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground">{event.title}</h4>
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                <span>{formatDate(event.date)}</span>
                                <span>•</span>
                                <span>{event.current_participants} participants</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={event.status === 'approved' ? 'default' : 'secondary'}>
                              {event.status}
                            </Badge>
                            <Badge variant="outline">
                              {event.event_type}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Quick Actions */}
                  <div className="flex items-center space-x-4 mt-6 pt-4 border-t">
                    <Button 
                      className="gradient-primary"
                      onClick={() => navigate("/approvals")}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Event Approvals
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleViewParticipants}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      View Participants
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Participants Quick View */}
            <div>
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Recent Participants</span>
                  </CardTitle>
                  <CardDescription>
                    Latest event registrations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-xs text-muted-foreground">Loading participants...</p>
                    </div>
                  ) : eventsWithParticipants.length === 0 ? (
                    <div className="text-center py-4">
                      <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">No events with participants yet</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Create events and participants can register
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleViewParticipants}
                      >
                        View All Events
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Show events with participants first */}
                      {eventsWithParticipants
                        .filter(event => event.participants.length > 0)
                        .slice(0, 4)
                        .map((event) => (
                        <div key={event.id} className="p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                          <h5 className="font-medium text-sm text-foreground truncate">
                            {event.title}
                          </h5>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-green-600 font-medium">
                              {event.participants.length} participants registered
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              {formatDate(event.date)}
                            </Badge>
                          </div>
                          {event.participants.length > 0 && (
                            <p className="text-xs text-blue-600 mt-1">
                              Latest: {event.participants[event.participants.length - 1]?.name}
                            </p>
                          )}
                        </div>
                      ))}
                      
                      {/* If no events with participants, show events without participants */}
                      {eventsWithParticipants.filter(event => event.participants.length > 0).length === 0 && (
                        <div className="space-y-2">
                          <p className="text-center text-xs text-muted-foreground mb-2">
                            {eventsWithParticipants.length} events available, no participants yet
                          </p>
                          {eventsWithParticipants.slice(0, 3).map((event) => (
                            <div key={event.id} className="p-2 border border-dashed border-muted-foreground/30 rounded text-center">
                              <p className="text-xs font-medium">{event.title}</p>
                              <p className="text-xs text-muted-foreground">0 participants</p>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <Button 
                        variant="outline" 
                        className="w-full mt-4"
                        onClick={handleViewParticipants}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View All Events & Participants
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Participants Section - Only show when requested */}
          {showParticipants && (
            <div className="mt-8">
              <Card className="card-elevated">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <Users className="w-5 h-5" />
                        <span>Event Participants</span>
                      </CardTitle>
                      <CardDescription>View participants for each approved event</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => loadEventsWithParticipants()}
                        disabled={loading}
                      >
                        {loading ? "Loading..." : "Refresh"}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowParticipants(false)}
                      >
                        Hide
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Events List */}
                    <div className="space-y-4">
                      <h3 className="font-medium">Events with Participants</h3>
                      {loading ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                          <p className="mt-2 text-xs text-muted-foreground">Loading events...</p>
                        </div>
                      ) : eventsWithParticipants.length === 0 ? (
                        <div className="p-6 text-center border rounded-lg">
                          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground mb-2">No approved events with participants yet</p>
                          <p className="text-xs text-muted-foreground">Create and approve events, then participants can register</p>
                        </div>
                      ) : (
                        eventsWithParticipants.map((event) => (
                          <Card 
                            key={event.id} 
                            className={`cursor-pointer transition-colors hover:border-primary/50 ${
                              selectedEvent?.id === event.id ? 'border-primary bg-primary/5' : ''
                            }`}
                            onClick={() => setSelectedEvent(event)}
                          >
                            <CardContent className="p-4">
                              <h4 className="font-medium text-sm">{event.title}</h4>
                              <p className="text-xs text-muted-foreground">{formatDate(event.date)} at {event.time}</p>
                              <p className="text-xs text-muted-foreground">{event.venue}</p>
                              <div className="flex items-center justify-between mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {event.event_type}
                                </Badge>
                                <div className="flex items-center space-x-1">
                                  <Users className="w-3 h-3" />
                                  <span className="text-xs text-green-600 font-medium">
                                    {event.participants.length}/{event.max_participants}
                                  </span>
                                </div>
                              </div>
                              {event.participants.length === 0 && (
                                <p className="text-xs text-muted-foreground mt-1 italic">No participants yet</p>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>

                    {/* Participants Details */}
                    <div className="lg:col-span-2">
                      {selectedEvent ? (
                        <div>
                          <h3 className="font-medium mb-4">{selectedEvent.title} - Participants</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            {selectedEvent.participants.length} registered participants
                          </p>
                          {selectedEvent.participants.length === 0 ? (
                            <div className="text-center py-8 border rounded-lg">
                              <UserCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                              <p className="text-muted-foreground">No participants registered yet</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Participants can register for this event from the participant dashboard
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {selectedEvent.participants.map((participant) => (
                                <div key={participant.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-3 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                          <User className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                          <h4 className="font-medium">{participant.name}</h4>
                                          <p className="text-sm text-muted-foreground">{participant.email}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                                        <div>
                                          <p className="text-xs text-muted-foreground">Student ID:</p>
                                          <p className="font-medium">{participant.student_id || 'N/A'}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground">Department:</p>
                                          <p className="font-medium">{participant.department || 'N/A'}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground">Year Level:</p>
                                          <p className="font-medium">{participant.year_level || 'N/A'}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground">Phone:</p>
                                          <p className="font-medium">{participant.phone || 'N/A'}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground">Registered:</p>
                                          <p className="font-medium">{formatDate(participant.registration_date)}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground">Role in System:</p>
                                          <Badge variant="outline" className="mt-1">{participant.role}</Badge>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex flex-col items-end space-y-2">
                                      <Badge 
                                        variant={
                                          participant.attendance_status === "registered" ? "default" :
                                          participant.attendance_status === "attended" ? "default" : "secondary"
                                        }
                                        className={
                                          participant.attendance_status === "attended" ? "bg-green-100 text-green-800" :
                                          participant.attendance_status === "registered" ? "bg-blue-100 text-blue-800" :
                                          "bg-gray-100 text-gray-800"
                                        }
                                      >
                                        {participant.attendance_status}
                                      </Badge>
                                      
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => {
                                          // Mark attendance functionality can be added here
                                          toast({
                                            title: "Feature Coming Soon",
                                            description: "Attendance marking will be available soon",
                                          });
                                        }}
                                      >
                                        <UserCheck className="w-4 h-4 mr-1" />
                                        Mark Present
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              
                              {/* Summary */}
                              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                                <h4 className="font-medium mb-2">Participants Summary</h4>
                                <div className="grid grid-cols-3 gap-4 text-center">
                                  <div>
                                    <p className="text-2xl font-bold text-blue-600">
                                      {selectedEvent.participants.length}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Total Registered</p>
                                  </div>
                                  <div>
                                    <p className="text-2xl font-bold text-green-600">
                                      {selectedEvent.participants.filter(p => p.attendance_status === 'attended').length}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Attended</p>
                                  </div>
                                  <div>
                                    <p className="text-2xl font-bold text-yellow-600">
                                      {selectedEvent.max_participants - selectedEvent.participants.length}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Available Slots</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-64 flex items-center justify-center border rounded-lg">
                          <div className="text-center">
                            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-lg font-medium mb-2">Select an Event</h3>
                            <p className="text-muted-foreground">
                              Choose an event from the left to view its participants
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;