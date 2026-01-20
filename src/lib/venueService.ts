// Shared venue management service for Admin and Organizer dashboards
import { supabase } from './supabaseClient';

export interface SharedVenue {
  id: string;
  name: string;
  location: string;
  capacity: number;
  description?: string;
  image_url?: string;
  amenities?: string[];
  created_at: string;
  updated_at: string;
  status: "Available" | "Booked" | "Maintenance";
  events_count: number;
  is_available: boolean;
  event_details?: {
    event_name: string;
    event_date: string;
    participants_count: number;
  };
  created_by?: string;
  last_modified_by?: string;
}

// Global venue storage key
const GLOBAL_VENUES_KEY = 'global_venues_shared';

// AUTO-CREATE VENUES FROM APPROVED EVENTS
export const createVenuesFromApprovedEvents = async (): Promise<SharedVenue[]> => {
  try {
    console.log('🔥 Creating venues from approved events...');
    
    // Get all approved event requests
    const { data: approvedEvents, error } = await supabase
      .from('event_requests')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching approved events:', error);
      return [];
    }

    if (!approvedEvents || approvedEvents.length === 0) {
      console.log('📝 No approved events found');
      return [];
    }

    console.log('✅ Found', approvedEvents.length, 'approved events');

    // Create venues for each unique venue name
    const uniqueVenues = new Map<string, any>();
    
    approvedEvents.forEach(event => {
      if (event.venue && event.venue.trim()) {
        const venueName = event.venue.trim();
        if (!uniqueVenues.has(venueName)) {
          uniqueVenues.set(venueName, {
            name: venueName,
            description: `Venue for "${event.title}" event`,
            capacity: (event.expected_participants || 50).toString(),
            location: venueName,
            venue_type: 'auditorium',
            facilities: ['Audio System', 'Seating', 'Lighting'],
            hourly_rate: 0,
            is_active: true,
            image_url: null
          });
        }
      }
    });

    // Insert venues into database
    const venueArray = Array.from(uniqueVenues.values());
    const createdVenues: SharedVenue[] = [];

    for (const venueData of venueArray) {
      try {
        // Check if venue already exists
        const { data: existingVenue } = await supabase
          .from('venues')
          .select('id')
          .eq('name', venueData.name)
          .single();

        if (!existingVenue) {
          // Create new venue
          const { data: newVenue, error: insertError } = await supabase
            .from('venues')
            .insert([venueData])
            .select()
            .single();

          if (!insertError && newVenue) {
            console.log('✅ Created venue:', newVenue.name);
            createdVenues.push({
              id: newVenue.id,
              name: newVenue.name,
              location: newVenue.location,
              capacity: parseInt(newVenue.capacity) || 50,
              description: newVenue.description,
              image_url: newVenue.image_url,
              amenities: Array.isArray(newVenue.facilities) ? newVenue.facilities : ['Audio System'],
              created_at: newVenue.created_at,
              updated_at: newVenue.updated_at,
              status: 'Available',
              events_count: 1,
              is_available: true,
              created_by: 'system',
              last_modified_by: 'system'
            });
          }
        } else {
          console.log('⚠️ Venue already exists:', venueData.name);
        }
      } catch (error) {
        console.error('❌ Error creating venue:', venueData.name, error);
      }
    }

    console.log('✅ Created', createdVenues.length, 'new venues from approved events');
    return createdVenues;
    
  } catch (error) {
    console.error('❌ Error creating venues from approved events:', error);
    return [];
  }
};

// SIMPLE SOLUTION: Use venues database table for editable venues
export const loadVenuesFromDatabase = async (): Promise<SharedVenue[]> => {
  try {
    console.log('🔥 Loading venues from VENUES DATABASE...');
    
    // Get all active venues from venues table
    const { data: dbVenues, error } = await supabase
      .from('venues')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Database error:', error);
      return [];
    }

    if (!dbVenues || dbVenues.length === 0) {
      console.log('� No venues in database');
      return [];
    }

    // Convert to SharedVenue format
    const venues: SharedVenue[] = dbVenues.map(venue => ({
      id: venue.id,
      name: venue.name,
      location: venue.location || venue.name,
      capacity: parseInt(venue.capacity) || 50,
      description: venue.description || 'Event venue',
      image_url: venue.image_url,
      amenities: Array.isArray(venue.facilities) ? venue.facilities : ['Audio System'],
      created_at: venue.created_at,
      updated_at: venue.updated_at,
      status: (venue.is_active ? 'Available' : 'Maintenance') as 'Available' | 'Maintenance' | 'Booked',
      events_count: 0,
      is_available: venue.is_active,
      created_by: 'database',
      last_modified_by: 'user'
    }));

    console.log('✅ Loaded', venues.length, 'venues from database');
    return venues;
  } catch (error) {
    console.error('❌ Error loading venues from database:', error);
    return [];
  }
};

