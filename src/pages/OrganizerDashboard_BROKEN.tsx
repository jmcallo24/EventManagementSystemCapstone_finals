import { useState, useEffect } from "react";import { useState, useEffect } from "react";import { useState, useEffect } from "react";

import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";import { useNavigate } from "react-router-dom";import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Input } from "@/components/ui/input";import { Button } from "@/components/ui/button";import { Button } from "@/components/ui/button";

import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";import { Badge } from "@/components/ui/badge";import { Badge } from "@/components/ui/badge";

import { 

  Calendar, import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

  Users, 

  Clock, import { Input } from "@/components/ui/input";import { Input } from "@/components/ui/input";

  CheckCircle, 

  Plus, import { Label } from "@/components/ui/label";import { Label } from "@/components/ui/label";

  TrendingUp, 

  AlertCircle,import { Textarea } from "@/components/ui/textarea";import { Textarea } from "@/components/ui/textarea";

  CalendarDays,

  MapPin,import { import { 

  Building,

  FileText,  Calendar,   Calendar, 

  Award,

  Star,  Users,   Users, 

  Heart,

  Share2,  Clock,   Clock, 

  Download,

  LogOut,  CheckCircle,   CheckCircle, 

  User,

  Settings,  Plus,   Plus, 

  Filter,

  Search,  TrendingUp,   TrendingUp, 

  Send,

  Camera,  AlertCircle,  AlertCircle,

  Bell,

  Edit2,  CalendarDays,  CalendarDays,

  Trash2

} from "lucide-react";  MapPin,  MapPin,

import logo from "@/assets/image.png";

import { supabase } from "@/lib/supabaseClient";  Building,  Building,

import { useToast } from "@/hooks/use-toast";

import {   FileText,  FileText,

  SharedVenue, 

  loadSharedVenues,   Award,  Award,

  saveSharedVenues, 

  upsertSharedVenue,   Star,  Star,

  deleteSharedVenue, 

  uploadVenueImage,  Heart,  Heart,

  forceSyncAllVenues 

} from "@/lib/venueService";  Share2,  Share2,



const OrganizerDashboard = () => {  Download,  Download,

  const navigate = useNavigate();

  const { toast } = useToast();  LogOut,  LogOut,

  const [user, setUser] = useState<any>(null);

  const [activeTab, setActiveTab] = useState("venues");  User,  User,

  

  // Venue management state  Settings,  Settings,

  const [venues, setVenues] = useState<SharedVenue[]>([]);

  const [selectedVenue, setSelectedVenue] = useState<SharedVenue | null>(null);  Filter,  Filter,

  const [showVenueModal, setShowVenueModal] = useState(false);

  const [venueFormData, setVenueFormData] = useState({  Search,  Search,

    name: '',

    capacity: '',  Send,  Send,

    location: '',

    description: '',  Camera,  Camera,

    amenities: ''

  });  Bell,  Bell



  // Load venues using FORCE SYNC (same as admin)  Edit2,} from "lucide-react";

  const loadVenues = async () => {

    try {  Trash2import logo from "@/assets/image.png";

      console.log('🔥 ORGANIZER: Starting venue load with FORCE SYNC...');

      } from "lucide-react";import { supabase } from "@/lib/supabaseClient";

      // FORCE SYNC ALL VENUES FROM ALL SOURCES

      const syncedVenues = await forceSyncAllVenues();import logo from "@/assets/image.png";import { useToast } from "@/hooks/use-toast";

      console.log('🔥 ORGANIZER: Force sync completed, venues:', syncedVenues);

      setVenues(syncedVenues);import { supabase } from "@/lib/supabaseClient";import { 

      

    } catch (error) {import { useToast } from "@/hooks/use-toast";  SharedVenue, 

      console.error('🔥 ORGANIZER: Error loading venues:', error);

      // Fallback to existing shared venuesimport {   loadSharedVenues, 

      const fallbackVenues = loadSharedVenues();

      setVenues(fallbackVenues);  SharedVenue,   saveSharedVenues, 

    }

  };  loadSharedVenues,   upsertSharedVenue, 



  // Venue management functions  saveSharedVenues,   deleteSharedVenue, 

  const handleVenueEdit = (venue: SharedVenue) => {

    setSelectedVenue(venue);  upsertSharedVenue,   uploadVenueImage,

    setVenueFormData({

      name: venue.name,  deleteSharedVenue,   forceSyncAllVenues 

      capacity: venue.capacity.toString(),

      location: venue.location,  uploadVenueImage,} from "@/lib/venueService";

      description: venue.description || '',

      amenities: venue.amenities?.join(', ') || ''  forceSyncAllVenues 

    });

    setShowVenueModal(true);} from "@/lib/venueService";// Helper function to format dates

  };

const formatDate = (dateString: string) => {

  const handleVenueDelete = async (venueId: string) => {

    if (confirm('Are you sure you want to delete this venue? This will remove it from both Organizer and Admin dashboards.')) {// Helper function to format dates  try {

      try {

        const updatedVenues = deleteSharedVenue(venueId);const formatDate = (dateString: string) => {    return new Date(dateString).toLocaleDateString('en-US', {

        setVenues(updatedVenues);

        toast({  try {      year: 'numeric',

          title: "Success",

          description: "Venue deleted from shared database! Admin will see this change automatically!",    return new Date(dateString).toLocaleDateString('en-US', {      month: 'short',

        });

      } catch (error) {      year: 'numeric',      day: 'numeric'

        console.error('Error deleting venue:', error);

        toast({      month: 'short',    });

          title: "Error", 

          description: "Failed to delete venue",      day: 'numeric'  } catch {

          variant: "destructive"

        });    });    return dateString;

      }

    }  } catch {  }

  };

    return dateString;};

  const handleVenueImageUpload = async (file: File) => {

    try {  }

      toast({

        title: "Uploading...",};interface Event {

        description: "Please wait while we save your image.",

      });  id: string;



      const imageUrl = await uploadVenueImage(file);interface Event {  title: string;

      

      if (imageUrl && selectedVenue) {  id: string;  date: string;

        const updatedVenue = { ...selectedVenue, image_url: imageUrl };

        const updatedVenues = venues.map(v => v.id === selectedVenue.id ? updatedVenue : v);  title: string;  time: string;

        

        // Update using shared service  date: string;  venue: string;

        upsertSharedVenue(updatedVenue);

        setVenues(updatedVenues);  time: string;  organizer_name: string;

        setSelectedVenue(updatedVenue);

          venue: string;  current_participants: number;

        toast({

          title: "Success!",  organizer_name: string;  max_participants: number;

          description: imageUrl.startsWith('data:') 

            ? "Image saved locally! Will sync when cloud storage is configured."   current_participants: number;  status: "pending" | "approved" | "rejected" | "completed";

            : "Image uploaded to cloud storage permanently!",

        });  max_participants: number;  event_type: string;

      } else {

        toast({  status: "pending" | "approved" | "rejected" | "completed";  description: string;

          title: "Upload Failed",

          description: "Failed to upload image. Please try again.",  event_type: string;  isRegistered: boolean;

          variant: "destructive"

        });  description: string;  isFavorite: boolean;

      }

        isRegistered: boolean;  isMyEvent: boolean; // NEW - indicates if this is user's approved request

    } catch (error) {

      console.error('Error uploading image:', error);  isFavorite: boolean;}

      toast({

        title: "Upload Failed",  isMyEvent: boolean;

        description: "Failed to upload image. Please try again.",

        variant: "destructive"}interface Notification {

      });

    }  id: string;

  };

interface Notification {  title: string;

  const handleVenueSave = async () => {

    try {  id: string;  message: string;

      if (selectedVenue) {

        const updatedVenue: SharedVenue = {  title: string;  created_at: string;

          ...selectedVenue,

          name: venueFormData.name,  message: string;  type: "event_approved" | "event_rejected" | "event_reminder" | "registration_confirmed" | "announcement";

          capacity: parseInt(venueFormData.capacity) || 50,

          location: venueFormData.location,  created_at: string;  is_read: boolean;

          description: venueFormData.description,

          amenities: venueFormData.amenities.split(',').map(a => a.trim()).filter(a => a),  type: "event_approved" | "event_rejected" | "event_reminder" | "registration_confirmed" | "announcement";  related_event_id?: string;

          updated_at: new Date().toISOString(),

          last_modified_by: user?.name || user?.id  is_read: boolean;}

        };

          related_event_id?: string;

        // Update using shared service

        const updatedVenues = upsertSharedVenue(updatedVenue);}interface Report {

        setVenues(updatedVenues);

        setShowVenueModal(false);  id: string;

        setSelectedVenue(null);

        const OrganizerDashboard = () => {  title: string;

        toast({

          title: "Success!",  const navigate = useNavigate();  description: string;

          description: "Venue updated! Changes will appear in Admin dashboard automatically!",

        });  const { toast } = useToast();  report_type: "rejection_complaint" | "technical_issue" | "general_inquiry" | "event_feedback";

      }

    } catch (error) {  const [user, setUser] = useState<any>(null);  status: "open" | "in_progress" | "resolved" | "closed";

      console.error('Error saving venue:', error);

      toast({  const [activeTab, setActiveTab] = useState("calendar");  admin_response?: string;

        title: "Error",

        description: "Failed to save venue changes",  const [searchTerm, setSearchTerm] = useState("");  created_at: string;

        variant: "destructive"

      });  const [filterType, setFilterType] = useState("all");  related_event_id?: string;

    }

  };  const [loading, setLoading] = useState(false);  event_title?: string;



  useEffect(() => {  }

    const userData = localStorage.getItem("user");

    if (userData) {  // Event details modal

      const parsedUser = JSON.parse(userData);

      setUser(parsedUser);  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);interface ReportMessage {

      

      // Check if user is organizer  const [showEventDetails, setShowEventDetails] = useState(false);  id: string;

      if (parsedUser.role !== "organizer") {

        if (parsedUser.role === "participant") {    message: string;

          navigate("/participant-dashboard");

        } else {  // Real data from Supabase  sender_id: string;

          navigate("/dashboard");

        }  const [events, setEvents] = useState<Event[]>([]);  sender_name: string;

      }

    } else {  const [notifications, setNotifications] = useState<Notification[]>([]);  sender_role: string;

      navigate("/login");

    }    created_at: string;

  }, [navigate]);

  // Venue management state}

  // Load data when user is set

  useEffect(() => {  const [venues, setVenues] = useState<SharedVenue[]>([]);

    if (user?.id) {

      loadVenues();  const [selectedVenue, setSelectedVenue] = useState<SharedVenue | null>(null);interface EventRequest {

      console.log('🔥 ORGANIZER: Using SAME database as Admin - no sync needed!');

    }  const [showVenueModal, setShowVenueModal] = useState(false);  id: string;

  }, [user]);

  const [venueImageFile, setVenueImageFile] = useState<File | null>(null);  title: string;

  // Auto-refresh venues every 3 seconds to stay in sync with admin

  useEffect(() => {  const [venueFormData, setVenueFormData] = useState({  description: string;

    if (user?.id && activeTab === 'venues') {

      const interval = setInterval(async () => {    name: '',  date: string;

        const syncedVenues = await forceSyncAllVenues();

        setVenues(syncedVenues);    capacity: '',  time: string;

        console.log('🔥 ORGANIZER: Auto-refreshed venues from shared storage');

      }, 3000);    location: '',  venue: string;

      

      return () => clearInterval(interval);    description: '',  event_type: string;

    }

  }, [user?.id, activeTab]);    amenities: ''  expected_participants: number;



  const handleLogout = () => {  });  requirements?: string;

    localStorage.removeItem("user");

    navigate("/login");  budget_estimate?: number;

  };

  // Load venues using FORCE SYNC (same as admin)  request_reason: string;

  if (!user) {

    return <div>Loading...</div>;  const loadVenues = async () => {  status: "pending" | "approved" | "rejected" | "under_review";

  }

    try {  admin_comments?: string;

  return (

    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">      console.log('🔥 ORGANIZER: Starting venue load with FORCE SYNC...');  created_at: string;

      {/* Header */}

      <header className="bg-white/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">      }

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex items-center justify-between h-16">      // FORCE SYNC ALL VENUES FROM ALL SOURCES

            <div className="flex items-center space-x-4">

              <img src={logo} alt="Logo" className="w-8 h-8" />      const syncedVenues = await forceSyncAllVenues();const OrganizerDashboard = () => {

              <div>

                <h1 className="text-xl font-bold gradient-primary bg-clip-text text-transparent">      console.log('🔥 ORGANIZER: Force sync completed, venues:', syncedVenues);  const navigate = useNavigate();

                  Organizer Dashboard

                </h1>      setVenues(syncedVenues);  const { toast } = useToast();

                <p className="text-sm text-muted-foreground">School Event Management</p>

              </div>        const [user, setUser] = useState<any>(null);

            </div>

                } catch (error) {  const [activeTab, setActiveTab] = useState("calendar");

            <div className="flex items-center space-x-4">

              <Button variant="ghost" size="sm" className="relative">      console.error('🔥 ORGANIZER: Error loading venues:', error);  const [searchTerm, setSearchTerm] = useState("");

                <Bell className="w-4 h-4" />

              </Button>      // Fallback to existing shared venues  const [filterType, setFilterType] = useState("all");

              <div className="flex items-center space-x-2">

                <User className="w-4 h-4" />      const fallbackVenues = loadSharedVenues();  const [loading, setLoading] = useState(false);

                <span className="text-sm font-medium">{user.name}</span>

                <Badge variant="secondary">Organizer</Badge>      setVenues(fallbackVenues);  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

              </div>

              <Button variant="ghost" size="sm" onClick={handleLogout}>    }  const [reportMessages, setReportMessages] = useState<ReportMessage[]>([]);

                <LogOut className="w-4 h-4" />

              </Button>  };  const [newMessage, setNewMessage] = useState("");

            </div>

          </div>  const [newReportTitle, setNewReportTitle] = useState("");

        </div>

      </header>  // Venue management functions  const [newReportDescription, setNewReportDescription] = useState("");



      {/* Main Content */}  const handleVenueEdit = (venue: SharedVenue) => {  const [newReportType, setNewReportType] = useState<"rejection_complaint" | "technical_issue" | "general_inquiry" | "event_feedback">("rejection_complaint");

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">    setSelectedVenue(venue);  const [showNewReportForm, setShowNewReportForm] = useState(false);

          <TabsList className="grid w-full grid-cols-4 bg-white/50 backdrop-blur-sm">

            <TabsTrigger value="calendar" className="flex items-center space-x-2">    setVenueFormData({  

              <Calendar className="w-4 h-4" />

              <span>Calendar of Activities</span>      name: venue.name,  // Event details modal

            </TabsTrigger>

            <TabsTrigger value="venues" className="flex items-center space-x-2">      capacity: venue.capacity.toString(),  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

              <Building className="w-4 h-4" />

              <span>Venue Registration</span>      location: venue.location,  const [showEventDetails, setShowEventDetails] = useState(false);

            </TabsTrigger>

            <TabsTrigger value="multimedia" className="flex items-center space-x-2">      description: venue.description || '',  

              <Camera className="w-4 h-4" />

              <span>Multimedia</span>      amenities: venue.amenities?.join(', ') || ''  // Event Request states

            </TabsTrigger>

            <TabsTrigger value="program" className="flex items-center space-x-2">    });  const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);

              <Settings className="w-4 h-4" />

              <span>Program Flow</span>    setShowVenueModal(true);  const [showNewRequestForm, setShowNewRequestForm] = useState(false);

            </TabsTrigger>

          </TabsList>  };  const [newEventRequest, setNewEventRequest] = useState({



          {/* Calendar of Activities Tab */}    title: "",

          <TabsContent value="calendar" className="space-y-6">

            <Card className="card-elevated">  const handleVenueDelete = async (venueId: string) => {    description: "",

              <CardContent className="p-12 text-center">

                <CalendarDays className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />    if (confirm('Are you sure you want to delete this venue? This will remove it from both Organizer and Admin dashboards.')) {    date: "",

                <h3 className="text-lg font-semibold mb-2">Calendar Tab</h3>

                <p className="text-muted-foreground">Calendar functionality will be implemented here.</p>      try {    time: "",

              </CardContent>

            </Card>        const updatedVenues = deleteSharedVenue(venueId);    venue: "",

          </TabsContent>

        setVenues(updatedVenues);    event_type: "Academic",

          {/* Venue Management Tab */}

          <TabsContent value="venues" className="space-y-6">        toast({    custom_event_type: "", // NEW: For custom event type when "Others" is selected

            <Card className="card-elevated">

              <CardHeader>          title: "Success",    expected_participants: 50,

                <CardTitle className="flex items-center gap-2">

                  <Building className="w-6 h-6" />          description: "Venue deleted from shared database! Admin will see this change automatically!",    requirements: "",

                  Venue Management

                </CardTitle>        });    budget_estimate: 0,

                <CardDescription>Manage venues for your events. Changes sync automatically with admin dashboard.</CardDescription>

              </CardHeader>      } catch (error) {    request_reason: ""

              <CardContent className="space-y-6">

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">        console.error('Error deleting venue:', error);  });

                  <p className="text-blue-800 font-medium">🔄 Real-time Sync Active</p>

                  <p className="text-blue-700 text-sm">        toast({

                    {venues.length} venues loaded from shared database. Changes automatically sync with Admin dashboard every 3 seconds.

                  </p>          title: "Error",   // Real data from Supabase

                </div>

                          description: "Failed to delete venue",  const [events, setEvents] = useState<Event[]>([]);

                {venues.length === 0 ? (

                  <div className="text-center py-12">          variant: "destructive"  const [notifications, setNotifications] = useState<Notification[]>([]);

                    <Building className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />

                    <h3 className="text-lg font-semibold mb-2">No venues found</h3>        });  const [reports, setReports] = useState<Report[]>([]);

                    <p className="text-muted-foreground">Venues will appear here when you create approved events or when Admin adds venues.</p>

                  </div>      }  

                ) : (

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">    }  // Venue management state

                    {venues.map((venue) => (

                      <Card key={venue.id} className="overflow-hidden">  };  const [venues, setVenues] = useState<SharedVenue[]>([]);

                        <div className="aspect-video bg-gray-100 relative">

                          {venue.image_url ? (  const [selectedVenue, setSelectedVenue] = useState<SharedVenue | null>(null);

                            <img 

                              src={venue.image_url}   const handleVenueImageUpload = async (file: File) => {  const [showVenueModal, setShowVenueModal] = useState(false);

                              alt={venue.name}

                              className="w-full h-full object-cover"    try {  const [venueImageFile, setVenueImageFile] = useState<File | null>(null);

                            />

                          ) : (      toast({  const [venueFormData, setVenueFormData] = useState({

                            <div className="w-full h-full flex items-center justify-center">

                              <Building className="w-12 h-12 text-gray-400" />        title: "Uploading...",    name: '',

                            </div>

                          )}        description: "Please wait while we save your image.",    capacity: '',

                          <div className="absolute top-2 right-2">

                            <Badge className={venue.is_available ? "bg-green-500" : "bg-red-500"}>      });    location: '',

                              {venue.status}

                            </Badge>    description: '',

                          </div>

                          {venue.created_by && (      const imageUrl = await uploadVenueImage(file);    amenities: ''

                            <div className="absolute top-2 left-2">

                              <Badge variant="outline" className="bg-white/80">        });

                                {venue.created_by === 'admin' ? '👤 Admin' : '🏢 System'}

                              </Badge>      if (imageUrl && selectedVenue) {

                            </div>

                          )}        const updatedVenue = { ...selectedVenue, image_url: imageUrl };  // Load data from Supabase

                        </div>

                        <CardContent className="p-4">        const updatedVenues = venues.map(v => v.id === selectedVenue.id ? updatedVenue : v);  const loadEvents = async () => {

                          <h3 className="font-semibold text-lg mb-2">{venue.name}</h3>

                          <div className="space-y-2 text-sm text-muted-foreground">            try {

                            <div className="flex items-center gap-2">

                              <MapPin className="w-4 h-4" />        // Update using shared service      setLoading(true);

                              <span>{venue.location}</span>

                            </div>        upsertSharedVenue(updatedVenue);      

                            <div className="flex items-center gap-2">

                              <Users className="w-4 h-4" />        setVenues(updatedVenues);      // Get ALL approved events (from organizers AND from approved participant requests)

                              <span>Capacity: {venue.capacity}</span>

                            </div>        setSelectedVenue(updatedVenue);      const [{ data: organizerEvents }, { data: approvedRequests }] = await Promise.all([

                            <div className="flex items-center gap-2">

                              <Calendar className="w-4 h-4" />                // Original organizer events

                              <span>Events: {venue.events_count || 0}</span>

                            </div>        toast({        supabase

                          </div>

                          {venue.description && (          title: "Success!",          .from('events')

                            <p className="text-sm text-muted-foreground mt-2">{venue.description}</p>

                          )}          description: imageUrl.startsWith('data:')           .select(`

                          {venue.amenities && venue.amenities.length > 0 && (

                            <div className="mt-3">            ? "Image saved locally! Will sync when cloud storage is configured."             *,

                              <p className="text-xs font-medium mb-1">Amenities:</p>

                              <div className="flex flex-wrap gap-1">            : "Image uploaded to cloud storage permanently!",            organizer:organizer_id (name)

                                {venue.amenities.slice(0, 3).map((amenity, index) => (

                                  <Badge key={index} variant="outline" className="text-xs">        });          `)

                                    {amenity}

                                  </Badge>      } else {          .eq('status', 'approved')

                                ))}

                                {venue.amenities.length > 3 && (        toast({          .order('date', { ascending: true }),

                                  <Badge variant="outline" className="text-xs">

                                    +{venue.amenities.length - 3} more          title: "Upload Failed",        

                                  </Badge>

                                )}          description: "Failed to upload image. Please try again.",        // Approved participant requests that became events  

                              </div>

                            </div>          variant: "destructive"        supabase

                          )}

                          <div className="flex justify-between mt-4">        });          .from('event_requests')

                            <Button 

                              variant="outline"       }          .select(`

                              size="sm"

                              onClick={() => handleVenueEdit(venue)}                  *,

                            >

                              <Edit2 className="w-4 h-4 mr-1" />    } catch (error) {            requester:requester_id (name)

                              Edit

                            </Button>      console.error('Error uploading image:', error);          `)

                            <Button 

                              variant="outline"       toast({          .eq('status', 'approved')

                              size="sm"

                              onClick={() => handleVenueDelete(venue.id)}        title: "Upload Failed",          .order('date', { ascending: true })

                              className="text-red-600 hover:text-red-700"

                            >        description: "Failed to upload image. Please try again.",      ]);

                              <Trash2 className="w-4 h-4 mr-1" />

                              Delete        variant: "destructive"

                            </Button>

                          </div>      });      if (!user?.id) {

                        </CardContent>

                      </Card>    }        setEvents([]);

                    ))}

                  </div>  };        return;

                )}

              </CardContent>      }

            </Card>

          </TabsContent>  const handleVenueSave = async () => {



          {/* Multimedia Tab */}    try {      // Get user's registrations and favorites

          <TabsContent value="multimedia" className="space-y-6">

            <Card className="card-elevated">      if (selectedVenue) {      let registrations = [];

              <CardHeader>

                <CardTitle>Multimedia Management</CardTitle>        const updatedVenue: SharedVenue = {      let favorites = [];

                <CardDescription>Upload and manage event multimedia content</CardDescription>

              </CardHeader>          ...selectedVenue,      

              <CardContent>

                <p className="text-muted-foreground">Multimedia functionality will be implemented here.</p>          name: venueFormData.name,      try {

              </CardContent>

            </Card>          capacity: parseInt(venueFormData.capacity) || 50,        const { data: regData } = await supabase

          </TabsContent>

          location: venueFormData.location,          .from('event_registrations')

          {/* Program Flow Tab */}

          <TabsContent value="program" className="space-y-6">          description: venueFormData.description,          .select('event_id')

            <Card className="card-elevated">

              <CardHeader>          amenities: venueFormData.amenities.split(',').map(a => a.trim()).filter(a => a),          .eq('participant_id', user.id);

                <CardTitle>Program Flow Management</CardTitle>

                <CardDescription>Create and manage event program flows</CardDescription>          updated_at: new Date().toISOString(),        registrations = regData || [];

              </CardHeader>

              <CardContent>          last_modified_by: user?.name || user?.id      } catch (error) {

                <p className="text-muted-foreground">Program flow functionality will be implemented here.</p>

              </CardContent>        };        console.log('Event registrations table not found, creating empty array...');

            </Card>

          </TabsContent>                registrations = [];

        </Tabs>

      </main>        // Update using shared service      }

      

      {/* Venue Edit Modal */}        const updatedVenues = upsertSharedVenue(updatedVenue);      

      {showVenueModal && selectedVenue && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">        setVenues(updatedVenues);      try {

          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">

            <div className="p-6">        setShowVenueModal(false);        const { data: favData } = await supabase

              <div className="flex items-center justify-between mb-6">

                <h2 className="text-2xl font-bold flex items-center gap-2">        setSelectedVenue(null);          .from('event_favorites')

                  <Building className="w-6 h-6" />

                  Edit Venue: {selectedVenue.name}                  .select('event_id')

                </h2>

                <Button        toast({          .eq('user_id', user.id);

                  variant="ghost"

                  onClick={() => setShowVenueModal(false)}          title: "Success!",        favorites = favData || [];

                  className="text-gray-500 hover:text-gray-700"

                >          description: "Venue updated! Changes will appear in Admin dashboard automatically!",      } catch (error) {

                  ×

                </Button>        });        console.log('Event favorites table not found, creating empty array...');

              </div>

                    }        favorites = [];

              <div className="space-y-6">

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">    } catch (error) {      }

                  <p className="text-yellow-800 font-medium">⚡ Instant Sync</p>

                  <p className="text-yellow-700 text-sm">Changes will immediately appear in the Admin dashboard!</p>      console.error('Error saving venue:', error);

                </div>

      toast({      const registrationIds = registrations?.map(r => r.event_id) || [];

                {selectedVenue.event_details && (

                  <div className="bg-blue-50 p-4 rounded-lg">        title: "Error",      const favoriteIds = favorites?.map(f => f.event_id) || [];

                    <h4 className="font-medium text-blue-800 mb-2">Associated Event</h4>

                    <p className="text-sm text-blue-700">Event: {selectedVenue.event_details.event_name}</p>        description: "Failed to save venue changes",

                    <p className="text-sm text-blue-700">Date: {selectedVenue.event_details.event_date}</p>

                    <p className="text-sm text-blue-700">Expected Participants: {selectedVenue.event_details.participants_count}</p>        variant: "destructive"      // Format organizer events

                  </div>

                )}      });      const formattedOrganizerEvents: Event[] = (organizerEvents || []).map(event => ({



                <div className="space-y-3">    }        id: event.id,

                  <Label htmlFor="venue-name">Venue Name</Label>

                  <Input  };        title: event.title,

                    id="venue-name"

                    value={venueFormData.name}        date: event.date,

                    onChange={(e) => setVenueFormData({...venueFormData, name: e.target.value})}

                    placeholder="Enter venue name"  useEffect(() => {        time: event.time,

                  />

                </div>    const userData = localStorage.getItem("user");        venue: event.venue,



                <div className="space-y-3">    if (userData) {        organizer_name: event.organizer?.name || 'Unknown',

                  <Label htmlFor="venue-image">Upload Image</Label>

                  <Input      const parsedUser = JSON.parse(userData);        current_participants: event.current_participants || 0,

                    id="venue-image"

                    type="file"      setUser(parsedUser);        max_participants: event.max_participants || 100,

                    accept="image/*"

                    onChange={(e) => {              status: event.status,

                      const file = e.target.files?.[0];

                      if (file) {      // Check if user is organizer        event_type: event.event_type,

                        handleVenueImageUpload(file);

                      }      if (parsedUser.role !== "organizer") {        description: event.description || '',

                    }}

                  />        if (parsedUser.role === "participant") {        isRegistered: registrationIds.includes(event.id),

                  {selectedVenue.image_url && (

                    <img src={selectedVenue.image_url} alt="Venue" className="mt-2 h-32 rounded object-cover" />          navigate("/participant-dashboard");        isFavorite: favoriteIds.includes(event.id),

                  )}

                </div>        } else {        isMyEvent: false // These are organizer events



                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">          navigate("/dashboard");      }));

                  <div className="space-y-3">

                    <Label htmlFor="venue-capacity">Capacity</Label>        }

                    <Input

                      id="venue-capacity"      }      // Format approved participant request events

                      type="number"

                      value={venueFormData.capacity}    } else {      const formattedRequestEvents: Event[] = (approvedRequests || []).map(request => ({

                      onChange={(e) => setVenueFormData({...venueFormData, capacity: e.target.value})}

                      placeholder="Enter capacity"      navigate("/login");        id: request.id, // Using request ID as event ID

                    />

                  </div>    }        title: request.title,

                  

                  <div className="space-y-3">  }, [navigate]);        date: request.date,

                    <Label htmlFor="venue-location">Location</Label>

                    <Input        time: request.time,

                      id="venue-location"

                      value={venueFormData.location}  // Load data when user is set        venue: request.venue,

                      onChange={(e) => setVenueFormData({...venueFormData, location: e.target.value})}

                      placeholder="Enter venue location"  useEffect(() => {        organizer_name: request.requester?.name || 'Unknown',

                    />

                  </div>    if (user?.id) {        current_participants: 0, // Start with 0 for new events

                </div>

      loadVenues(); // Use the proper loadVenues function        max_participants: request.expected_participants || 50,

                <div className="space-y-3">

                  <Label htmlFor="venue-description">Description</Label>      console.log('🔥 ORGANIZER: Using SAME database as Admin - no sync needed!');        status: 'approved',

                  <Textarea

                    id="venue-description"    }        event_type: request.event_type,

                    value={venueFormData.description}

                    onChange={(e) => setVenueFormData({...venueFormData, description: e.target.value})}  }, [user]);        description: request.description || '',

                    placeholder="Describe the venue..."

                    rows={3}        isRegistered: request.requester_id === user.id, // Auto-registered if they created it

                  />

                </div>  // Auto-refresh venues every 3 seconds to stay in sync with admin        isFavorite: favoriteIds.includes(request.id),



                <div className="space-y-3">  useEffect(() => {        isMyEvent: request.requester_id === user.id // This is their approved event

                  <Label htmlFor="venue-amenities">Amenities (comma-separated)</Label>

                  <Input    if (user?.id && activeTab === 'venues') {      }));

                    id="venue-amenities"

                    value={venueFormData.amenities}      const interval = setInterval(async () => {

                    onChange={(e) => setVenueFormData({...venueFormData, amenities: e.target.value})}

                    placeholder="e.g., Audio System, Air Conditioning, WiFi, Parking"        const syncedVenues = await forceSyncAllVenues();      // Combine both types

                  />

                </div>        setVenues(syncedVenues);      const allEvents = [...formattedOrganizerEvents, ...formattedRequestEvents];



                <div className="flex gap-3 pt-4">        console.log('🔥 ORGANIZER: Auto-refreshed venues from shared storage');      

                  <Button onClick={handleVenueSave} className="flex-1">

                    Save Changes      }, 3000);      // NOW UPDATE PARTICIPANT COUNTS FOR ALL EVENTS

                  </Button>

                  <Button             const eventsWithCounts = await Promise.all(

                    variant="outline" 

                    onClick={() => setShowVenueModal(false)}      return () => clearInterval(interval);        allEvents.map(async (event) => {

                    className="flex-1"

                  >    }          try {

                    Cancel

                  </Button>  }, [user?.id, activeTab]);            const { count, error } = await supabase

                </div>

              </div>              .from('event_registrations')

            </div>

          </div>  const handleLogout = () => {              .select('*', { count: 'exact', head: true })

        </div>

      )}    localStorage.removeItem("user");              .eq('event_id', event.id);

    </div>

  );    navigate("/login");            

};

  };            return {

export default OrganizerDashboard;
              ...event,

  const getStatusColor = (status: string) => {              current_participants: count || 0

    switch (status) {            };

      case "approved":          } catch (error) {

        return "bg-green-100 text-green-800";            console.log(`Failed to get count for event ${event.title}:`, error);

      case "pending":            return {

        return "bg-yellow-100 text-yellow-800";              ...event,

      case "rejected":              current_participants: 0

        return "bg-red-100 text-red-800";            };

      case "completed":          }

        return "bg-blue-100 text-blue-800";        })

      case "open":      );

        return "bg-red-100 text-red-800";      

      case "in_progress":      console.log('Organizer Dashboard - Events with updated participant counts:');

        return "bg-yellow-100 text-yellow-800";      eventsWithCounts.forEach(event => {

      case "resolved":        console.log(`${event.title}: ${event.current_participants}/${event.max_participants}`);

        return "bg-green-100 text-green-800";      });

      case "closed":      

        return "bg-gray-100 text-gray-800";      setEvents(eventsWithCounts);

      default:      

        return "bg-gray-100 text-gray-800";    } catch (error) {

    }      console.error('Error loading events:', error);

  };      toast({

        title: "Error",

  if (!user) {        description: "Failed to load events",

    return <div>Loading...</div>;        variant: "destructive"

  }      });

      setEvents([]);

  return (    } finally {

    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">      setLoading(false);

      {/* Header */}    }

      <header className="bg-white/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">  };

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex items-center justify-between h-16">  const loadNotifications = async () => {

            <div className="flex items-center space-x-4">    if (!user?.id) return;

              <img src={logo} alt="Logo" className="w-8 h-8" />    

              <div>    try {

                <h1 className="text-xl font-bold gradient-primary bg-clip-text text-transparent">      const { data, error } = await supabase

                  Organizer Dashboard        .from('notifications')

                </h1>        .select('*')

                <p className="text-sm text-muted-foreground">School Event Management</p>        .eq('user_id', user.id)

              </div>        .order('created_at', { ascending: false });

            </div>

                  if (error) {

            <div className="flex items-center space-x-4">        console.error('Error loading notifications:', error);

              <Button variant="ghost" size="sm" className="relative">        return;

                <Bell className="w-4 h-4" />      }

              </Button>      

              <div className="flex items-center space-x-2">      console.log('Loaded notifications:', data);

                <User className="w-4 h-4" />      setNotifications(data || []);

                <span className="text-sm font-medium">{user.name}</span>    } catch (error) {

                <Badge variant="secondary">Organizer</Badge>      console.error('Error loading notifications:', error);

              </div>    }

              <Button variant="ghost" size="sm" onClick={handleLogout}>  };

                <LogOut className="w-4 h-4" />

              </Button>  const loadReports = async () => {

            </div>    if (!user?.id) return;

          </div>    

        </div>    try {

      </header>      console.log('Loading reports for user:', user.id);

      

      {/* Main Content */}      // Simple query first - just get reports for this user

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">      const { data, error } = await supabase

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">        .from('reports')

          <TabsList className="grid w-full grid-cols-4 bg-white/50 backdrop-blur-sm">        .select('*')

            <TabsTrigger value="calendar" className="flex items-center space-x-2">        .eq('reporter_id', user.id)

              <Calendar className="w-4 h-4" />        .order('created_at', { ascending: false });

              <span>Calendar of Activities</span>

            </TabsTrigger>      if (error) {

            <TabsTrigger value="venues" className="flex items-center space-x-2">        console.error('Reports query error:', error);

              <Building className="w-4 h-4" />        if (error.message.includes('relation "reports" does not exist')) {

              <span>Venue Registration</span>          toast({

            </TabsTrigger>            title: "Database Setup Required",

            <TabsTrigger value="multimedia" className="flex items-center space-x-2">            description: "Reports table not found. Please run the database setup script first.",

              <Camera className="w-4 h-4" />            variant: "destructive"

              <span>Multimedia</span>          });

            </TabsTrigger>          setReports([]);

            <TabsTrigger value="program" className="flex items-center space-x-2">          return;

              <Settings className="w-4 h-4" />        }

              <span>Program Flow</span>        throw error;

            </TabsTrigger>      }

          </TabsList>      

      console.log('Raw reports data:', data);

          {/* Calendar of Activities Tab */}      

          <TabsContent value="calendar" className="space-y-6">      // Format reports with event titles (simple fallback)

            <Card className="card-elevated">      const formattedReports: Report[] = (data || []).map(report => ({

              <CardContent className="p-12 text-center">        ...report,

                <CalendarDays className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />        event_title: report.related_event_id ? 'Related Event' : 'General Report'

                <h3 className="text-lg font-semibold mb-2">Calendar Tab</h3>      }));

                <p className="text-muted-foreground">Calendar functionality will be implemented here.</p>      

              </CardContent>      console.log('Formatted reports:', formattedReports);

            </Card>      setReports(formattedReports);

          </TabsContent>    } catch (error) {

      console.error('Error loading reports:', error);

          {/* Venue Management Tab */}      toast({

          <TabsContent value="venues" className="space-y-6">        title: "Error",

            <Card className="card-elevated">        description: "Failed to load reports. Please check database setup.",

              <CardHeader>        variant: "destructive"

                <CardTitle className="flex items-center gap-2">      });

                  <Building className="w-6 h-6" />      setReports([]);

                  Venue Management    }

                </CardTitle>  };

                <CardDescription>Manage venues for your events. Changes sync automatically with admin dashboard.</CardDescription>

              </CardHeader>  const loadReportMessages = async (reportId: string) => {

              <CardContent className="space-y-6">    try {

                {venues.length === 0 ? (      console.log('Loading messages for report:', reportId);

                  <div className="text-center py-12">      

                    <Building className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />      // Simple query first

                    <h3 className="text-lg font-semibold mb-2">No venues found</h3>      const { data, error } = await supabase

                    <p className="text-muted-foreground">Venues will appear here when you create approved events.</p>        .from('report_messages')

                  </div>        .select('*')

                ) : (        .eq('report_id', reportId)

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">        .order('created_at', { ascending: true });

                    {venues.map((venue) => (

                      <Card key={venue.id} className="overflow-hidden">      if (error) {

                        <div className="aspect-video bg-gray-100 relative">        console.error('Error loading messages:', error);

                          {venue.image_url ? (        return;

                            <img       }

                              src={venue.image_url}       

                              alt={venue.name}      console.log('Raw messages data:', data);

                              className="w-full h-full object-cover"      

                            />      // Try to get sender names

                          ) : (      let formattedMessages: ReportMessage[] = [];

                            <div className="w-full h-full flex items-center justify-center">      

                              <Building className="w-12 h-12 text-gray-400" />      if (data && data.length > 0) {

                            </div>        try {

                          )}          const senderIds = [...new Set(data.map(m => m.sender_id))];

                          <div className="absolute top-2 right-2">          const { data: users } = await supabase

                            <Badge className={venue.is_available ? "bg-green-500" : "bg-red-500"}>            .from('users')

                              {venue.status}            .select('id, name, role')

                            </Badge>            .in('id', senderIds);

                          </div>          

                        </div>          const userMap = new Map();

                        <CardContent className="p-4">          users?.forEach(user => userMap.set(user.id, { name: user.name, role: user.role }));

                          <h3 className="font-semibold text-lg mb-2">{venue.name}</h3>          

                          <div className="space-y-2 text-sm text-muted-foreground">          formattedMessages = data.map(msg => {

                            <div className="flex items-center gap-2">            const userInfo = userMap.get(msg.sender_id) || { name: 'Unknown', role: 'user' };

                              <MapPin className="w-4 h-4" />            return {

                              <span>{venue.location}</span>              id: msg.id,

                            </div>              message: msg.message,

                            <div className="flex items-center gap-2">              sender_id: msg.sender_id,

                              <Users className="w-4 h-4" />              sender_name: userInfo.name,

                              <span>Capacity: {venue.capacity}</span>              sender_role: userInfo.role,

                            </div>              created_at: msg.created_at

                            <div className="flex items-center gap-2">            };

                              <Calendar className="w-4 h-4" />          });

                              <span>Events: {venue.events_count || 0}</span>        } catch (userError) {

                            </div>          console.log('Could not load sender names, using fallback');

                          </div>          formattedMessages = data.map(msg => ({

                          {venue.description && (            id: msg.id,

                            <p className="text-sm text-muted-foreground mt-2">{venue.description}</p>            message: msg.message,

                          )}            sender_id: msg.sender_id,

                          {venue.amenities && venue.amenities.length > 0 && (            sender_name: msg.sender_id === user?.id ? 'You' : 'Admin',

                            <div className="mt-3">            sender_role: msg.sender_id === user?.id ? 'participant' : 'admin',

                              <p className="text-xs font-medium mb-1">Amenities:</p>            created_at: msg.created_at

                              <div className="flex flex-wrap gap-1">          }));

                                {venue.amenities.slice(0, 3).map((amenity, index) => (        }

                                  <Badge key={index} variant="outline" className="text-xs">      }

                                    {amenity}      

                                  </Badge>      console.log('Formatted messages:', formattedMessages);

                                ))}      setReportMessages(formattedMessages);

                                {venue.amenities.length > 3 && (    } catch (error) {

                                  <Badge variant="outline" className="text-xs">      console.error('Error loading report messages:', error);

                                    +{venue.amenities.length - 3} more    }

                                  </Badge>  };

                                )}

                              </div>  const loadEventRequests = async () => {

                            </div>    if (!user?.id) return;

                          )}    

                          <div className="flex justify-between mt-4">    try {

                            <Button       console.log('Loading event requests for user:', user.id);

                              variant="outline"       

                              size="sm"      const { data, error } = await supabase

                              onClick={() => handleVenueEdit(venue)}        .from('event_requests')

                            >        .select('*')

                              <Edit2 className="w-4 h-4 mr-1" />        .eq('requester_id', user.id)

                              Edit        .order('created_at', { ascending: false });

                            </Button>

                            <Button       if (error) {

                              variant="outline"         console.error('Supabase error:', error);

                              size="sm"        throw error;

                              onClick={() => handleVenueDelete(venue.id)}      }

                              className="text-red-600 hover:text-red-700"      

                            >      console.log('Event requests loaded:', data);

                              <Trash2 className="w-4 h-4 mr-1" />      setEventRequests(data || []);

                              Delete    } catch (error) {

                            </Button>      console.error('Error loading event requests:', error);

                          </div>      toast({

                        </CardContent>        title: "Info",

                      </Card>        description: "No event requests found or table not created yet.",

                    ))}      });

                  </div>      setEventRequests([]);

                )}    }

              </CardContent>  };

            </Card>

          </TabsContent>  // Load venues from shared service (same as admin)

  const loadVenues = async () => {

          {/* Multimedia Tab */}    try {

          <TabsContent value="multimedia" className="space-y-6">      console.log('🔥 ORGANIZER: Starting venue load with FORCE SYNC...');

            <Card className="card-elevated">      

              <CardHeader>      // FORCE SYNC ALL VENUES FROM ALL SOURCES

                <CardTitle>Multimedia Management</CardTitle>      const syncedVenues = await forceSyncAllVenues();

                <CardDescription>Upload and manage event multimedia content</CardDescription>      console.log('🔥 ORGANIZER: Force sync completed, venues:', syncedVenues);

              </CardHeader>      setVenues(syncedVenues);

              <CardContent>      

                <p className="text-muted-foreground">Multimedia functionality will be implemented here.</p>    } catch (error) {

              </CardContent>      console.error('🔥 ORGANIZER: Error loading venues:', error);

            </Card>      // Fallback to existing shared venues

          </TabsContent>      const fallbackVenues = loadSharedVenues();

      setVenues(fallbackVenues);

          {/* Program Flow Tab */}    }

          <TabsContent value="program" className="space-y-6">  };

            <Card className="card-elevated">

              <CardHeader>  // Venue management functions

                <CardTitle>Program Flow Management</CardTitle>          existingVenues.forEach(venue => {

                <CardDescription>Create and manage event program flows</CardDescription>            venueMap.set(venue.name, venue);

              </CardHeader>          });

              <CardContent>          

                <p className="text-muted-foreground">Program flow functionality will be implemented here.</p>          // Process events and create new venues

              </CardContent>          eventRequestsData.forEach(event => {

            </Card>            if (event.venue && !venueMap.has(event.venue)) {

          </TabsContent>              const newVenue: SharedVenue = {

        </Tabs>                id: `venue-${event.venue.toLowerCase().replace(/\s+/g, '-')}-${event.id}`,

      </main>                name: event.venue,

                      capacity: event.expected_participants || 50,

      {/* Venue Edit Modal */}                location: event.venue,

      {showVenueModal && selectedVenue && (                description: `Venue for "${event.title}" event`,

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">                image_url: null,

          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">                amenities: ['Audio System', 'Seating', 'Lighting'],

            <div className="p-6">                created_at: event.date,

              <div className="flex items-center justify-between mb-6">                updated_at: new Date().toISOString(),

                <h2 className="text-2xl font-bold flex items-center gap-2">                status: 'Available' as const,

                  <Building className="w-6 h-6" />                events_count: 1,

                  Edit Venue: {selectedVenue.name}                is_available: true,

                </h2>                event_details: {

                <Button                  event_name: event.title,

                  variant="ghost"                  event_date: event.date,

                  onClick={() => setShowVenueModal(false)}                  participants_count: event.expected_participants || 50

                  className="text-gray-500 hover:text-gray-700"                }

                >              };

                  ×              venueMap.set(event.venue, newVenue);

                </Button>            } else if (event.venue && venueMap.has(event.venue)) {

              </div>              // Update existing venue

                            const existing = venueMap.get(event.venue)!;

              <div className="space-y-6">              existing.events_count = (existing.events_count || 0) + 1;

                {selectedVenue.event_details && (              existing.capacity = Math.max(existing.capacity, event.expected_participants || 50);

                  <div className="bg-blue-50 p-4 rounded-lg">            }

                    <h4 className="font-medium text-blue-800 mb-2">Associated Event</h4>          });

                    <p className="text-sm text-blue-700">Event: {selectedVenue.event_details.event_name}</p>          

                    <p className="text-sm text-blue-700">Date: {formatDate(selectedVenue.event_details.event_date)}</p>          const mergedVenues = Array.from(venueMap.values());

                    <p className="text-sm text-blue-700">Expected Participants: {selectedVenue.event_details.participants_count}</p>          

                  </div>          // Save merged venues using same service as admin

                )}          saveSharedVenues(mergedVenues);

          console.log('🔥 ORGANIZER: Saved merged venues to SAME database as Admin:', mergedVenues);

                <div className="space-y-3">          

                  <Label htmlFor="venue-name">Venue Name</Label>          setVenues(mergedVenues);

                  <Input        } else {

                    id="venue-name"          console.log('� ORGANIZER: No approved events found, using existing venues only');

                    value={venueFormData.name}          setVenues(existingVenues);

                    onChange={(e) => setVenueFormData({...venueFormData, name: e.target.value})}        }

                    placeholder="Enter venue name"      } catch (dbError) {

                  />        console.log('� ORGANIZER: Database query failed, using existing venues only');

                </div>        setVenues(existingVenues);

      }

                <div className="space-y-3">      

                  <Label htmlFor="venue-image">Upload Image</Label>    } catch (error) {

                  <Input      console.error('🔥 ORGANIZER: Error loading venues:', error);

                    id="venue-image"      // Fallback to existing shared venues

                    type="file"      const fallbackVenues = loadSharedVenues();

                    accept="image/*"      setVenues(fallbackVenues);

                    onChange={(e) => {    }

                      const file = e.target.files?.[0];  };

                      if (file) {

                        handleVenueImageUpload(file);  // Venue management functions

                      }  const handleVenueEdit = (venue: SharedVenue) => {

                    }}    setSelectedVenue(venue);

                  />    setVenueFormData({

                  {selectedVenue.image_url && (      name: venue.name,

                    <img src={selectedVenue.image_url} alt="Venue" className="mt-2 h-32 rounded object-cover" />      capacity: venue.capacity.toString(),

                  )}      location: venue.location,

                </div>      description: venue.description || '',

      amenities: venue.amenities?.join(', ') || ''

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">    });

                  <div className="space-y-3">    setShowVenueModal(true);

                    <Label htmlFor="venue-capacity">Capacity</Label>  };

                    <Input

                      id="venue-capacity"  const handleVenueDelete = async (venueId: string) => {

                      type="number"    if (confirm('Are you sure you want to delete this venue? This will remove it from both Organizer and Admin dashboards.')) {

                      value={venueFormData.capacity}      try {

                      onChange={(e) => setVenueFormData({...venueFormData, capacity: e.target.value})}        const updatedVenues = deleteSharedVenue(venueId);

                      placeholder="Enter capacity"        setVenues(updatedVenues);

                    />        toast({

                  </div>          title: "Success",

                            description: "Venue deleted from SAME database as Admin!",

                  <div className="space-y-3">        });

                    <Label htmlFor="venue-location">Location</Label>      } catch (error) {

                    <Input        console.error('Error deleting venue:', error);

                      id="venue-location"        toast({

                      value={venueFormData.location}          title: "Error", 

                      onChange={(e) => setVenueFormData({...venueFormData, location: e.target.value})}          description: "Failed to delete venue",

                      placeholder="Enter venue location"          variant: "destructive"

                    />        });

                  </div>      }

                </div>    }

  };

                <div className="space-y-3">

                  <Label htmlFor="venue-description">Description</Label>  const handleVenueImageUpload = async (file: File) => {

                  <Textarea    try {

                    id="venue-description"      toast({

                    value={venueFormData.description}        title: "Uploading...",

                    onChange={(e) => setVenueFormData({...venueFormData, description: e.target.value})}        description: "Please wait while we save your image.",

                    placeholder="Describe the venue..."      });

                    rows={3}

                  />      const imageUrl = await uploadVenueImage(file);

                </div>      

      if (imageUrl && selectedVenue) {

                <div className="space-y-3">        const updatedVenue = { ...selectedVenue, image_url: imageUrl };

                  <Label htmlFor="venue-amenities">Amenities (comma-separated)</Label>        const updatedVenues = venues.map(v => v.id === selectedVenue.id ? updatedVenue : v);

                  <Input        

                    id="venue-amenities"        // Update using shared service

                    value={venueFormData.amenities}        upsertSharedVenue(updatedVenue);

                    onChange={(e) => setVenueFormData({...venueFormData, amenities: e.target.value})}        setVenues(updatedVenues);

                    placeholder="e.g., Audio System, Air Conditioning, WiFi, Parking"        setSelectedVenue(updatedVenue);

                  />        

                </div>        toast({

          title: "Success!",

                <div className="flex gap-3 pt-4">          description: imageUrl.startsWith('data:') 

                  <Button onClick={handleVenueSave} className="flex-1">            ? "Image saved locally! Will sync when cloud storage is configured." 

                    Save Changes            : "Image uploaded to cloud storage permanently!",

                  </Button>        });

                  <Button       } else {

                    variant="outline"         toast({

                    onClick={() => setShowVenueModal(false)}          title: "Upload Failed",

                    className="flex-1"          description: "Failed to upload image. Please try again.",

                  >          variant: "destructive"

                    Cancel        });

                  </Button>      }

                </div>      

              </div>    } catch (error) {

            </div>      console.error('Error uploading image:', error);

          </div>      toast({

        </div>        title: "Upload Failed",

      )}        description: "Failed to upload image. Please try again.",

    </div>        variant: "destructive"

  );      });

};    }

  };

