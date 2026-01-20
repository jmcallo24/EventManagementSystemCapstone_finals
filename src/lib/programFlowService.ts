import { supabase } from './supabaseClient';

export interface ProgramFlowActivity {
  id: string;
  time: string;
  title: string;
  description: string;
  location?: string;
  duration: number; // in minutes
  activity_type: 'opening' | 'presentation' | 'activity' | 'break' | 'closing' | 'other';
  is_active: boolean;
  order_index: number;
}

export interface ProgramFlow {
  id: string;
  event_id: string;
  event_title: string;
  event_date: string;
  organizer_id: string;
  organizer_name: string;
  title: string;
  description?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  admin_comments?: string;
  activities: ProgramFlowActivity[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface CreateProgramFlowData {
  event_id: string;
  title: string;
  description?: string;
  activities: Omit<ProgramFlowActivity, 'id'>[];
}

// GET ALL PROGRAM FLOWS (for admin)
export const getAllProgramFlows = async (): Promise<ProgramFlow[]> => {
  try {
    console.log('📋 Loading all program flows...');
    
    const { data, error } = await supabase
      .from('program_flows')
      .select(`
        *,
        program_flow_activities (*)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error loading program flows:', error);
      return [];
    }

    const programFlows: ProgramFlow[] = data?.map(flow => ({
      ...flow,
      activities: flow.program_flow_activities?.sort((a: any, b: any) => a.order_index - b.order_index) || []
    })) || [];

    console.log('✅ Loaded program flows:', programFlows.length);
    return programFlows;
  } catch (error) {
    console.error('❌ Error in getAllProgramFlows:', error);
    return [];
  }
};

// GET PROGRAM FLOWS BY ORGANIZER
export const getProgramFlowsByOrganizer = async (organizerId: string): Promise<ProgramFlow[]> => {
  try {
    console.log('📋 Loading program flows for organizer:', organizerId);
    
    const { data, error } = await supabase
      .from('program_flows')
      .select(`
        *,
        program_flow_activities (*)
      `)
      .eq('organizer_id', organizerId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error loading organizer program flows:', error);
      return [];
    }

    const programFlows: ProgramFlow[] = data?.map(flow => ({
      ...flow,
      activities: flow.program_flow_activities?.sort((a: any, b: any) => a.order_index - b.order_index) || []
    })) || [];

    console.log('✅ Loaded organizer program flows:', programFlows.length);
    return programFlows;
  } catch (error) {
    console.error('❌ Error in getProgramFlowsByOrganizer:', error);
    return [];
  }
};

// GET APPROVED EVENTS FOR PROGRAM FLOW CREATION
export const getApprovedEventsForProgramFlow = async (): Promise<any[]> => {
  try {
    console.log('📅 Loading ALL approved events for program flow creation...');
    
    // Load ALL approved events for organizers to create program flows for any event
    const { data, error } = await supabase
      .from('event_requests')
      .select('*')
      .eq('status', 'approved')
      .order('date', { ascending: true });

    if (error) {
      console.error('❌ Error loading approved events:', error);
      return [];
    }

    console.log('✅ Loaded approved events:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('❌ Error in getApprovedEventsForProgramFlow:', error);
    return [];
  }
};

// CREATE PROGRAM FLOW
export const createProgramFlow = async (organizerId: string, organizerName: string, data: CreateProgramFlowData): Promise<ProgramFlow | null> => {
  try {
    console.log('📝 Creating program flow...', data.title);

    // Get event details from event_requests table
    const { data: eventData } = await supabase
      .from('event_requests')
      .select('title, date')
      .eq('id', data.event_id)
      .single();

    // Create program flow
    const { data: flowData, error: flowError } = await supabase
      .from('program_flows')
      .insert({
        event_id: data.event_id,
        event_title: eventData?.title || 'Unknown Event',
        event_date: eventData?.date || new Date().toISOString(),
        organizer_id: organizerId,
        organizer_name: organizerName,
        title: data.title,
        description: data.description,
        status: 'draft',
        is_active: true
      })
      .select()
      .single();

    if (flowError) {
      console.error('❌ Error creating program flow:', flowError);
      return null;
    }

    // Create activities
    if (data.activities.length > 0) {
      const activitiesData = data.activities.map((activity, index) => ({
        ...activity,
        program_flow_id: flowData.id,
        order_index: index,
        is_active: true
      }));

      const { error: activitiesError } = await supabase
        .from('program_flow_activities')
        .insert(activitiesData);

      if (activitiesError) {
        console.error('❌ Error creating activities:', activitiesError);
      }
    }

    console.log('✅ Program flow created successfully');
    return {
      ...flowData,
      activities: data.activities.map((activity, index) => ({
        ...activity,
        id: `temp-${index}`,
        order_index: index,
        is_active: true
      }))
    };
  } catch (error) {
    console.error('❌ Error in createProgramFlow:', error);
    return null;
  }
};

// UPDATE PROGRAM FLOW
export const updateProgramFlow = async (flowId: string, data: Partial<CreateProgramFlowData>): Promise<boolean> => {
  try {
    console.log('📝 Updating program flow...', flowId);

    // Update program flow
    const { error: flowError } = await supabase
      .from('program_flows')
      .update({
        title: data.title,
        description: data.description,
        updated_at: new Date().toISOString()
      })
      .eq('id', flowId);

    if (flowError) {
      console.error('❌ Error updating program flow:', flowError);
      return false;
    }

    // Update activities if provided
    if (data.activities) {
      // Delete existing activities
      await supabase
        .from('program_flow_activities')
        .delete()
        .eq('program_flow_id', flowId);

      // Insert new activities
      const activitiesData = data.activities.map((activity, index) => ({
        ...activity,
        program_flow_id: flowId,
        order_index: index,
        is_active: true
      }));

      const { error: activitiesError } = await supabase
        .from('program_flow_activities')
        .insert(activitiesData);

      if (activitiesError) {
        console.error('❌ Error updating activities:', activitiesError);
        return false;
      }
    }

    console.log('✅ Program flow updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Error in updateProgramFlow:', error);
    return false;
  }
};

// SUBMIT PROGRAM FLOW FOR APPROVAL
export const submitProgramFlow = async (flowId: string): Promise<boolean> => {
  try {
    console.log('📤 Submitting program flow for approval...', flowId);

    const { error } = await supabase
      .from('program_flows')
      .update({
        status: 'submitted',
        updated_at: new Date().toISOString()
      })
      .eq('id', flowId);

    if (error) {
      console.error('❌ Error submitting program flow:', error);
      return false;
    }

    console.log('✅ Program flow submitted successfully');
    return true;
  } catch (error) {
    console.error('❌ Error in submitProgramFlow:', error);
    return false;
  }
};

// ADMIN: APPROVE/REJECT PROGRAM FLOW
export const reviewProgramFlow = async (flowId: string, status: 'approved' | 'rejected', adminComments?: string): Promise<boolean> => {
  try {
    console.log('👁️ Admin reviewing program flow...', flowId, status);

    const { error } = await supabase
      .from('program_flows')
      .update({
        status,
        admin_comments: adminComments,
        updated_at: new Date().toISOString()
      })
      .eq('id', flowId);

    if (error) {
      console.error('❌ Error reviewing program flow:', error);
      return false;
    }

    console.log('✅ Program flow reviewed successfully');
    return true;
  } catch (error) {
    console.error('❌ Error in reviewProgramFlow:', error);
    return false;
  }
};

// DELETE PROGRAM FLOW
export const deleteProgramFlow = async (flowId: string): Promise<boolean> => {
  try {
    console.log('🗑️ Deleting program flow...', flowId);

    const { error } = await supabase
      .from('program_flows')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', flowId);

    if (error) {
      console.error('❌ Error deleting program flow:', error);
      return false;
    }

    console.log('✅ Program flow deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Error in deleteProgramFlow:', error);
    return false;
  }
};