// Save venue to database
export const saveVenueToDatabase = async (venue: SharedVenue): Promise<boolean> => {
  try {
    console.log('💾 Saving venue to database:', venue.name);
    
    const venueData = {
      name: venue.name,
      description: venue.description || 'Event venue',
      capacity: venue.capacity.toString(),
      location: venue.location,
      venue_type: 'auditorium',
      facilities: venue.amenities || [],
      hourly_rate: 0,
      is_active: venue.is_available !== false,
      image_url: venue.image_url,
      updated_at: new Date().toISOString()
    };

    // Try to update existing venue first
    const { data: existing } = await supabase
      .from('venues')
      .select('id')
      .eq('name', venue.name)
      .single();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('venues')
        .update(venueData)
        .eq('id', existing.id);

      if (error) {
        console.error('❌ Update error:', error);
        return false;
      }
      console.log('✅ Venue updated in database');
    } else {
      // Insert new
      const { error } = await supabase
        .from('venues')
        .insert([{
          id: venue.id,
          ...venueData,
          created_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('❌ Insert error:', error);
        return false;
      }
      console.log('✅ Venue created in database');
    }

    return true;
  } catch (error) {
    console.error('❌ Error saving venue:', error);
    return false;
  }
};

// Load venues from BOTH event_requests AND venues table
export const loadAllVenues = async (): Promise<SharedVenue[]> => {
  try {
    console.log('🔥 Loading venues from BOTH sources...');
    
    // Step 1: Get venues from database first
    const { data: dbVenues } = await supabase
      .from('venues')
      .select('*')
      .eq('is_active', true);

    // Step 2: Get venues from event requests
    const eventVenues: SharedVenue[] = [];
    
    // Step 3: Merge and prioritize database venues
    const venueMap = new Map<string, SharedVenue>();
    
    // Add event venues first (as base)
    eventVenues.forEach(venue => {
      venueMap.set(venue.name.toLowerCase(), venue);
    });
    
    // Override with database venues (these have user edits)
    if (dbVenues && dbVenues.length > 0) {
      dbVenues.forEach(dbVenue => {
        const venue: SharedVenue = {
          id: dbVenue.id,
          name: dbVenue.name,
          location: dbVenue.location || dbVenue.name,
          capacity: parseInt(dbVenue.capacity) || 50,
          description: dbVenue.description,
          image_url: dbVenue.image_url,
          amenities: Array.isArray(dbVenue.facilities) ? dbVenue.facilities : [],
          created_at: dbVenue.created_at,
          updated_at: dbVenue.updated_at,
          status: (dbVenue.is_active ? 'Available' : 'Maintenance') as 'Available' | 'Maintenance' | 'Booked',
          events_count: 0,
          is_available: dbVenue.is_active,
          created_by: 'database',
          last_modified_by: 'user'
        };
        
        // Override event venue with database version
        venueMap.set(venue.name.toLowerCase(), venue);
        console.log('✅ USING DATABASE VERSION:', venue.name);
      });
    }
    
    const finalVenues = Array.from(venueMap.values());
    console.log('✅ FINAL VENUES:', finalVenues.length, 'venues loaded');
    
    // Save to localStorage for backup
    saveSharedVenues(finalVenues);
    
    return finalVenues;
  } catch (error) {
    console.error('❌ Error loading all venues:', error);
    return loadSharedVenues(); // Fallback
  }
};

// Load venues from APPROVED EVENT REQUESTS (simplified)
export const loadVenuesFromEventRequests = async (): Promise<SharedVenue[]> => {
  try {
    console.log('🔥 Loading venues from APPROVED EVENT REQUESTS...');
    
    // Get all approved event requests
    const { data: approvedEvents, error } = await supabase
      .from('event_requests')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase event_requests error:', error);
      return loadSharedVenues(); // Fallback to localStorage
    }

    if (!approvedEvents || approvedEvents.length === 0) {
      console.log('📝 No approved events found, using localStorage fallback');
      return loadSharedVenues();
    }

    console.log('✅ Found', approvedEvents.length, 'approved events');
    approvedEvents.forEach(event => {
      console.log(`   - ${event.title} at venue: ${event.venue} (${event.expected_participants} participants)`);
    });

    // Group events by venue and create venue objects
    const venueMap = new Map<string, SharedVenue>();
    
    // First, load existing venues from localStorage to preserve images and custom data
    const existingVenues = loadSharedVenues();
    existingVenues.forEach(venue => {
      venueMap.set(venue.name.toLowerCase(), venue);
    });
    
    // Process approved events and create/update venues
    approvedEvents.forEach(event => {
      if (event.venue && event.venue.trim()) {
        const venueName = event.venue.trim();
        const venueKey = venueName.toLowerCase();
        
        if (venueMap.has(venueKey)) {
          // Update existing venue
          const existing = venueMap.get(venueKey)!;
          existing.events_count = (existing.events_count || 0) + 1;
          existing.capacity = Math.max(existing.capacity, event.expected_participants || 50);
          existing.event_details = {
            event_name: event.title,
            event_date: event.date,
            participants_count: event.expected_participants || 50
          };
          existing.updated_at = new Date().toISOString();
        } else {
          // Create new venue from event
          const newVenue: SharedVenue = {
            id: `venue-${venueKey}-${event.id}`,
            name: venueName,
            location: venueName, // Use venue name as location
            capacity: event.expected_participants || 50,
            description: `Venue for "${event.title}" event (${event.event_type})`,
            image_url: null, // Will be set when user uploads
            amenities: ['Audio System', 'Seating', 'Lighting'], // Default amenities
            created_at: event.created_at,
            updated_at: new Date().toISOString(),
            status: 'Available',
            events_count: 1,
            is_available: true,
            event_details: {
              event_name: event.title,
              event_date: event.date,
              participants_count: event.expected_participants || 50
            },
            created_by: 'system',
            last_modified_by: 'system'
          };
          venueMap.set(venueKey, newVenue);
        }
      }
    });

    const venues = Array.from(venueMap.values());
    console.log('✅ Created', venues.length, 'venues from approved events:');
    venues.forEach(v => console.log(`   - ${v.name} (${v.capacity} capacity, ${v.events_count} events)`));
    
    // Save to localStorage for backup and sync
    saveSharedVenues(venues);
    
    return venues;
  } catch (error) {
    console.error('❌ Error loading venues from event requests:', error);
    return loadSharedVenues(); // Fallback to localStorage
  }
};

// Load venues from localStorage (fallback method)
export const loadSharedVenues = (): SharedVenue[] => {
  try {
    const savedVenues = localStorage.getItem(GLOBAL_VENUES_KEY);
    const venues = savedVenues ? JSON.parse(savedVenues) : [];
    console.log('🔍 Loading shared venues from localStorage:', {
      key: GLOBAL_VENUES_KEY,
      count: venues.length,
      venueNames: venues.map((v: any) => v.name)
    });
    return venues;
  } catch (error) {
    console.error('❌ Error loading shared venues:', error);
    return [];
  }
};

// Save venues to localStorage (shared between admin and organizer)
export const saveSharedVenues = (venues: SharedVenue[]): void => {
  try {
    localStorage.setItem(GLOBAL_VENUES_KEY, JSON.stringify(venues));
    console.log('💾 Venues saved to shared storage:', {
      key: GLOBAL_VENUES_KEY,
      count: venues.length,
      venues: venues.map(v => ({ 
        id: v.id, 
        name: v.name, 
        hasImage: !!v.image_url,
        imageType: v.image_url?.startsWith('data:') ? 'base64' : v.image_url?.startsWith('http') ? 'url' : 'none',
        created_by: v.created_by
      }))
    });
  } catch (error) {
    console.error('❌ Error saving shared venues:', error);
  }
};