export default OrganizerDashboard;
  const handleVenueSave = async () => {
    try {
      if (selectedVenue) {
        const updatedVenue: SharedVenue = {
          ...selectedVenue,
          name: venueFormData.name,
          capacity: parseInt(venueFormData.capacity) || 50,
          location: venueFormData.location,
          description: venueFormData.description,
          amenities: venueFormData.amenities.split(',').map(a => a.trim()).filter(a => a),
          updated_at: new Date().toISOString(),
          last_modified_by: user?.name || user?.id
        };
        
        // Update using shared service
        const updatedVenues = upsertSharedVenue(updatedVenue);
        setVenues(updatedVenues);
        setShowVenueModal(false);
        setSelectedVenue(null);
        
        toast({
          title: "Success!",
          description: "Venue updated! SAME database as Admin - no sync needed!",
        });
      }
    } catch (error) {
      console.error('Error saving venue:', error);
      toast({
        title: "Error",
        description: "Failed to save venue changes",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Check if user is organizer
      if (parsedUser.role !== "organizer") {
        if (parsedUser.role === "participant") {
          navigate("/participant-dashboard");
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
      loadNotifications();
      loadReports();
      loadEventRequests();
      loadVenues(); // Use the proper loadVenues function
      console.log('🔥 ORGANIZER: Using SAME database as Admin - no sync needed!');
    }
  }, [user]);

  // Auto-refresh venues every 2 seconds to stay in sync with admin
  useEffect(() => {
    if (user?.id && activeTab === 'venues') {
      const interval = setInterval(() => {
        const sharedVenues = loadSharedVenues();
        setVenues(sharedVenues);
        console.log('🔥 ORGANIZER: Auto-refreshed venues from shared storage');
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [user?.id, activeTab]);

  // Auto-refresh notifications when notifications tab is active
  useEffect(() => {
    if (activeTab === "notifications" && user?.id) {
      loadNotifications();
    }
  }, [activeTab, user?.id]);

  // Auto-refresh reports and messages when reports tab is active
  useEffect(() => {
    if (activeTab === "reports" && user?.id) {
      loadReports();
      // If a report is selected, also refresh its messages
      if (selectedReport) {
        loadReportMessages(selectedReport.id);
      }
    }
  }, [activeTab, user?.id]);

  // Auto-refresh messages every 5 seconds when a report is selected
  useEffect(() => {
    if (selectedReport && activeTab === "reports") {
      const interval = setInterval(() => {
        loadReportMessages(selectedReport.id);
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
  }, [selectedReport, activeTab]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleEventRegister = async (eventId: string) => {
    if (!user?.id) return;
    
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      if (event.isRegistered) {
        // Unregister
        const { error } = await supabase
          .from('event_registrations')
          .delete()
          .eq('event_id', eventId)
          .eq('participant_id', user.id);

        if (error) {
          console.error('Unregister error:', error);
          throw error;
        }

        // Update participant count
        await supabase
          .from('events')
          .update({ current_participants: Math.max(0, event.current_participants - 1) })
          .eq('id', eventId);

        toast({
          title: "Unregistered",
          description: `You have been unregistered from ${event.title}`,
        });
      } else {
        // Register
        if (event.current_participants >= event.max_participants) {
          toast({
            title: "Event Full",
            description: "This event has reached maximum capacity",
            variant: "destructive"
          });
          return;
        }

        const { error } = await supabase
          .from('event_registrations')
          .insert([{
            event_id: eventId,
            participant_id: user.id
          }]);

        if (error) {
          console.error('Register error:', error);
          throw error;
        }

        // Update participant count
        await supabase
          .from('events')
          .update({ current_participants: event.current_participants + 1 })
          .eq('id', eventId);

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

      // Reload events to get updated data
      await loadEvents();
      await loadNotifications();
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: "Failed to update registration. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleToggleFavorite = async (eventId: string) => {
    if (!user?.id) return;
    
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      if (event.isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('event_favorites')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id);

        if (error) {
          console.error('Remove favorite error:', error);
          // Handle specific error cases
          if (error.message.includes('relation "event_favorites" does not exist')) {
            toast({
              title: "Database Setup Required",
              description: "Please run the database setup script first.",
              variant: "destructive"
            });
            return;
          }
          throw error;
        }
        
        toast({
          title: "Removed from Favorites",
          description: `${event.title} has been removed from your favorites.`,
        });
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('event_favorites')
          .insert([{
            event_id: eventId,
            user_id: user.id
          }]);

        if (error) {
          console.error('Add favorite error:', error);
          // Handle specific error cases
          if (error.message.includes('relation "event_favorites" does not exist')) {
            toast({
              title: "Database Setup Required",
              description: "Please run the database setup script first.",
              variant: "destructive"
            });
            return;
          }
          // Handle duplicate entry (409 conflict)
          if (error.message.includes('duplicate key') || error.code === '23505') {
            toast({
              title: "Already in Favorites",
              description: `${event.title} is already in your favorites.`,
            });
            await loadEvents(); // Refresh to sync state
            return;
          }
          throw error;
        }
        
        toast({
          title: "Added to Favorites",
          description: `${event.title} has been added to your favorites.`,
        });
      }

      // Reload events to get updated data
      await loadEvents();
    } catch (error) {
      console.error('Favorite toggle error:', error);
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, is_read: true }
          : notification
      ));
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const handleCreateReport = async () => {
    if (!user?.id || !newReportTitle.trim() || !newReportDescription.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Creating report:', {
        reporter_id: user.id,
        title: newReportTitle,
        description: newReportDescription,
        report_type: newReportType
      });

      const { data, error } = await supabase
        .from('reports')
        .insert([{
          reporter_id: user.id,
          title: newReportTitle,
          description: newReportDescription,
          report_type: newReportType
        }])
        .select()
        .single();

      if (error) {
        console.error('Create report error:', error);
        if (error.message.includes('relation "reports" does not exist')) {
          toast({
            title: "Database Setup Required",
            description: "Reports table not found. Please run the database setup script first.",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }

      console.log('Report created successfully:', data);

      // Add initial message from user
      try {
        await supabase
          .from('report_messages')
          .insert([{
            report_id: data.id,
            sender_id: user.id,
            message: newReportDescription
          }]);
        console.log('Initial message added to report');
      } catch (msgError) {
        console.log('Could not add initial message (non-critical):', msgError);
      }

      toast({
        title: "Report Submitted",
        description: "Your report has been submitted successfully. An admin will respond soon.",
      });

      // Reset form
      setNewReportTitle("");
      setNewReportDescription("");
      setShowNewReportForm(false);
      
      // Reload reports to show the new one
      await loadReports();
    } catch (error) {
      console.error('Create report error:', error);
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSendMessage = async () => {
    if (!user?.id || !selectedReport || !newMessage.trim()) return;

    try {
      console.log('Sending message:', {
        report_id: selectedReport.id,
        sender_id: user.id,
        message: newMessage
      });

      await supabase
        .from('report_messages')
        .insert([{
          report_id: selectedReport.id,
          sender_id: user.id,
          message: newMessage
        }]);

      setNewMessage("");
      
      // Immediately reload messages to show the new message
      await loadReportMessages(selectedReport.id);
      
      toast({
        title: "Message Sent",
        description: "Your message has been sent to the admin.",
      });
    } catch (error) {
      console.error('Send message error:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSubmitEventRequest = async () => {
    if (!user?.id || !newEventRequest.title.trim() || !newEventRequest.description.trim() || 
        !newEventRequest.date || !newEventRequest.time || !newEventRequest.venue.trim() ||
        !newEventRequest.request_reason.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Check if custom event type is required but not provided
    if (newEventRequest.event_type === "Others" && !newEventRequest.custom_event_type.trim()) {
      toast({
        title: "Custom Event Type Required",
        description: "Please specify your custom event type when 'Others' is selected",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      console.log('Submitting event request for user:', user.id);
      console.log('Request data:', newEventRequest);

      // Use custom event type if "Others" is selected, otherwise use the standard type
      const finalEventType = newEventRequest.event_type === "Others" 
        ? newEventRequest.custom_event_type 
        : newEventRequest.event_type;

      const requestData = {
        requester_id: user.id,
        title: newEventRequest.title,
        description: newEventRequest.description,
        date: newEventRequest.date,
        time: newEventRequest.time,
        venue: newEventRequest.venue,
        event_type: finalEventType, // Use the final event type (either standard or custom)
        expected_participants: newEventRequest.expected_participants,
        requirements: newEventRequest.requirements || null,
        budget_estimate: newEventRequest.budget_estimate > 0 ? newEventRequest.budget_estimate : null,
        request_reason: newEventRequest.request_reason
      };

      console.log('Sending to Supabase:', requestData);

      const { data, error } = await supabase
        .from('event_requests')
        .insert([requestData])
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        
        // Check if table doesn't exist
        if (error.message.includes('relation "event_requests" does not exist')) {
          toast({
            title: "Database Error",
            description: "Event requests table not found. Please run the database setup first.",
            variant: "destructive"
          });
          return;
        }
        
        // Check if RLS policy issue
        if (error.message.includes('new row violates row-level security policy')) {
          toast({
            title: "Permission Error", 
            description: "Unable to create request. Please check your account permissions.",
            variant: "destructive"
          });
          return;
        }
        
        throw error;
      }

      console.log('Event request created:', data);

      // Create notification for user
      try {
        await supabase
          .from('notifications')
          .insert([{
            user_id: user.id,
            title: "Event Request Submitted",
            message: `Your ${finalEventType} event request "${newEventRequest.title}" has been submitted for admin review.`,
            type: "announcement"
          }]);
      } catch (notifError) {
        console.log('Notification error (non-critical):', notifError);
      }

      toast({
        title: "Request Submitted",
        description: `Your ${finalEventType} event request has been submitted successfully. You'll be notified when it's reviewed.`,
      });

      // Reset form
      setNewEventRequest({
        title: "",
        description: "",
        date: "",
        time: "",
        venue: "",
        event_type: "Academic",
        custom_event_type: "",
        expected_participants: 50,
        requirements: "",
        budget_estimate: 0,
        request_reason: ""
      });
      setShowNewRequestForm(false);
      
      // Reload data
      await loadEventRequests();
      await loadNotifications();
      
    } catch (error) {
      console.error('Submit event request error:', error);
      toast({
        title: "Error",
        description: "Failed to submit event request. Please try again or contact admin.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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
      case "open":
        return "bg-red-100 text-red-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
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

  // Get upcoming events
  const getUpcomingEvents = () => {
    const today = new Date().toISOString().split('T')[0];
    return events
      .filter(event => event.date >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
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

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          event.organizer_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === "all") return matchesSearch;
    if (filterType === "available") return matchesSearch && !event.isMyEvent; // Events by others
    if (filterType === "myevents") return matchesSearch && event.isMyEvent; // User's approved events
    if (filterType === "registered") return matchesSearch && event.isRegistered;
    if (filterType === "favorites") return matchesSearch && event.isFavorite;
    
    return matchesSearch && event.event_type.toLowerCase() === filterType.toLowerCase();
  });

  const unreadNotifications = notifications.filter(n => !n.is_read).length;

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <img src={logo} alt="Logo" className="w-8 h-8" />
              <div>
                <h1 className="text-xl font-bold gradient-primary bg-clip-text text-transparent">
                  Organizer Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">School Event Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-4 h-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </Button>
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">{user.name}</span>
                <Badge variant="secondary">Organizer</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/50 backdrop-blur-sm">
            <TabsTrigger value="calendar" className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Calendar of Activities</span>
            </TabsTrigger>
            <TabsTrigger value="venues" className="flex items-center space-x-2">
              <Building className="w-4 h-4" />
              <span>Venue Registration</span>
            </TabsTrigger>
            <TabsTrigger value="multimedia" className="flex items-center space-x-2">
              <Camera className="w-4 h-4" />
              <span>Multimedia</span>
            </TabsTrigger>
            <TabsTrigger value="program" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Program Flow</span>
            </TabsTrigger>
          </TabsList>

          {/* Calendar of Activities Tab */}
          <TabsContent value="calendar" className="space-y-6">
            {/* Search and Filter */}
            <Card className="card-elevated">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search events..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="px-3 py-2 border rounded-md"
                    >
                      <option value="all">All Events</option>
                      <option value="available">Available Events</option>
                      <option value="myevents">My Events</option>
                      <option value="registered">Registered Events</option>
                      <option value="favorites">Favorites</option>
                      <option value="academic">Academic</option>
                      <option value="sports">Sports</option>
                      <option value="cultural">Cultural</option>
                      <option value="social">Social</option>
                      <option value="workshop">Workshop</option>
                      <option value="conference">Conference</option>
                      <option value="competition">Competition</option>
                      <option value="seminar">Seminar</option>
                      <option value="training">Training</option>
                      <option value="others">Others</option>
                    </select>
                    <Button 
                      onClick={async () => {
                        try {
                          setLoading(true);
                          console.log('Organizer Dashboard - Refreshing participant counts...');
                          await loadEvents();
                          toast({
                            title: "Counts Updated",
                            description: "Participant counts have been refreshed",
                          });
                        } catch (error) {
                          toast({
                            title: "Update Failed",
                            description: "Failed to update participant counts",
                            variant: "destructive"
                          });
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      variant="outline"
                      size="sm"
                      className="ml-2"
                    >
                      {loading ? "Updating..." : "Refresh Counts"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="card-elevated">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Available Events</p>
                      <p className="text-3xl font-bold gradient-primary bg-clip-text text-transparent">
                        {events.filter(e => !e.isMyEvent).length}
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
                      <p className="text-sm font-medium text-muted-foreground">Favorites</p>
                      <p className="text-3xl font-bold text-red-500">
                        {events.filter(e => e.isFavorite).length}
                      </p>
                    </div>
                    <Heart className="w-8 h-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Events Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <Card key={event.id} className="card-elevated overflow-hidden">
                  <CardContent className="p-0">
                    {/* Event Header */}
                    <div className="relative p-6 pb-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(event.status)}>
                            {event.status}
                          </Badge>
                          {event.isMyEvent && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              My Event
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleFavorite(event.id)}
                          className="p-1"
                        >
                          <Heart className={`w-4 h-4 ${event.isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                        </Button>
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
                          <span>{event.organizer_name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{event.current_participants}/{event.max_participants} participants</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Event Actions */}
                    <div className="border-t p-4 bg-muted/20">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant={event.isRegistered ? "secondary" : "default"}
                          size="sm"
                          onClick={() => handleEventRegister(event.id)}
                          className="flex-1"
                          disabled={loading || event.status === "completed" || (event.current_participants >= event.max_participants && !event.isRegistered)}
                        >
                          {loading ? "Loading..." : (event.isRegistered ? "Registered" : "Register")}
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredEvents.length === 0 && (
              <Card className="card-elevated">
                <CardContent className="p-12 text-center">
                  <CalendarDays className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No events found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search or filter criteria
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Venue Management Tab */}
          <TabsContent value="venues" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-6 h-6" />
                  Venue Management
                </CardTitle>
                <CardDescription>Manage venues for your events. Changes sync automatically with admin dashboard.</CardDescription>
              </CardHeader>
              <CardContent>
                {venues.length === 0 ? (
                  <div className="text-center py-12">
                    <Building className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-2">No venues found</p>
                    <p className="text-sm text-muted-foreground">Venues will appear here when you have approved events</p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {venues.map((venue) => (
                      <Card key={venue.id} className="overflow-hidden hover:shadow-lg transition-all duration-300">
                        <div className="relative">
                          {venue.image_url ? (
                            <img 
                              src={venue.image_url} 
                              alt={venue.name}
                              className="w-full h-48 object-cover"
                            />
                          ) : (
                            <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                              <Building className="w-12 h-12 text-gray-400" />
                            </div>
                          )}
                          <div className="absolute top-3 right-3">
                            <Badge variant={venue.is_available ? "secondary" : "destructive"}>
                              {venue.status || (venue.is_available ? "Available" : "Unavailable")}
                            </Badge>
                          </div>
                        </div>
                        
                        <CardContent className="p-4 space-y-3">
                          <div>
                            <h3 className="font-semibold text-lg">{venue.name}</h3>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {venue.location}
                            </p>
                          </div>
                          
                          {venue.event_details && (
                            <div className="bg-blue-50 p-3 rounded-lg space-y-1">
                              <p className="text-sm font-medium text-blue-800">Event: {venue.event_details.event_name}</p>
                              <p className="text-xs text-gray-600">Date: {formatDate(venue.event_details.event_date)}</p>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4 text-blue-500" />
                              <span>Capacity: <strong>{venue.capacity}</strong></span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-green-500" />
                              <span><strong>{venue.events_count}</strong> events</span>
                            </div>
                          </div>
                          
                          {venue.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">{venue.description}</p>
                          )}
                          
                          {venue.amenities && venue.amenities.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {venue.amenities.slice(0, 3).map((amenity, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {amenity}
                                </Badge>
                              ))}
                              {venue.amenities.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{venue.amenities.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          <div className="flex gap-2 pt-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleVenueEdit(venue)}
                              className="flex-1"
                            >
                              <Camera className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleVenueDelete(venue.id)}
                              className="flex-1"
                            >
                              <AlertCircle className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Multimedia Tab */}
          <TabsContent value="multimedia" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Multimedia Management</CardTitle>
                <CardDescription>Upload and manage event multimedia content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Multimedia management features coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Program Flow Tab */}
          <TabsContent value="program" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Program Flow</CardTitle>
                <CardDescription>Design and manage event program flow</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Settings className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Program flow management features coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Event Details Modal */}
      {showEventDetails && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">{selectedEvent.title}</h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowEventDetails(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(selectedEvent.status)}>
                    {selectedEvent.status}
                  </Badge>
                  {selectedEvent.isMyEvent && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      My Event
                    </Badge>
                  )}
                  <Badge variant="outline">{selectedEvent.event_type}</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium">Date:</span>
                      <span>{formatDate(selectedEvent.date)}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium">Time:</span>
                      <span>{selectedEvent.time}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium">Venue:</span>
                      <span>{selectedEvent.venue}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <User className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium">Organizer:</span>
                      <span>{selectedEvent.organizer_name}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium">Participants:</span>
                      <span>{selectedEvent.current_participants}/{selectedEvent.max_participants}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Registration:</span>
                      {selectedEvent.isRegistered ? (
                        <Badge className="bg-green-100 text-green-800">Registered</Badge>
                      ) : (
                        <Badge variant="outline">Not Registered</Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Description:</h3>
                  <p className="text-muted-foreground bg-muted/50 p-4 rounded-lg">
                    {selectedEvent.description || 'No description available.'}
                  </p>
                </div>
                
                <div className="flex items-center space-x-4 pt-4 border-t">
                  {!selectedEvent.isMyEvent && (
                    <>
                      <Button
                        variant={selectedEvent.isRegistered ? "secondary" : "default"}
                        onClick={() => {
                          handleEventRegister(selectedEvent.id);
                          setShowEventDetails(false);
                        }}
                        disabled={loading || selectedEvent.current_participants >= selectedEvent.max_participants && !selectedEvent.isRegistered}
                      >
                        {selectedEvent.isRegistered ? "Unregister" : "Register"}
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => {
                          handleToggleFavorite(selectedEvent.id);
                          setShowEventDetails(false);
                        }}
                      >
                        <Heart className={`w-4 h-4 mr-2 ${selectedEvent.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                        {selectedEvent.isFavorite ? "Remove Favorite" : "Add to Favorites"}
                      </Button>
                    </>
                  )}
                  
                  {selectedEvent.isMyEvent && (
                    <div className="text-sm text-muted-foreground">
                      This is your event. You are automatically registered as the organizer.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Venue Edit Modal */}
      {showVenueModal && selectedVenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Building className="w-6 h-6" />
                  Edit Venue: {selectedVenue.name}
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowVenueModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-6">
                {/* Event Details Section */}
                {selectedVenue.event_details && (
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                    <Label className="text-lg font-semibold text-blue-800">Event Information</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Event Name:</span>
                        <p className="text-gray-800">{selectedVenue.event_details.event_name}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Event Date:</span>
                        <p className="text-gray-800">{formatDate(selectedVenue.event_details.event_date)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Participants:</span>
                        <p className="text-gray-800">{selectedVenue.event_details.participants_count} people</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Current Image */}
                <div className="space-y-3">
                  <Label className="text-lg font-semibold">Current Venue Image</Label>
                  <div className="relative">
                    {selectedVenue.image_url ? (
                      <img 
                        src={selectedVenue.image_url} 
                        alt={selectedVenue.name}
                        className="w-full h-64 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-64 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <Building className="w-16 h-16 mx-auto mb-2 text-gray-400" />
                          <p className="text-gray-500">No image uploaded</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Image Upload */}
                <div className="space-y-3">
                  <Label htmlFor="venue-image" className="text-lg font-semibold flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Upload New Image
                  </Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      id="venue-image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setVenueImageFile(file);
                          handleVenueImageUpload(file);
                        }
                      }}
                      className="hidden"
                    />
                    <label htmlFor="venue-image" className="cursor-pointer">
                      <Camera className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-gray-600 mb-2">Click to upload venue image</p>
                      <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB</p>
                    </label>
                  </div>
                </div>

                {/* Venue Details Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="venue-name">Venue Name</Label>
                    <Input
                      id="venue-name"
                      value={venueFormData.name}
                      onChange={(e) => setVenueFormData({...venueFormData, name: e.target.value})}
                      placeholder="Enter venue name"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="venue-capacity">Capacity</Label>
                    <Input
                      id="venue-capacity"
                      type="number"
                      value={venueFormData.capacity}
                      onChange={(e) => setVenueFormData({...venueFormData, capacity: e.target.value})}
                      placeholder="Enter maximum capacity"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="venue-location">Location</Label>
                  <Input
                    id="venue-location"
                    value={venueFormData.location}
                    onChange={(e) => setVenueFormData({...venueFormData, location: e.target.value})}
                    placeholder="Enter venue location"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="venue-description">Description</Label>
                  <Textarea
                    id="venue-description"
                    value={venueFormData.description}
                    onChange={(e) => setVenueFormData({...venueFormData, description: e.target.value})}
                    placeholder="Describe the venue..."
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="venue-amenities">Amenities (comma-separated)</Label>
                  <Input
                    id="venue-amenities"
                    value={venueFormData.amenities}
                    onChange={(e) => setVenueFormData({...venueFormData, amenities: e.target.value})}
                    placeholder="e.g., Audio System, Air Conditioning, WiFi, Parking"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={handleVenueSave}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                  >
                    <Building className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowVenueModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerDashboard;