import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Eye, Users, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";

interface EventWithParticipants {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  event_type: string;
  description: string;
  organizer_name: string;
  max_participants: number;
  current_participants: number;
  participants: Participant[];
}

interface Participant {
  id: string;
  name: string;
  email: string;
  role: string;
  student_id?: string;
  department?: string;
  year_level?: string;
  phone?: string;
  registration_date: string;
  attendance_status: string;
}

const Participants = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [events, setEvents] = useState<EventWithParticipants[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventWithParticipants | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load all approved events with their participants
  const loadEventsWithParticipants = async () => {
    setLoading(true);
    try {
      // Get events from event_requests table (these are the ones showing up in participant dashboard)
      const { data: eventRequestsData } = await supabase
        .from('event_requests')
        .select(`
          *,
          requester:requester_id (name)
        `)
        .eq('status', 'approved')
        .order('date', { ascending: true });

      console.log('Participants Page - Event requests loaded:', eventRequestsData?.length || 0);
      console.log('Event Request IDs:', eventRequestsData?.map(e => e.id));

      const eventsWithParticipantsData: EventWithParticipants[] = [];

      // Process events from event_requests table (approved events)
      for (const request of eventRequestsData || []) {
        console.log(`\nProcessing event: ${request.title} (ID: ${request.id})`);
        
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
          event_type: request.event_type || 'General',
          description: request.description || '',
          organizer_name: request.requester?.name || 'Unknown',
          participants
        });
      }

      console.log('Participants Page - Total events with participants:', eventsWithParticipantsData.length);
      eventsWithParticipantsData.forEach(event => {
        console.log(`${event.title}: ${event.participants.length} participants`);
      });

      setEvents(eventsWithParticipantsData);
    } catch (error) {
      console.error('Error loading events with participants:', error);
      toast({
        title: "Error",
        description: "Failed to load participants data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEventsWithParticipants();
  }, []);

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
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const filteredEvents = events.filter(
    event =>
      event.title.toLowerCase().includes(search.toLowerCase()) ||
      event.event_type.toLowerCase().includes(search.toLowerCase()) ||
      event.organizer_name.toLowerCase().includes(search.toLowerCase()) ||
      event.venue.toLowerCase().includes(search.toLowerCase()) ||
      event.participants.some(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase()) ||
        p.role.toLowerCase().includes(search.toLowerCase())
      )
  );

  return (
    <div className="flex h-screen w-screen bg-white overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 flex flex-col h-screen w-full p-0 m-0">
        <header className="bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">Participants</h1>
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                onClick={loadEventsWithParticipants}
                disabled={loading}
              >
                {loading ? "Loading..." : "Refresh"}
              </Button>
              <Button variant="gradient" className="bg-gradient-to-r from-blue-500 to-violet-500 text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5" /> Add Participant
              </Button>
            </div>
          </div>
        </header>
        
        <section className="flex-1 flex flex-col items-center justify-start bg-white p-4 overflow-auto">
          <div className="w-full max-w-7xl">
            <div className="flex items-center justify-between mb-4">
              <Input
                placeholder="Search events, participants, organizers..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-80"
              />
              <span className="text-gray-500 text-sm">{filteredEvents.length} event(s)</span>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading events...</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {filteredEvents.length === 0 && !loading ? (
                  <div className="text-center py-12 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No events found.</p>
                    <p className="text-xs mt-1">Events with participants will appear here.</p>
                  </div>
                ) : (
                  filteredEvents.map(event => (
                    <Card key={event.id} className="w-full">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-xl">{event.title}</CardTitle>
                            <CardDescription className="mt-2">
                              <div className="flex flex-wrap gap-4 text-sm">
                                <span className="flex items-center gap-1">🗓️ {formatDate(event.date)} at {event.time}</span>
                                <span className="flex items-center gap-1">🏢 {event.venue}</span>
                                <span className="flex items-center gap-1">👥 {event.current_participants}/{event.max_participants} participants</span>
                                <span className="flex items-center gap-1">🎯 {event.event_type}</span>
                                <span className="flex items-center gap-1">👨‍💼 Organized by {event.organizer_name}</span>
                              </div>
                            </CardDescription>
                          </div>
                          <Button 
                            onClick={() => {
                              setSelectedEvent(event);
                              setIsModalOpen(true);
                            }}
                            variant="outline"
                            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 border-0"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            🎉 View Participants
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Sweet Modal Popup for Participants */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden p-0">
          <div className="bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 p-1 rounded-lg">
            <div className="bg-white rounded-lg overflow-hidden">
              <DialogHeader className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        🎊 {selectedEvent?.title} - Participants
                      </DialogTitle>
                      <p className="text-lg text-gray-600 mt-1">
                        {selectedEvent?.participants.length || 0} people registered!
                      </p>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-6 overflow-y-auto max-h-[70vh]">
                {selectedEvent?.participants.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-8xl mb-6">😔</div>
                    <h3 className="text-2xl font-bold text-gray-700 mb-2">No participants yet!</h3>
                    <p className="text-gray-500 text-lg">Be the first one to join this event!</p>
                    <div className="mt-6">
                      <div className="inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full">
                        <span className="text-blue-600">🚀</span>
                        <span className="text-blue-700 font-medium">Registration is still open!</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-8">
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">
                        🌟 Meet our fantastic participants! 🌟
                      </h3>
                      <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          📅 {selectedEvent && formatDate(selectedEvent.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          🏢 {selectedEvent?.venue}
                        </span>
                        <span className="flex items-center gap-1">
                          🎯 {selectedEvent?.event_type}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {selectedEvent?.participants.map((participant, index) => (
                        <div key={participant.id} className="group">
                          <Card className="border-2 border-transparent group-hover:border-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-500 shadow-lg group-hover:shadow-2xl bg-white transition-all duration-300 transform group-hover:scale-105">
                            <CardContent className="p-6">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="relative">
                                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                        {participant.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                        <span className="text-xs">✅</span>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-lg text-gray-800">{participant.name}</h4>
                                      <Badge variant="outline" className="text-xs mt-1 border-2">
                                        {participant.role === 'admin' ? '👑 Admin' : 
                                         participant.role === 'organizer' ? '🎯 Organizer' : 
                                         participant.role === 'participant' ? '🙋‍♂️ Participant' : participant.role}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="text-3xl">
                                    {index % 5 === 0 ? '🌟' : 
                                     index % 5 === 1 ? '🎉' : 
                                     index % 5 === 2 ? '🚀' : 
                                     index % 5 === 3 ? '💫' : '⭐'}
                                  </div>
                                </div>
                                
                                <div className="space-y-3 text-sm">
                                  <div className="flex items-center gap-2 text-gray-700 bg-blue-50 p-2 rounded-lg">
                                    <span className="text-blue-500 text-lg">📧</span>
                                    <span className="font-medium">{participant.email}</span>
                                  </div>
                                  
                                  {participant.student_id && (
                                    <div className="flex items-center gap-2 text-gray-700 bg-green-50 p-2 rounded-lg">
                                      <span className="text-green-500 text-lg">🆔</span>
                                      <span>ID: <strong>{participant.student_id}</strong></span>
                                    </div>
                                  )}
                                  
                                  {participant.department && (
                                    <div className="flex items-center gap-2 text-gray-700 bg-purple-50 p-2 rounded-lg">
                                      <span className="text-purple-500 text-lg">🏫</span>
                                      <span><strong>{participant.department}</strong></span>
                                    </div>
                                  )}
                                  
                                  {participant.year_level && (
                                    <div className="flex items-center gap-2 text-gray-700 bg-orange-50 p-2 rounded-lg">
                                      <span className="text-orange-500 text-lg">📚</span>
                                      <span>Year <strong>{participant.year_level}</strong></span>
                                    </div>
                                  )}
                                  
                                  {participant.phone && (
                                    <div className="flex items-center gap-2 text-gray-700 bg-red-50 p-2 rounded-lg">
                                      <span className="text-red-500 text-lg">📱</span>
                                      <span><strong>{participant.phone}</strong></span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="border-t border-gray-200 pt-3">
                                  <div className="flex items-center justify-between">
                                    <Badge
                                      variant={
                                        participant.attendance_status === "attended" ? "default" :
                                        participant.attendance_status === "registered" ? "secondary" : "outline"
                                      }
                                      className="font-medium text-sm px-3 py-1"
                                    >
                                      {participant.attendance_status === "attended" ? "✅ Attended" :
                                       participant.attendance_status === "registered" ? "📝 Registered" : 
                                       participant.attendance_status}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded">
                                    <div className="flex items-center gap-1">
                                      <span>🕐</span>
                                      <span>Registered: {formatDateTime(participant.registration_date)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 text-center bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl">
                      <div className="text-4xl mb-2">🎊</div>
                      <p className="text-lg font-semibold text-gray-700">
                        Total Participants: <span className="text-blue-600">{selectedEvent?.participants.length}</span>
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Maximum Capacity: {selectedEvent?.max_participants} | 
                        Available Spots: {(selectedEvent?.max_participants || 0) - (selectedEvent?.participants.length || 0)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Participants;