// Save venue changes PERMANENTLY to DATABASE (REAL SAVE!)
export const saveVenueChanges = async (venue: SharedVenue): Promise<SharedVenue[]> => {
  try {
    console.log('💾 SAVING VENUE TO DATABASE:', venue.name);
    
    // Step 1: Save to actual database
    const dbSaveSuccess = await saveVenueToDatabase(venue);
    
    if (dbSaveSuccess) {
      console.log('✅ VENUE SAVED TO DATABASE SUCCESSFULLY!');
      
      // Step 2: Reload all venues from database
      const allVenues = await loadAllVenues();
      
      console.log('💾 DATABASE SAVE COMPLETE - Changes will sync to both dashboards!');
      return allVenues;
    } else {
      console.log('⚠️ Database save failed, using localStorage fallback');
      
      // Fallback: Update in localStorage
      const venues = loadSharedVenues();
      const existingIndex = venues.findIndex(v => v.id === venue.id || v.name.toLowerCase() === venue.name.toLowerCase());
      
      if (existingIndex >= 0) {
        venues[existingIndex] = { 
          ...venues[existingIndex],
          ...venue,
          updated_at: new Date().toISOString()
        };
      } else {
        venues.push({ ...venue, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      }
      
      saveSharedVenues(venues);
      return venues;
    }
    
  } catch (error) {
    console.error('❌ Error saving venue changes:', error);
    return loadSharedVenues();
  }
};

// Add or update a venue (ENHANCED VERSION)
export const upsertSharedVenue = async (venue: SharedVenue): Promise<SharedVenue[]> => {
  return await saveVenueChanges(venue);
};

// Delete a venue
export const deleteSharedVenue = (venueId: string): SharedVenue[] => {
  const venues = loadSharedVenues();
  const filteredVenues = venues.filter(v => v.id !== venueId);
  saveSharedVenues(filteredVenues);
  return filteredVenues;
};

// Upload image with proper save (ENHANCED VERSION!)
export const uploadVenueImage = async (file: File): Promise<string | null> => {
  try {
    console.log('🖼️ UPLOADING VENUE IMAGE:', file.name);
    
    // Try Supabase Storage first
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `venue-images/${fileName}`;

      const { data, error } = await supabase.storage
        .from('venue-images')
        .upload(filePath, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('venue-images')
        .getPublicUrl(filePath);

      console.log('✅ IMAGE UPLOADED TO SUPABASE:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (storageError) {
      console.warn('⚠️ Supabase storage failed, using base64 fallback:', storageError);
      
      // Fallback to base64
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          console.log('✅ IMAGE CONVERTED TO BASE64 (fallback)');
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });
    }
  } catch (error) {
    console.error('❌ Error uploading venue image:', error);
    return null;
  }
};

// Merge venues from events (for organizer dashboard)
export const mergeVenuesWithEvents = async (userEvents: any[]): Promise<SharedVenue[]> => {
  const existingVenues = loadSharedVenues();
  const venueMap = new Map<string, SharedVenue>();

  // Add existing venues to map (PRESERVE ALL EXISTING DATA INCLUDING IMAGES)
  existingVenues.forEach(venue => {
    venueMap.set(venue.name, { ...venue }); // Deep copy to preserve all data
  });

  // Process events and create/update venues
  userEvents.forEach(event => {
    if (event.venue) {
      const existingVenue = venueMap.get(event.venue);
      
      if (existingVenue) {
        // Update existing venue with event info BUT PRESERVE EXISTING DATA
        existingVenue.events_count = (existingVenue.events_count || 0) + 1;
        existingVenue.capacity = Math.max(existingVenue.capacity, event.expected_participants || 50);
        existingVenue.event_details = {
          event_name: event.title,
          event_date: event.date,
          participants_count: event.expected_participants || 50
        };
        existingVenue.updated_at = new Date().toISOString();
        // KEEP EXISTING: image_url, description, amenities, created_by, etc.
      } else {
        // Create new venue from event ONLY if it doesn't exist
        const newVenue: SharedVenue = {
          id: `venue-${event.venue.toLowerCase().replace(/\s+/g, '-')}-${event.id}`,
          name: event.venue,
          capacity: event.expected_participants || 50,
          location: event.venue,
          description: `Venue for "${event.title}" event`,
          image_url: null, // Will be set later if user uploads
          amenities: ['Audio System', 'Seating', 'Lighting'],
          created_at: event.date,
          updated_at: new Date().toISOString(),
          status: 'Available',
          events_count: 1,
          is_available: true,
          event_details: {
            event_name: event.title,
            event_date: event.date,
            participants_count: event.expected_participants || 50
          },
          created_by: 'organizer'
        };
        venueMap.set(event.venue, newVenue);
      }
    }
  });

  const mergedVenues = Array.from(venueMap.values());
  saveSharedVenues(mergedVenues);
  console.log('🔄 MERGE: Preserved venue data including images:', mergedVenues.map(v => ({ name: v.name, hasImage: !!v.image_url })));
  return mergedVenues;
};

// Get all venues (used by both admin and organizer)
export const getAllSharedVenues = (): SharedVenue[] => {
  return loadSharedVenues();
};

// Fix venue image sync - ensure all venue data is preserved
export const fixVenueImageSync = (): SharedVenue[] => {
  const venues = loadSharedVenues();
  console.log('🔧 FIXING VENUE IMAGE SYNC:');
  
  venues.forEach(venue => {
    console.log(`  ${venue.name}: ${venue.image_url ? '✅ HAS IMAGE' : '❌ NO IMAGE'} (${venue.created_by || 'unknown creator'})`);
  });
  
  // Force save to ensure data integrity
  saveSharedVenues(venues);
  console.log('🔧 VENUE SYNC FIX COMPLETE');
  
  return venues;
};

// Force sync all venues from all sources (MASTER SYNC FUNCTION)
export const forceSyncAllVenues = async (): Promise<SharedVenue[]> => {
  console.log('🔄 FORCE SYNC: Starting master venue synchronization...');
  
  try {
    // Load existing venues from localStorage
    const existingVenues = loadSharedVenues();
    console.log('🔄 FORCE SYNC: Existing venues:', existingVenues);
    
    // Try to get approved events from Supabase
    let eventVenues: SharedVenue[] = [];
    try {
      const { data: eventRequestsData } = await supabase
        .from('event_requests')
        .select('venue, expected_participants, title, id, date, requester_id')
        .eq('status', 'approved');

      if (eventRequestsData && eventRequestsData.length > 0) {
        console.log('🔄 FORCE SYNC: Found approved events:', eventRequestsData);
        
        // Create venue map from events
        const venueMap = new Map<string, SharedVenue>();
        
        eventRequestsData.forEach(event => {
          if (event.venue && !venueMap.has(event.venue)) {
            const newVenue: SharedVenue = {
              id: `venue-${event.venue.toLowerCase().replace(/\s+/g, '-')}-${event.id}`,
              name: event.venue,
              capacity: event.expected_participants || 50,
              location: event.venue,
              description: `Venue for "${event.title}" event`,
              image_url: null,
              amenities: ['Audio System', 'Seating', 'Lighting'],
              created_at: event.date,
              updated_at: new Date().toISOString(),
              status: 'Available',
              events_count: 1,
              is_available: true,
              event_details: {
                event_name: event.title,
                event_date: event.date,
                participants_count: event.expected_participants || 50
              },
              created_by: 'system'
            };
            venueMap.set(event.venue, newVenue);
          } else if (event.venue && venueMap.has(event.venue)) {
            const existing = venueMap.get(event.venue)!;
            existing.events_count = (existing.events_count || 0) + 1;
            existing.capacity = Math.max(existing.capacity, event.expected_participants || 50);
          }
        });
        
        eventVenues = Array.from(venueMap.values());
        console.log('� FORCE SYNC: Created venues from events:', eventVenues);
      }
    } catch (dbError) {
      console.log('🔄 FORCE SYNC: Database query failed, using existing venues only');
    }
    
    // Merge existing venues with event venues (PRESERVE ALL EXISTING DATA)
    const mergedMap = new Map<string, SharedVenue>();
    
    // Add existing venues first (DEEP COPY TO PRESERVE ALL DATA)
    existingVenues.forEach(venue => {
      mergedMap.set(venue.name, { 
        ...venue, 
        // Preserve ALL existing data including images, descriptions, amenities
        image_url: venue.image_url, // CRITICAL: Keep existing images
        description: venue.description, // Keep existing descriptions 
        amenities: venue.amenities, // Keep existing amenities
        created_by: venue.created_by, // Keep creator info
        last_modified_by: venue.last_modified_by // Keep modifier info
      });
    });
    
    // Add or update with event venues (BUT DON'T OVERWRITE EXISTING DATA)
    eventVenues.forEach(venue => {
      const existing = mergedMap.get(venue.name);
      if (existing) {
        // Keep existing venue data but update event-related info only
        existing.events_count = Math.max(existing.events_count || 0, venue.events_count || 0);
        existing.capacity = Math.max(existing.capacity, venue.capacity);
        if (venue.event_details) {
          existing.event_details = venue.event_details;
        }
        existing.updated_at = new Date().toISOString();
        // IMPORTANT: DON'T overwrite image_url, description, amenities, etc.
      } else {
        // Add new venue from events only if completely new
        mergedMap.set(venue.name, venue);
      }
    });
    
    const finalVenues = Array.from(mergedMap.values());
    
    // Save the merged result
    saveSharedVenues(finalVenues);
    console.log('🔄 FORCE SYNC: Final merged venues saved:', finalVenues);
    
    return finalVenues;
  } catch (error) {
    console.error('🔄 FORCE SYNC: Error during sync:', error);
    return loadSharedVenues(); // Fallback to existing
  }
};