import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Sidebar from "@/components/Sidebar";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, X, Calendar as CalendarIcon, School, RefreshCw, Database } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Activity {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: string;
  description: string;
  color: string;
  isFixed?: boolean; // For school calendar events that can't be deleted
  isCustom?: boolean; // For user-added events
}

const EVENT_TYPES = [
  { label: "Academic", color: "from-blue-400 to-blue-600" },
  { label: "Sports", color: "from-green-400 to-green-600" },
  { label: "Cultural", color: "from-pink-400 to-pink-600" },
  { label: "Research", color: "from-purple-400 to-purple-600" },
  { label: "Examination", color: "from-red-400 to-red-600" },
  { label: "Holiday", color: "from-orange-400 to-orange-600" },
  { label: "Other", color: "from-violet-400 to-violet-600" },
];

// FIXED SCHOOL CALENDAR EVENTS from your images (STLINK COLLEGE)
const FIXED_SCHOOL_EVENTS: Activity[] = [
  // June 2025
  { id: 'fixed-1', title: 'Brigada Eskwela (All Dept)', date: '2025-06-25', type: 'Academic', description: 'All Campus preparation', color: 'from-blue-400 to-blue-600', isFixed: true },
  { id: 'fixed-2', title: 'INSET (All Dept)', date: '2025-06-27', type: 'Academic', description: 'MV Gymnasium', color: 'from-blue-400 to-blue-600', isFixed: true },
  { id: 'fixed-3', title: 'Distribution of Loads', date: '2025-06-28', type: 'Academic', description: 'All Departments', color: 'from-blue-400 to-blue-600', isFixed: true },
  { id: 'fixed-4', title: 'Research Activities Orientation', date: '2025-07-01', type: 'Research', description: 'Research Activities for the Semester', color: 'from-purple-400 to-purple-600', isFixed: true },
  
  // July 2025
  { id: 'fixed-5', title: 'Title Proposal', date: '2025-07-10', type: 'Research', description: 'Research title proposal submission', color: 'from-purple-400 to-purple-600', isFixed: true },
  { id: 'fixed-6', title: 'Research Forum CHTBAM, BSIT, BSCPE', date: '2025-07-13', type: 'Research', description: 'Research forum for tech programs', color: 'from-purple-400 to-purple-600', isFixed: true },
  { id: 'fixed-7', title: 'Student Orientation', date: '2025-07-14', type: 'Academic', description: 'New student orientation', color: 'from-blue-400 to-blue-600', isFixed: true },
  { id: 'fixed-8', title: 'BS Criminology Research Forum', date: '2025-07-20', type: 'Research', description: 'Research forum for criminology students', color: 'from-purple-400 to-purple-600', isFixed: true },
  { id: 'fixed-9', title: 'INC Founding Anniversary', date: '2025-07-27', type: 'Holiday', description: 'Special Non-Working Holiday', color: 'from-orange-400 to-orange-600', isFixed: true },
  { id: 'fixed-10', title: 'Nutrition Month Celebration', date: '2025-07-31', type: 'Cultural', description: 'Food contests and SPS Project', color: 'from-pink-400 to-pink-600', isFixed: true },

  // August 2025
  { id: 'fixed-11', title: 'Research Forum BSBA, BSEntrep, BSAIS', date: '2025-08-03', type: 'Research', description: 'Business programs research forum', color: 'from-purple-400 to-purple-600', isFixed: true },
  { id: 'fixed-12', title: 'Administration of Preliminary Examination', date: '2025-08-10', type: 'Examination', description: 'Preliminary exams for all departments', color: 'from-red-400 to-red-600', isFixed: true },
  { id: 'fixed-13', title: 'Research Forum SHS', date: '2025-08-11', type: 'Research', description: 'Senior High School research forum', color: 'from-purple-400 to-purple-600', isFixed: true },
  { id: 'fixed-14', title: 'Photoshoot for Graduating Students', date: '2025-08-15', type: 'Academic', description: 'Academic Year 2025-2026 graduation photos', color: 'from-blue-400 to-blue-600', isFixed: true },
  { id: 'fixed-15', title: 'ENTREP EXPO FAIR 2025', date: '2025-08-18', type: 'Academic', description: 'Business Programs MV & Annex Campus 8:00am - 5:00pm', color: 'from-green-400 to-green-600', isFixed: true },
  { id: 'fixed-16', title: 'Ninoy Aquino Day', date: '2025-08-21', type: 'Holiday', description: 'Special Non-Working Holiday', color: 'from-orange-400 to-orange-600', isFixed: true },
  { id: 'fixed-17', title: 'Departmental Sportsfest', date: '2025-08-25', type: 'Sports', description: 'SHS & College Department sports', color: 'from-green-400 to-green-600', isFixed: true },
  { id: 'fixed-18', title: 'National Heroes Day', date: '2025-08-25', type: 'Holiday', description: 'Regular Holiday', color: 'from-orange-400 to-orange-600', isFixed: true },

  // September 2025
  { id: 'fixed-19', title: '1st Quarter Examination SHS', date: '2025-09-08', type: 'Examination', description: 'Senior High School 1st quarter exams', color: 'from-red-400 to-red-600', isFixed: true },
  { id: 'fixed-20', title: 'Submission Deadline 1st Quarter Grades', date: '2025-09-19', type: 'Academic', description: 'SHS Department grade submission', color: 'from-blue-400 to-blue-600', isFixed: true },
  { id: 'fixed-21', title: 'Team Teaching Collaboration', date: '2025-09-22', type: 'Academic', description: 'Industry experts collaboration', color: 'from-blue-400 to-blue-600', isFixed: true },
  { id: 'fixed-22', title: 'School Sports Fest', date: '2025-09-26', type: 'Sports', description: 'Annual school sports festival', color: 'from-green-400 to-green-600', isFixed: true },
  { id: 'fixed-23', title: 'Parents Teacher Conference (PTC)', date: '2025-09-26', type: 'Academic', description: 'Releasing of First Quarter Cards', color: 'from-blue-400 to-blue-600', isFixed: true },

  // October 2025
  { id: 'fixed-24', title: '10th Multidisciplinary Research', date: '2025-10-06', type: 'Research', description: 'College registrar research presentation', color: 'from-purple-400 to-purple-600', isFixed: true },
  { id: 'fixed-25', title: 'Submission of Dean\'s Research Clearance', date: '2025-10-27', type: 'Research', description: 'Research clearance submission', color: 'from-purple-400 to-purple-600', isFixed: true },
  { id: 'fixed-26', title: 'Administration of Final Examination', date: '2025-10-29', type: 'Examination', description: 'College Department final exams', color: 'from-red-400 to-red-600', isFixed: true },
  { id: 'fixed-27', title: 'Submission of Grades (College)', date: '2025-10-31', type: 'Academic', description: 'College Department grade submission', color: 'from-blue-400 to-blue-600', isFixed: true },
  { id: 'fixed-28', title: 'Start of Semestral Break', date: '2025-10-31', type: 'Academic', description: 'College & SHS semestral break begins', color: 'from-blue-400 to-blue-600', isFixed: true },
  { id: 'fixed-29', title: 'All Saints Eve & All Saints Day', date: '2025-11-01', type: 'Holiday', description: 'Special Non-Working Holiday', color: 'from-orange-400 to-orange-600', isFixed: true },

  // November 2025
  { id: 'fixed-30', title: 'Submission Deadline Second Quarter Grades', date: '2025-11-10', type: 'Academic', description: 'SHS Department 2nd quarter grades', color: 'from-blue-400 to-blue-600', isFixed: true },
  { id: 'fixed-31', title: 'Parents-Teachers Conference (PTC)', date: '2025-11-13', type: 'Academic', description: 'Releasing of First Semester Cards (SHS)', color: 'from-blue-400 to-blue-600', isFixed: true }
];

