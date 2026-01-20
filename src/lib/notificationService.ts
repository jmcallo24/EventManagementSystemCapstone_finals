import { supabase } from './supabaseClient';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'event_request' | 'event_approved' | 'event_rejected' | 'registration' | 'announcement' | 'report_update' | 'participant_joined';
  is_read: boolean;
  related_event_id?: string;
  created_at: string;
}

// Get notifications for current user
export const getNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getNotifications:', error);
    return [];
  }
};

// Get unread notification count
export const getUnreadCount = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getUnreadCount:', error);
    return 0;
  }
};

// Mark notification as read
export const markAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markAsRead:', error);
    return false;
  }
};

// Mark all notifications as read for user
export const markAllAsRead = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markAllAsRead:', error);
    return false;
  }
};

// Create notification (for admin sending notifications)
export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: Notification['type'] = 'announcement',
  relatedEventId?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        title,
        message,
        type,
        related_event_id: relatedEventId
      }]);

    if (error) {
      console.error('Error creating notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in createNotification:', error);
    return false;
  }
};

// Create notification for all users (admin broadcast)
export const createBroadcastNotification = async (
  title: string,
  message: string,
  type: Notification['type'] = 'announcement',
  relatedEventId?: string
): Promise<boolean> => {
  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return false;
    }

    if (!users || users.length === 0) {
      console.log('No users found for broadcast');
      return true;
    }

    // Create notifications for all users
    const notifications = users.map(user => ({
      user_id: user.id,
      title,
      message,
      type,
      related_event_id: relatedEventId
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) {
      console.error('Error creating broadcast notifications:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in createBroadcastNotification:', error);
    return false;
  }
};

// Auto-create notifications for specific events
export const autoCreateNotifications = {
  // When a participant joins an event
  participantJoined: async (eventId: string, participantName: string, organizerId: string) => {
    return createNotification(
      organizerId,
      'New Participant Registered',
      `${participantName} has registered for your event`,
      'participant_joined',
      eventId
    );
  },

  // When event is approved
  eventApproved: async (eventId: string, organizerId: string, eventTitle: string) => {
    return createNotification(
      organizerId,
      'Event Approved',
      `Your event "${eventTitle}" has been approved by admin`,
      'event_approved',
      eventId
    );
  },

  // When event is rejected
  eventRejected: async (eventId: string, organizerId: string, eventTitle: string, reason?: string) => {
    const message = reason 
      ? `Your event "${eventTitle}" was rejected. Reason: ${reason}`
      : `Your event "${eventTitle}" was rejected by admin`;
    
    return createNotification(
      organizerId,
      'Event Rejected',
      message,
      'event_rejected',
      eventId
    );
  },

  // When new event request is submitted
  newEventRequest: async (eventId: string, organizerName: string, eventTitle: string) => {
    try {
      console.log('🔔 Creating admin notification for new event request...');
      
      // First try to get admin users from users table
      const { data: admins, error: adminError } = await supabase
        .from('users')
        .select('id, role')
        .eq('role', 'admin');

      console.log('Admin users found:', admins?.length || 0);

      let targetAdmins = [];
      
      if (adminError || !admins || admins.length === 0) {
        console.log('⚠️ No admin users found or error, using fallback approach...');
        
        // Fallback: Get the current user from localStorage (assuming they're admin)
        const currentUserData = localStorage.getItem("user");
        if (currentUserData) {
          const currentUser = JSON.parse(currentUserData);
          if (currentUser.role === 'admin' && currentUser.id) {
            targetAdmins = [{ id: currentUser.id }];
            console.log('✅ Using current admin user as fallback:', currentUser.id);
          }
        }
        
        // Last resort: use a default admin ID pattern
        if (targetAdmins.length === 0) {
          targetAdmins = [
            { id: '00000000-0000-0000-0000-000000000001' }, // Default admin ID
          ];
          console.log('⚠️ Using default admin ID as last resort');
        }
      } else {
        targetAdmins = admins;
        console.log('✅ Using database admin users');
      }

        // Create notifications for all found admins
        const notifications = targetAdmins.map(admin => ({
          user_id: admin.id,
          title: '🏆 New Event Request',
          message: `${organizerName} submitted a new event request: "${eventTitle}". Please review and approve.`,
          type: 'event_request' as const,
          related_event_id: eventId,
          is_read: false
        }));

        console.log('📨 Creating notifications for admins:', notifications);
        console.log('📨 Target admin IDs:', targetAdmins.map(a => a.id));      const { data: insertData, error: insertError } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();

      if (insertError) {
        console.error('❌ Error inserting notifications:', insertError);
        return false;
      }

      if (insertData && insertData.length > 0) {
        console.log('✅ Admin notifications created successfully:', insertData.length);
        insertData.forEach(notif => console.log('- Created notification for admin:', notif.user_id));
        return true;
      } else {
        console.log('⚠️ No notifications were created in database');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error in newEventRequest notification:', error);
      return false;
    }
  },

  // When report is updated
  reportUpdated: async (reportId: string, reporterId: string, status: string) => {
    return createNotification(
      reporterId,
      'Report Updated',
      `Your report status has been updated to: ${status}`,
      'report_update'
    );
  },

  // New admin-specific notifications
  admin: {
    // When program flow is submitted
    programFlowSubmitted: async (programTitle: string, organizerName: string) => {
      try {
        console.log('📋 Creating admin notification for program flow submission...');
        
        // FIXED: Better admin detection for your database
        let targetAdmins = [];
        
        console.log('🔍 Looking for admin users in database...');
        
        // Method 1: Look for users with admin role (exact match)
        const { data: adminUsers, error: adminError } = await supabase
          .from('users')
          .select('id, role, email, name')
          .eq('role', 'admin');
          
        console.log('🔍 Database query result:', { adminUsers, adminError });
          
        if (adminUsers && adminUsers.length > 0) {
          targetAdmins = adminUsers;
          console.log('✅ Found admin users:', adminUsers.length);
          adminUsers.forEach(admin => console.log('- Admin:', admin.name, admin.email, 'Role:', admin.role, 'ID:', admin.id));
        } else {
          console.log('⚠️ No admin users found with admin role');
          console.log('Database error:', adminError);
        }
        
        // Method 2: If no admin role users, look for admin-like emails
        if (targetAdmins.length === 0) {
          const { data: emailAdmins } = await supabase
            .from('users')
            .select('id, email')
            .or('email.ilike.%admin%,email.ilike.%administrator%,email.ilike.%caps%');
            
          if (emailAdmins && emailAdmins.length > 0) {
            targetAdmins = emailAdmins;
            console.log('✅ Found users with admin-like emails:', emailAdmins.length);
          }
        }
        
        // Method 3: Create notification for a specific user ID if we know there's an admin
        if (targetAdmins.length === 0) {
          // Check if there are any users at all and pick one as admin
          const { data: anyUsers } = await supabase
            .from('users')
            .select('id, email')
            .limit(3);
            
          if (anyUsers && anyUsers.length > 0) {
            // Use the first user as emergency admin
            targetAdmins = [anyUsers[0]];
            console.log('⚠️ EMERGENCY: Using first user as admin:', anyUsers[0].email);
          }
        }

        const notifications = targetAdmins.map(admin => ({
          user_id: admin.id,
          title: '📋 Program Flow Submission',
          message: `${organizerName} has submitted program flow for "${programTitle}". Please review the timeline and activities.`,
          type: 'event_request' as const,
          is_read: false
        }));

        const { error } = await supabase.from('notifications').insert(notifications);
        if (error) {
          console.error('❌ Error creating program flow notifications:', error);
          return false;
        }
        
        console.log('✅ Program flow notifications created successfully');
        return true;
      } catch (error) {
        console.error('❌ Error in programFlowSubmitted:', error);
        return false;
      }
    },

    // When high registration numbers are reached
    highRegistrationAlert: async (eventTitle: string, count: number, capacity: number) => {
      const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin');
      if (!admins) return false;

      const percentage = Math.round((count / capacity) * 100);
      const promises = admins.map(admin => 
        createNotification(
          admin.id,
          '🚨 High Registration Alert',
          `${eventTitle} has reached ${count}+ registrations (${percentage}% capacity). Consider preparing additional resources.`,
          'registration'
        )
      );
      return Promise.all(promises).then(results => results.every(r => r));
    },

    // When venue conflict is detected
    venueConflictDetected: async (venueName: string, conflictingEvents: string[]) => {
      const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin');
      if (!admins) return false;

      const promises = admins.map(admin => 
        createNotification(
          admin.id,
          '⚠️ Venue Conflict Detected',
          `${venueName} has scheduling conflicts between: ${conflictingEvents.join(' and ')}. Please resolve this conflict.`,
          'report_update'
        )
      );
      return Promise.all(promises).then(results => results.every(r => r));
    },

    // When milestone is reached
    participantMilestone: async (milestone: number) => {
      const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin');
      if (!admins) return false;

      const promises = admins.map(admin => 
        createNotification(
          admin.id,
          '🎉 Participant Milestone Reached',
          `CAPS Events platform has reached ${milestone}+ registered participants! Consider expanding event offerings.`,
          'participant_joined'
        )
      );
      return Promise.all(promises).then(results => results.every(r => r));
    },

    // When multimedia post needs review
    multimediaReview: async (postTitle: string, authorName: string) => {
      const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin');
      if (!admins) return false;

      const promises = admins.map(admin => 
        createNotification(
          admin.id,
          '📱 Multimedia Post for Review',
          `${authorName} posted "${postTitle}" that may require admin review due to high engagement.`,
          'announcement'
        )
      );
      return Promise.all(promises).then(results => results.every(r => r));
    },

    // System maintenance reminders
    systemMaintenance: async (scheduledDate: string, duration: string) => {
      return createBroadcastNotification(
        '🔧 System Maintenance Scheduled',
        `Scheduled system maintenance on ${scheduledDate}, ${duration}. Event registration will be temporarily unavailable.`,
        'announcement'
      );
    },

    // Event completion summary
    eventCompleted: async (eventTitle: string, participantCount: number, satisfactionRate: number) => {
      const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin');
      if (!admins) return false;

      const promises = admins.map(admin => 
        createNotification(
          admin.id,
          '🏆 Event Completed Successfully',
          `${eventTitle} completed with ${participantCount} participants. Post-event survey shows ${satisfactionRate}% satisfaction rate.`,
          'report_update'
        )
      );
      return Promise.all(promises).then(results => results.every(r => r));
    }
  }
};