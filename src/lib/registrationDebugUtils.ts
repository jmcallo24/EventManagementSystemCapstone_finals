// Registration Count Sync Utility
// This utility helps sync participant counts and debug registration issues

import { supabase } from './supabaseClient';

export const registrationDebugUtils = {
  // Check if registration functions exist in database
  async checkRegistrationFunctions() {
    try {
      console.log('Checking if registration functions exist...');
      
      // Test the main registration function
      const { data: testResult, error: testError } = await supabase.rpc('register_user_for_event', {
        p_event_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID to test function exists
        p_user_id: '00000000-0000-0000-0000-000000000000'
      });
      
      if (testError && testError.message.includes('function register_user_for_event')) {
        console.error('❌ register_user_for_event function does not exist');
        return false;
      } else {
        console.log('✅ register_user_for_event function exists');
      }

      // Test increment function
      const { error: incError } = await supabase.rpc('increment_event_participants', {
        event_id: '00000000-0000-0000-0000-000000000000'
      });
      
      if (incError && incError.message.includes('function increment_event_participants')) {
        console.error('❌ increment_event_participants function does not exist');
        return false;
      } else {
        console.log('✅ increment_event_participants function exists');
      }

      return true;
    } catch (error) {
      console.error('Error checking functions:', error);
      return false;
    }
  },

  // Sync all event participant counts
  async syncAllParticipantCounts() {
    try {
      console.log('Syncing all participant counts...');
      
      // Get all events with their actual registration counts
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          current_participants,
          event_registrations(count)
        `);

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        return;
      }

      let updatedCount = 0;

      for (const event of events || []) {
        const actualCount = event.event_registrations?.[0]?.count || 0;
        const currentCount = event.current_participants || 0;

        if (currentCount !== actualCount) {
          console.log(`Updating ${event.title}: ${currentCount} → ${actualCount}`);
          
          const { error: updateError } = await supabase
            .from('events')
            .update({ current_participants: actualCount })
            .eq('id', event.id);

          if (updateError) {
            console.error(`Failed to update ${event.title}:`, updateError);
          } else {
            updatedCount++;
          }
        }
      }

      console.log(`✅ Synced ${updatedCount} events`);
      return updatedCount;
    } catch (error) {
      console.error('Error syncing counts:', error);
      return 0;
    }
  },

  // Get current event registration status
  async getEventRegistrationStatus(eventId: string) {
    try {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          current_participants,
          max_participants,
          event_registrations(
            id,
            participant_id,
            registration_date,
            users(name, email)
          )
        `)
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('Error fetching event:', eventError);
        return null;
      }

      const actualCount = event.event_registrations?.length || 0;
      const storedCount = event.current_participants || 0;

      console.log('Event Registration Status:');
      console.log(`- Title: ${event.title}`);
      console.log(`- Stored Count: ${storedCount}`);
      console.log(`- Actual Count: ${actualCount}`);
      console.log(`- Max Participants: ${event.max_participants}`);
      console.log(`- Count Match: ${storedCount === actualCount ? '✅' : '❌'}`);

      if (event.event_registrations) {
        console.log('Registered Users:');
        event.event_registrations.forEach((reg: any, index: number) => {
          console.log(`  ${index + 1}. ${reg.users?.name || 'Unknown'} (${reg.users?.email || 'No email'})`);
        });
      }

      return {
        event,
        actualCount,
        storedCount,
        isCountCorrect: storedCount === actualCount
      };
    } catch (error) {
      console.error('Error getting event status:', error);
      return null;
    }
  }
};

// Add to window for console debugging
if (typeof window !== 'undefined') {
  (window as any).registrationDebug = registrationDebugUtils;
}