// Helper function to format date correctly for Philippines timezone
const formatDateForPH = (year: number, month: number, day: number): string => {
  // Create date in local timezone (Philippines) without UTC conversion
  const localDate = new Date(year, month, day);
  const year_str = localDate.getFullYear().toString();
  const month_str = (localDate.getMonth() + 1).toString().padStart(2, '0');
  const day_str = localDate.getDate().toString().padStart(2, '0');
  return `${year_str}-${month_str}-${day_str}`;
};

// Helper function to get today's date in Philippines timezone
const getTodayPH = (): string => {
  const today = new Date();
  return formatDateForPH(today.getFullYear(), today.getMonth(), today.getDate());
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const Calendar = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayPH());
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [eventForm, setEventForm] = useState<Omit<Activity, "id">>({
    title: "",
    date: selectedDate,
    type: EVENT_TYPES[0].label,
    description: "",
    color: EVENT_TYPES[0].color,
    isCustom: true
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Calendar month/year state
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  // Load events from database and combine with fixed school events
  const loadEvents = async () => {
    setLoading(true);
    try {
      console.log('📅 Loading calendar events...');
      
      // Get current user for proper database access
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      console.log('Current user:', user);
      
      // Get custom events from database
      const { data: customEvents, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        console.error('Database error:', error);
        if (error.code === '42P01' || error.message?.includes('relation "calendar_events" does not exist')) {
          console.log('⚠️ calendar_events table does not exist. Please run SIMPLE_CALENDAR_SETUP.sql');
          toast({
            title: "🔧 Database Setup Required",
            description: "Calendar table not found. Please run SIMPLE_CALENDAR_SETUP.sql in Supabase SQL Editor.",
            variant: "destructive"
          });
        }
      }

      const customActivities: Activity[] = (customEvents || []).map(event => ({
        id: event.id,
        title: event.title,
        date: event.date,
        type: event.type,
        description: event.description || '',
        color: EVENT_TYPES.find(t => t.label === event.type)?.color || EVENT_TYPES[0].color,
        isCustom: true
      }));

      // Combine fixed school events with custom events
      const allEvents = [...FIXED_SCHOOL_EVENTS, ...customActivities];
      
      console.log('✅ Loaded events:', {
        fixed: FIXED_SCHOOL_EVENTS.length,
        custom: customActivities.length,
        total: allEvents.length
      });
      
      setActivities(allEvents);
    } catch (error) {
      console.error('Error loading events:', error);
      // If database fails, at least show fixed events
      setActivities(FIXED_SCHOOL_EVENTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  // Open modal for adding
  const handleAddEvent = (date: string) => {
    setEditMode(false);
    setEventForm({
      title: "",
      date,
      type: EVENT_TYPES[0].label,
      description: "",
      color: EVENT_TYPES[0].color,
      isCustom: true
    });
    setModalOpen(true);
  };

  // Open modal for editing (only for custom events)
  const handleEditEvent = (activity: Activity) => {
    if (activity.isFixed) {
      toast({
        title: "Cannot Edit",
        description: "This is a fixed school calendar event and cannot be modified.",
        variant: "destructive"
      });
      return;
    }
    
    setEditMode(true);
    setEditId(activity.id);
    setEventForm({
      title: activity.title,
      date: activity.date,
      type: activity.type,
      description: activity.description,
      color: activity.color,
      isCustom: activity.isCustom
    });
    setModalOpen(true);
  };

  // Add or update event in database
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.date || !eventForm.type) {
      toast({
        title: "All fields required",
        description: "Please fill in all fields.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      console.log('💾 Saving event:', eventForm);
      console.log('Current user:', user);
      console.log('📅 Date being saved:', eventForm.date, '(Philippines timezone)');
      
      if (editMode && editId !== null) {
        // Update existing event in database
        console.log('🔄 Updating event ID:', editId);
        const { error } = await supabase
          .from('calendar_events')
          .update({
            title: eventForm.title,
            description: eventForm.description,
            date: eventForm.date,
            type: eventForm.type,
            updated_at: new Date().toISOString()
          })
          .eq('id', editId);

        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        
        toast({ title: "✅ Event Updated", description: "The event was updated successfully." });
      } else {
        // Add new event to database
        console.log('➕ Adding new event');
        const { data, error } = await supabase
          .from('calendar_events')
          .insert([{
            title: eventForm.title,
            description: eventForm.description,
            date: eventForm.date,
            type: eventForm.type,
            created_by: user.id || null
          }])
          .select();

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
        
        console.log('✅ Event inserted:', data);
        toast({ title: "✅ Event Added", description: "The event was added successfully." });
      }
      
      // Reload events to show changes
      await loadEvents();
      setModalOpen(false);
      setEditMode(false);
      setEditId(null);
      setEventForm({
        title: "",
        date: "",
        type: EVENT_TYPES[0].label,
        description: "",
        color: EVENT_TYPES[0].color,
        isCustom: false
      });
    } catch (error) {
      console.error('Error saving event:', error);
      
      // More specific error messages
      let errorMessage = "Failed to save event. Please try again.";
      if (error.code === '42P01' || error.message?.includes('relation "calendar_events" does not exist')) {
        errorMessage = "🔧 Calendar table not found. Please run SIMPLE_CALENDAR_SETUP.sql in Supabase SQL Editor first.";
      } else if (error.code === '23505') {
        errorMessage = "An event with this information already exists.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete event from database (only custom events)
  const handleDeleteEvent = async (id: string) => {
    const activity = activities.find(a => a.id === id);
    if (activity?.isFixed) {
      toast({
        title: "Cannot Delete",
        description: "This is a fixed school calendar event and cannot be deleted.",
        variant: "destructive"
      });
      return;
    }

    // Confirm deletion
    if (!confirm("Are you sure you want to delete this event?")) {
      return;
    }

    setLoading(true);
    try {
      console.log('🗑️ Deleting event ID:', id);
      
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      
      console.log('✅ Event deleted successfully');
      toast({ title: "✅ Event Deleted", description: "The event was deleted successfully." });
      
      await loadEvents();
      setModalOpen(false);
    } catch (error) {
      console.error('Error deleting event:', error);
      
      let errorMessage = "Failed to delete event. Please try again.";
      if (error.code === '42P01') {
        errorMessage = "Calendar table not found. Please run the database setup script.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Test database connection
  const testDatabase = async () => {
    try {
      setLoading(true);
      console.log('🔍 Testing database connection...');
      
      const { data, error } = await supabase
        .from('calendar_events')
        .select('count(*)')
        .limit(1);

      if (error) {
        console.error('Database test failed:', error);
        if (error.code === '42P01') {
          toast({
            title: "⚠️ Database Setup Required",
            description: "Please run the SQL script from fix_calendar_table.sql or CALENDAR_SETUP.md",
            variant: "destructive"
          });
        } else {
          toast({
            title: "❌ Database Error",
            description: error.message,
            variant: "destructive"
          });
        }
        return false;
      }

      console.log('✅ Database test successful');
      toast({
        title: "✅ Database OK",
        description: "Calendar database is working properly!"
      });
      return true;
    } catch (error) {
      console.error('Database test error:', error);
      toast({
        title: "❌ Database Test Failed",
        description: "Unable to connect to database",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Filter activities for selected date
  const activitiesForDate = (date: string) => {
    return activities.filter(act => act.date === date);
  };

  // Color for event type
  const getTypeColor = (type: string) => EVENT_TYPES.find(t => t.label === type)?.color || "from-blue-400 to-blue-600";

  // Generate calendar grid with Philippines timezone
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDayOfWeek(year, month);
  const weeks: Array<Array<{ day: number | null; date: string }>> = [];
  let day = 1 - firstDayOfWeek;
  for (let w = 0; w < 6; w++) {
    const week: Array<{ day: number | null; date: string }> = [];
    for (let d = 0; d < 7; d++) {
      if (day > 0 && day <= daysInMonth) {
        // Use Philippines timezone formatting instead of UTC
        const dateStr = formatDateForPH(year, month, day);
        week.push({ day, date: dateStr });
      } else {
        week.push({ day: null, date: "" });
      }
      day++;
    }
    weeks.push(week);
  }

  return (
    <div className="flex h-screen bg-white">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 flex flex-col h-screen p-0 m-0">
        <header className="bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                <CalendarIcon className="w-8 h-8" />
                Calendar
              </h1>
              <p className="text-blue-100 text-sm mt-1">School Event Calendar</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                onClick={loadEvents}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                onClick={testDatabase}
                disabled={loading}
              >
                🔍 Test DB
              </Button>
              <Button
                className="bg-white text-blue-600 hover:bg-gray-100"
                onClick={() => handleAddEvent(selectedDate)}
                disabled={loading}
              >
                <Plus className="w-4 h-4 mr-1" /> Add Event
              </Button>
            </div>
          </div>
        </header>
        <section className="flex-1 flex flex-col items-center justify-start bg-white p-4">
          {/* Month/Year Controls */}
          <div className="flex items-center justify-between w-full max-w-3xl mb-2">
            <Button variant="ghost" onClick={() => {
              if (month === 0) {
                setMonth(11);
                setYear(year - 1);
              } else {
                setMonth(month - 1);
              }
            }}>
              &lt;
            </Button>
            <div className="font-bold text-xl text-blue-700">
              {new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" })}
            </div>
            <Button variant="ghost" onClick={() => {
              if (month === 11) {
                setMonth(0);
                setYear(year + 1);
              } else {
                setMonth(month + 1);
              }
            }}>
              &gt;
            </Button>
          </div>
          {/* Calendar Grid */}
          <div className="w-full max-w-5xl bg-white rounded-lg shadow border">
            <table className="w-full table-fixed">
              <thead>
                <tr className="bg-gradient-to-r from-blue-500 to-violet-500 text-white">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <th key={d} className="py-3 text-center text-sm font-medium">{d}</th>
                  ))}
                </tr>
              </thead>
             <tbody>
            {weeks.map((week, wi) => (
                <tr key={wi}>
                {week.map((cell, ci) => (
                    <td
                    key={ci}
                    className="align-top h-16 border border-gray-200 relative cursor-pointer group hover:bg-blue-50 transition-colors p-1"
                    onClick={() => cell.day && setSelectedDate(cell.date)}
                    style={{
                        background: cell.date === selectedDate ? "#dbeafe" : "transparent",
                        width: "14.28%"
                    }}
                    >
                    {cell.day && (
                        <div className="font-semibold text-xs text-gray-800 mb-1">
                        {cell.day}
                        </div>
                    )}
                        {/* Events */}
                        <div className="flex flex-col gap-0.5">
                          {cell.day &&
                            activities
                              .filter(act => act.date === cell.date)
                              .slice(0, 2) // Limit to 2 events per cell to fit
                              .map(act => (
                                <div
                                  key={act.id}
                                  className={`rounded px-1 py-0.5 text-xs text-white cursor-pointer bg-gradient-to-r ${getTypeColor(act.type)} flex items-center gap-1 truncate`}
                                  title={`${act.title} - ${act.description} ${act.isFixed ? '(School Event)' : '(Custom Event)'}`}
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleEditEvent(act);
                                  }}
                                >
                                  {act.isFixed && <School className="w-2 h-2 flex-shrink-0" />}
                                  <span className="truncate text-xs">{act.title.substring(0, 12)}...</span>
                                </div>
                              ))}
                          {/* Show count if more events */}
                          {cell.day && activities.filter(act => act.date === cell.date).length > 2 && (
                            <div className="text-xs text-gray-500 text-center">
                              +{activities.filter(act => act.date === cell.date).length - 2} more
                            </div>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Events for selected date */}
          <div className="w-full max-w-5xl mt-4">
            <h2 className="text-xl font-semibold mb-2 text-blue-700 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Events on {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h2>
            {activitiesForDate(selectedDate).length === 0 && (
              <div className="text-gray-400 p-4 border rounded-lg text-center">
                <CalendarIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                No events for this day.
                <Button
                  size="sm"
                  className="mt-2 ml-2"
                  onClick={() => handleAddEvent(selectedDate)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Event
                </Button>
              </div>
            )}
            {activitiesForDate(selectedDate).map(act => (
              <div
                key={act.id}
                className={`rounded-lg p-3 mb-2 bg-gradient-to-r ${getTypeColor(act.type)} text-white shadow flex flex-col gap-1 relative`}
              >
                {act.isFixed && (
                  <div className="absolute top-2 right-2">
                    <School className="w-4 h-4 text-white/70" />
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      {act.title}
                      {act.isFixed && <span className="text-xs bg-white/20 px-2 py-1 rounded">School Event</span>}
                    </div>
                    <div className="text-xs">{act.type}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-white hover:bg-white/20"
                      onClick={() => handleEditEvent(act)}
                      aria-label={act.isFixed ? "View Details" : "Edit"}
                      disabled={act.isFixed}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {!act.isFixed && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-white hover:bg-white/20"
                        onClick={() => handleDeleteEvent(act.id)}
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="text-xs">{act.description}</div>
                {act.isFixed && (
                  <div className="text-xs bg-white/10 rounded px-2 py-1 mt-1">
                    📚 This is an official school event and cannot be modified
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Modal for Add/Edit Event */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
              onClick={() => setModalOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">{editMode ? "Edit Event" : "Add Event"}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label htmlFor="event-title">Title</Label>
                <Input
                  id="event-title"
                  value={eventForm.title}
                  onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="event-date">Date (Philippines timezone)</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={eventForm.date}
                  onChange={e => {
                    console.log('📅 Date input changed:', e.target.value);
                    setEventForm(f => ({ ...f, date: e.target.value }));
                  }}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Date will be saved as: {eventForm.date}
                </p>
              </div>
              <div>
                <Label htmlFor="event-type">Type</Label>
                <select
                  id="event-type"
                  value={eventForm.type}
                  onChange={e => {
                    const type = e.target.value;
                    const color = EVENT_TYPES.find(t => t.label === type)?.color || EVENT_TYPES[0].color;
                    setEventForm(f => ({ ...f, type, color }));
                  }}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  {EVENT_TYPES.map(t => (
                    <option key={t.label} value={t.label}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="event-description">Description</Label>
                <Input
                  id="event-description"
                  value={eventForm.description}
                  onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 mt-2">
                <Button 
                  type="submit" 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? "Saving..." : (editMode ? "Update Event" : "Add Event")}
                </Button>
                {editMode && (
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => editId && handleDeleteEvent(editId)}
                    disabled={loading}
                  >
                    Delete Event
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;