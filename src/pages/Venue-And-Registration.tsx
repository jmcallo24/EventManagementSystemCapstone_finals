import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2, Image as ImageIcon, MapPin, Building, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { 
  SharedVenue, 
  uploadVenueImage,
  createVenuesFromApprovedEvents,
  loadVenuesFromDatabase
} from "@/lib/venueService";

const VenueAndRegistration = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [venues, setVenues] = useState<SharedVenue[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", location: "", capacity: "", image: "", description: "", amenities: "" });
  const [showForm, setShowForm] = useState(false);
  const [editingVenue, setEditingVenue] = useState<SharedVenue | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // LOAD VENUES FROM VENUES DATABASE!
  const loadVenues = async () => {
    console.log('🔥 ADMIN: Loading venues from VENUES DATABASE...');
    
    try {
      // First try to load existing venues
      const existingVenues = await loadVenuesFromDatabase();
      
      if (existingVenues.length > 0) {
        console.log('✅ ADMIN: Found existing venues:', existingVenues.length);
        setVenues(existingVenues);
        return;
      }
      
      // If no venues, force create from approved events
      console.log('📝 ADMIN: No venues found, creating from approved events...');
      const createdVenues = await createVenuesFromApprovedEvents();
      
      if (createdVenues.length > 0) {
        console.log('✅ ADMIN: Created venues from events:', createdVenues.length);
        setVenues(createdVenues);
      } else {
        // Try loading again in case they were created
        const newVenues = await loadVenuesFromDatabase();
        if (newVenues.length > 0) {
          console.log('✅ ADMIN: Found venues after creation:', newVenues.length);
          setVenues(newVenues);
        } else {
          console.log('⚠️ ADMIN: Still no venues found after creation attempt');
          setVenues([]);
        }
      }
      
    } catch (error) {
      console.error('Error loading venues:', error);
      setVenues([]);
    }
  };

  useEffect(() => {
    loadVenues();
    
    // Auto-refresh every 3 seconds from DATABASE
    const interval = setInterval(loadVenues, 3000);
    
    return () => clearInterval(interval);
  }, []);

  // Handle image input
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imageUrl = await uploadVenueImage(file);
        if (imageUrl) {
          setForm(f => ({ ...f, image: imageUrl }));
          toast({
            title: "Image uploaded!",
            description: imageUrl.startsWith('data:') 
              ? "Image saved locally!" 
              : "Image uploaded to cloud storage!"
          });
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        toast({
          title: "Upload failed",
          description: "Failed to upload image. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  // ADD VENUE WITH PROPER SAVE!
  const handleAddVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.location || !form.capacity) return;
    
    try {
      // Save to database
      const { data, error } = await supabase
        .from('venues')
        .insert([{
          name: form.name,
          description: form.description || 'Event venue',
          capacity: form.capacity,
          location: form.location,
          venue_type: 'auditorium',
          facilities: form.amenities ? form.amenities.split(',').map(a => a.trim()).filter(a => a) : [],
          hourly_rate: 0,
          is_active: true,
          image_url: form.image || null
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Database save error:', error);
        throw error;
      }

      console.log('✅ VENUE SAVED TO DATABASE!');
      
      setForm({ name: "", location: "", capacity: "", image: "", description: "", amenities: "" });
      setShowForm(false);
      
      toast({
        title: "SUCCESS!",
        description: "Venue added! Organizer will see this automatically!"
      });
      
      // Reload venues from database
      await loadVenues();
    } catch (error) {
      console.error('Error adding venue:', error);
      toast({
        title: "Error",
        description: "Failed to add venue",
        variant: "destructive"
      });
    }
  };

  // SAME DATABASE DELETE AS ORGANIZER - NO SYNC BULLSHIT!
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this venue? This will remove it from the shared database and Organizer will no longer see it!')) {
      try {
        // Delete from database
        const { error } = await supabase
          .from('venues')
          .update({ is_active: false })
          .eq('id', id);

        if (error) {
          console.error('❌ Database delete error:', error);
          throw error;
        }

        console.log('✅ VENUE DELETED FROM DATABASE!');
        
        // Reload venues from database
        await loadVenues();
        
        toast({
          title: "SUCCESS!",
          description: "Venue deleted from shared database! Organizer will see this change automatically!"
        });
      } catch (error) {
        console.error('Error deleting venue:', error);
        toast({
          title: "Error",
          description: "Failed to delete venue",
          variant: "destructive"
        });
      }
    }
  };

  // Edit venue functionality
  const handleEdit = (venue: SharedVenue) => {
    setEditingVenue(venue);
    setForm({
      name: venue.name,
      location: venue.location,
      capacity: venue.capacity.toString(),
      image: venue.image_url || '',
      description: venue.description || '',
      amenities: venue.amenities?.join(', ') || ''
    });
    setShowForm(true);
  };

  // UPDATE VENUE IN DATABASE!
  const handleUpdateVenue = async () => {
    if (!editingVenue) return;
    
    const venueData = {
      name: form.name,
      description: form.description || 'Event venue',
      capacity: form.capacity,
      location: form.location,
      venue_type: 'auditorium',
      facilities: form.amenities ? form.amenities.split(',').map(a => a.trim()).filter(a => a) : [],
      hourly_rate: 0,
      is_active: true,
      image_url: form.image,
      updated_at: new Date().toISOString()
    };
    
    console.log('🔥 ADMIN: Updating venue in DATABASE:', venueData);
    
    try {
      const { error } = await supabase
        .from('venues')
        .update(venueData)
        .eq('id', editingVenue.id);

      if (error) {
        console.error('❌ Database update error:', error);
        throw error;
      }

      console.log('✅ VENUE UPDATED IN DATABASE!');
      
      // Reload venues from database
      await loadVenues();
      
      setForm({ name: "", location: "", capacity: "", image: "", description: "", amenities: "" });
      setShowForm(false);
      setEditingVenue(null);
      
      toast({
        title: "SUCCESS!",
        description: "Venue updated in DATABASE! Organizer will see changes immediately!"
      });
    } catch (error) {
      console.error('Error updating venue:', error);
      toast({
        title: "Error",
        description: "Failed to update venue in database",
        variant: "destructive"
      });
    }
  };

  const filtered = venues.filter(
    v =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen w-screen bg-white overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 flex flex-col h-screen w-full p-0 m-0">
        <header className="bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">🏢 Venue Registration - SAME DATABASE AS ORGANIZER!</h1>
            <p className="text-blue-100 text-sm">Direct database sync with Organizer Dashboard</p>
          </div>
          <Button
            variant="gradient"
            className="bg-gradient-to-r from-blue-500 to-violet-500 text-white flex items-center gap-2"
            onClick={() => navigate("/event-request")}
          >
            Event Request
          </Button>
        </header>
        <section className="flex-1 flex flex-col items-center justify-start bg-white p-4 overflow-auto">
          <div className="w-full max-w-5xl">
            <div className="flex items-center justify-between mb-4">
              <Input
                placeholder="Search by venue or location..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-80"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    console.log('🔧 ADMIN: Refreshing venues from database...');
                    await loadVenues();
                    toast({ 
                      title: "Venues Refreshed!", 
                      description: `Loaded venues from database!` 
                    });
                  }}
                >
                  🔧 Refresh
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    console.log('🔥 ADMIN: Force reloading from database...');
                    await loadVenues();
                    toast({ 
                      title: "Force Reload Complete!", 
                      description: `Found ${venues.length} venues! All data synced with Organizer!` 
                    });
                  }}
                >
                  🔄 Force Sync
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      console.log('🔥 ADMIN MANUAL: Creating venues from approved events...');
                      
                      // Get approved events first
                      const { data: approvedEvents } = await supabase
                        .from('event_requests')
                        .select('*')
                        .eq('status', 'approved');
                      
                      console.log('Found approved events:', approvedEvents);
                      
                      if (approvedEvents && approvedEvents.length > 0) {
                        // Create venues manually
                        const venuePromises = approvedEvents.map(async (event) => {
                          if (event.venue) {
                            try {
                              const venueData = {
                                name: event.venue,
                                description: `Venue for "${event.title}" event`,
                                capacity: (event.expected_participants || 50).toString(),
                                location: event.venue,
                                venue_type: 'auditorium',
                                facilities: ['Audio System', 'Seating', 'Lighting'],
                                hourly_rate: 0,
                                is_active: true,
                                image_url: null
                              };

                              const { data, error } = await supabase
                                .from('venues')
                                .upsert([venueData], { onConflict: 'name' })
                                .select()
                                .single();

                              if (!error && data) {
                                console.log('✅ Created/Updated venue:', data.name);
                                return data;
                              }
                            } catch (insertError) {
                              console.log('⚠️ Error with venue:', event.venue, insertError);
                            }
                          }
                          return null;
                        });

                        await Promise.all(venuePromises);
                        
                        // Reload venues
                        await loadVenues();
                        
                        toast({
                          title: "Venues Created!",
                          description: "Venues have been created from your approved events",
                        });
                      } else {
                        toast({
                          title: "No Approved Events",
                          description: "No approved events found to create venues from",
                          variant: "destructive"
                        });
                      }
                    } catch (error) {
                      console.error('Error creating venues:', error);
                      toast({
                        title: "Creation Failed",
                        description: "Failed to create venues",
                        variant: "destructive"
                      });
                    }
                  }}
                  variant="outline"
                  className="ml-2"
                >
                  Create from Events
                </Button>
                <Button
                  variant="gradient"
                  className="flex items-center gap-2"
                  onClick={() => setShowForm(true)}
                >
                  <Plus className="w-5 h-5" /> Add Venue
                </Button>
              </div>
            </div>
            
            {/* Add Venue Modal */}
            {showForm && (
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
                  <button
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
                    onClick={() => setShowForm(false)}
                  >
                    ×
                  </button>
                  <h2 className="text-xl font-bold mb-4">{editingVenue ? 'Edit Venue' : 'Add Venue'}</h2>
                  <form onSubmit={editingVenue ? (e) => { e.preventDefault(); handleUpdateVenue(); } : handleAddVenue} className="space-y-3">
                    <div>
                      <Label htmlFor="venue-name">Venue Name</Label>
                      <Input
                        id="venue-name"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="venue-location">Location</Label>
                      <Input
                        id="venue-location"
                        value={form.location}
                        onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="venue-capacity">Capacity</Label>
                      <Input
                        id="venue-capacity"
                        type="number"
                        value={form.capacity}
                        onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="venue-description">Description</Label>
                      <Input
                        id="venue-description"
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Describe the venue..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="venue-amenities">Amenities (comma-separated)</Label>
                      <Input
                        id="venue-amenities"
                        value={form.amenities}
                        onChange={e => setForm(f => ({ ...f, amenities: e.target.value }))}
                        placeholder="e.g., Audio System, Air Conditioning, WiFi"
                      />
                    </div>
                    <div>
                      <Label htmlFor="venue-image">Image</Label>
                      <Input
                        id="venue-image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                      {form.image && (
                        <img src={form.image} alt="Venue" className="mt-2 h-24 rounded object-cover" />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" variant="gradient" className="flex-1">
                        {editingVenue ? 'Update Venue' : 'Add Venue'}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          setShowForm(false);
                          setEditingVenue(null);
                          setForm({ name: "", location: "", capacity: "", image: "", description: "", amenities: "" });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            
            {/* Venue Table */}
            <div className="overflow-x-auto rounded-lg shadow border bg-white mt-2">
              {/* Debug info */}
              <div className="p-2 bg-blue-50 text-xs text-blue-700 border-b">
                <strong>Real-time Sync:</strong> {venues.length} venues loaded | Shared with Organizer Dashboard | Last update: {new Date().toLocaleTimeString()}
              </div>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-500 to-violet-500 text-white">
                    <th className="px-4 py-2 text-left">Image</th>
                    <th className="px-4 py-2 text-left">Venue Name</th>
                    <th className="px-4 py-2 text-left">Location</th>
                    <th className="px-4 py-2 text-left">Capacity</th>
                    <th className="px-4 py-2 text-left">Events</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-gray-400">
                        No venues found. Add your first venue to get started.
                      </td>
                    </tr>
                  )}
                  {filtered.map(venue => (
                    <tr key={venue.id} className="border-b last:border-b-0 hover:bg-gray-50">
                      <td className="px-4 py-2">
                        {venue.image_url ? (
                          <img src={venue.image_url} alt={venue.name} className="h-12 w-20 object-cover rounded" />
                        ) : (
                          <div className="flex items-center justify-center h-12 w-20 bg-gray-100 rounded">
                            <ImageIcon className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 font-semibold">{venue.name}</td>
                      <td className="px-4 py-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        {venue.location}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-green-500" />
                          {venue.capacity}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <Building className="w-4 h-4 text-purple-500" />
                          {venue.events_count || 0}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            venue.status === "Available"
                              ? "px-2 py-1 rounded bg-green-100 text-green-700 text-xs"
                              : venue.status === "Booked"
                              ? "px-2 py-1 rounded bg-red-100 text-red-700 text-xs"
                              : "px-2 py-1 rounded bg-yellow-100 text-yellow-700 text-xs"
                          }
                        >
                          {venue.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleEdit(venue)}
                          aria-label="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          aria-label="Delete"
                          onClick={() => handleDelete(venue.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default VenueAndRegistration;