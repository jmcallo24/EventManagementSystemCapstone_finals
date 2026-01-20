import { supabase } from './supabaseClient';

export interface RegistrationResult {
  success: boolean;
  message: string;
}

export const registrationService = {
  // Register for an event
  async registerForEvent(eventId: string): Promise<RegistrationResult> {
    try {
      // Get user from localStorage first (how the app currently works)
      const userData = localStorage.getItem("user");
      let currentUser = null;
      
      if (userData) {
        currentUser = JSON.parse(userData);
      }

      // If no localStorage user, try Supabase auth as fallback
      if (!currentUser) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          return {
            success: false,
            message: 'Please log in to register for events'
          };
        }
        currentUser = user;
      }

      if (!currentUser?.id) {
        return {
          success: false,
          message: 'Please log in to register for events'
        };
      }

      // First check if the event exists in either events table or approved event_requests
      console.log('Checking if event exists:', eventId);
      
      let eventExists = false;
      try {
        // Check events table first
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('id, title, status')
          .eq('id', eventId)
          .eq('status', 'approved')
          .single();

        if (eventData && !eventError) {
          console.log('Found event in events table:', eventData);
          eventExists = true;
        } else {
          // Check event_requests table for approved events
          const { data: requestData, error: requestError } = await supabase
            .from('event_requests')
            .select('id, title, status')
            .eq('id', eventId)
            .eq('status', 'approved')
            .single();

          if (requestData && !requestError) {
            console.log('Found event in event_requests table:', requestData);
            eventExists = true;
          }
        }
      } catch (checkError) {
        console.error('Error checking event existence:', checkError);
      }

      if (!eventExists) {
        return {
          success: false,
          message: 'Event not found or not available for registration'
        };
      }

      // Skip the SQL function for now and go straight to direct insert
      // The SQL function seems to have issues with event_requests vs events table
      console.log('Using direct database insert for reliability...');
      
      try {
        // Direct insert approach
          const { error: insertError } = await supabase
            .from('event_registrations')
            .insert([{
              event_id: eventId,
              participant_id: currentUser.id,
              registration_date: new Date().toISOString(),
              attendance_status: 'registered'
            }]);

          if (insertError) {
            // If it's a duplicate registration error, handle it specifically
            if (insertError.message.includes('duplicate') || insertError.code === '23505') {
              return {
                success: false,
                message: 'You are already registered for this event'
              };
            }
            // If it's a 401 error, it's likely RLS policy issue, try SQL functions
            if (insertError.message.includes('401') || insertError.code === '401') {
              throw new Error('RLS_POLICY_ERROR');
            }
            throw insertError;
          }

          // Update participant count
          try {
            console.log('Incrementing participant count for event:', eventId);
            await supabase.rpc('increment_event_participants', {
              event_id: eventId
            });
            console.log('Successfully incremented participant count');
            
            // Verify the count was updated
            setTimeout(async () => {
              try {
                const { data: eventData } = await supabase
                  .from('events')
                  .select('current_participants, title')
                  .eq('id', eventId)
                  .single();
                console.log(`Event "${eventData?.title}" now has ${eventData?.current_participants} participants`);
              } catch (verifyError) {
                console.log('Could not verify count update:', verifyError);
              }
            }, 500);
            
          } catch (countError) {
            console.error('Failed to update participant count:', countError);
            // Try manual count update as fallback
            try {
              console.log('Trying manual count update...');
              
              // First get current count
              const { data: currentEvent, error: fetchError } = await supabase
                .from('events')
                .select('current_participants')
                .eq('id', eventId)
                .single();
              
              if (fetchError) {
                console.error('Could not fetch current count:', fetchError);
              } else {
                const newCount = (currentEvent.current_participants || 0) + 1;
                const { error: manualError } = await supabase
                  .from('events')
                  .update({ current_participants: newCount })
                  .eq('id', eventId);
                
                if (manualError) {
                  console.error('Manual count update also failed:', manualError);
                } else {
                  console.log('Manual count update succeeded, new count:', newCount);
                }
              }
            } catch (manualError) {
              console.error('Manual count update failed:', manualError);
            }
          }

          console.log('Registration successful! Returning success response.');
          return {
            success: true,
            message: 'Successfully registered for the event!'
          };
        } catch (directError) {
          console.error('Direct registration failed, trying SQL functions:', directError);
          
          // Fallback: Try the older SQL functions
          try {
            const { data: oldData, error: oldError } = await supabase.rpc('register_for_event_with_user_id', {
              p_event_id: eventId,
              p_user_id: currentUser.id
            });

            if (oldError) {
              return {
                success: false,
                message: 'Registration failed. Please run the SQL fix script.'
              };
            }

            return oldData as RegistrationResult;
          } catch (sqlError) {
            console.error('All registration methods failed:', sqlError);
            return {
              success: false,
              message: 'Failed to register for event. Please try again.'
            };
          }
        }
    } catch (error) {
      console.error('Registration service error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred. Please try again.'
      };
    }
  },

  // Unregister from an event
  async unregisterFromEvent(eventId: string): Promise<RegistrationResult> {
    try {
      // Get user from localStorage first
      const userData = localStorage.getItem("user");
      let currentUser = null;
      
      if (userData) {
        currentUser = JSON.parse(userData);
      }

      // If no localStorage user, try Supabase auth as fallback
      if (!currentUser) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          return {
            success: false,
            message: 'Please log in to unregister from events'
          };
        }
        currentUser = user;
      }

      if (!currentUser?.id) {
        return {
          success: false,
          message: 'Please log in to unregister from events'
        };
      }

      // Try direct delete first
      try {
        const { error: deleteError } = await supabase
          .from('event_registrations')
          .delete()
          .eq('event_id', eventId)
          .eq('participant_id', currentUser.id);

        if (deleteError) throw deleteError;

        // Update participant count
        try {
          await supabase.rpc('decrement_event_participants', {
            event_id: eventId
          });
        } catch (countError) {
          console.error('Failed to update participant count:', countError);
          // Don't fail the unregistration if count update fails
        }

        return {
          success: true,
          message: 'Successfully unregistered from the event'
        };
      } catch (directError) {
        console.error('Direct unregistration failed, trying SQL function:', directError);
        
        // Fallback: Try new SQL function
        const { data, error } = await supabase.rpc('unregister_user_from_event', {
          p_event_id: eventId,
          p_user_id: currentUser.id
        });

        if (error) {
          console.error('New unregister function failed:', error);
          return {
            success: false,
            message: 'Failed to unregister from event. Please try again.'
          };
        }

        return data as RegistrationResult;
      }
    } catch (error) {
      console.error('Unregistration service error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred. Please try again.'
      };
    }
  },

  // Check if user is registered for an event
  async isUserRegistered(eventId: string, participantId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('id')
        .eq('event_id', eventId)
        .eq('participant_id', participantId)
        .limit(1);

      if (error) {
        console.error('Check registration error:', error);
        return false;
      }

      return (data && data.length > 0);
    } catch (error) {
      console.error('Check registration service error:', error);
      return false;
    }
  },

  // Get user's registrations
  async getUserRegistrations(participantId: string) {
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          id,
          registration_date,
          attendance_status,
          event:event_id (
            id,
            title,
            date,
            time,
            venue,
            event_type,
            current_participants,
            max_participants,
            status
          )
        `)
        .eq('participant_id', participantId)
        .order('registration_date', { ascending: false });

      if (error) {
        console.error('Get user registrations error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get user registrations service error:', error);
      return [];
    }
  },

  // Fix all participant counts manually
  async fixParticipantCounts(): Promise<{success: boolean, message: string}> {
    try {
      console.log('Attempting to fix participant counts...');
      
      // Try the simple function first (works without RLS)
      try {
        const { data, error } = await supabase.rpc('fix_all_participant_counts_now');
        
        if (!error && data) {
          console.log('New fix function result:', data);
          return {
            success: true,
            message: data
          };
        }
      } catch (newError) {
        console.log('New fix function not available, trying others...');
      }
      
      try {
        const { data, error } = await supabase.rpc('fix_participant_counts_simple');
        
        if (!error && data) {
          console.log('Simple function result:', data);
          return {
            success: true,
            message: data
          };
        }
      } catch (simpleError) {
        console.log('Simple function not available, trying original...');
      }
      
      // First try the SQL function
      const { data, error } = await supabase.rpc('fix_all_participant_counts');
      
      if (error) {
        console.error('Fix participant counts RPC error:', error);
        
        // If the function doesn't exist, let's manually fix the counts
        console.log('SQL function not found, manually fixing counts...');
        
        // Get all events
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select('id, title, current_participants');
          
        if (eventsError) {
          console.error('Failed to get events:', eventsError);
          return {
            success: false,
            message: 'Failed to get events: ' + eventsError.message
          };
        }
        
        let fixedCount = 0;
        
        // For each event, count actual registrations and update
        for (const event of events || []) {
          try {
            // Try to bypass RLS by using service role or different approach
            const { data: registrations, error: regError } = await supabase
              .from('event_registrations')
              .select('id', { count: 'exact', head: true })
              .eq('event_id', event.id);
              
            if (regError) {
              console.error(`Failed to count registrations for event ${event.id}:`, regError);
              
              // If RLS error, try to get count via RPC call
              try {
                const { data: countData, error: countError } = await supabase.rpc('count_event_registrations', {
                  p_event_id: event.id
                });
                
                if (!countError && typeof countData === 'number') {
                  const actualCount = countData;
                  
                  if (actualCount !== event.current_participants) {
                    const { error: updateError } = await supabase
                      .from('events')
                      .update({ current_participants: actualCount })
                      .eq('id', event.id);
                      
                    if (!updateError) {
                      console.log(`Updated ${event.title}: ${event.current_participants} -> ${actualCount}`);
                      fixedCount++;
                    }
                  }
                }
              } catch (rpcError) {
                console.error(`RPC count failed for event ${event.id}:`, rpcError);
              }
              continue;
            }
            
            const actualCount = registrations?.length || 0;
            
            if (actualCount !== event.current_participants) {
              const { error: updateError } = await supabase
                .from('events')
                .update({ current_participants: actualCount })
                .eq('id', event.id);
                
              if (updateError) {
                console.error(`Failed to update count for event ${event.id}:`, updateError);
              } else {
                console.log(`Updated ${event.title}: ${event.current_participants} -> ${actualCount}`);
                fixedCount++;
              }
            }
          } catch (eventError) {
            console.error(`Error processing event ${event.id}:`, eventError);
          }
        }
        
        return {
          success: true,
          message: `Manually fixed participant counts for ${fixedCount} events`
        };
      }

      console.log('SQL function result:', data);
      return {
        success: true,
        message: data || 'Participant counts fixed successfully'
      };
    } catch (error) {
      console.error('Fix participant counts service error:', error);
      return {
        success: false,
        message: 'An error occurred while fixing participant counts: ' + (error as Error).message
      };
    }
  }
};