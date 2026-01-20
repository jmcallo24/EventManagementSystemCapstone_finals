import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar,
  Award,
  Activity,
  PieChart,
  Download,
  ArrowLeft,
  RefreshCw,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/Sidebar";

interface AnalyticsData {
  totalEvents: number;
  totalParticipants: number;
  totalRegistrations: number;
  eventsByType: { [key: string]: number };
  eventsByStatus: { [key: string]: number };
  registrationsByMonth: { [key: string]: number };
  topEvents: Array<{
    id: string;
    title: string;
    participants: number;
    type: string;
    date: string;
  }>;
  userGrowth: { [key: string]: number };
  attendanceRate: number;
  popularEventTypes: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
}

const AdminAnalytics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalEvents: 0,
    totalParticipants: 0,
    totalRegistrations: 0,
    eventsByType: {},
    eventsByStatus: {},
    registrationsByMonth: {},
    topEvents: [],
    userGrowth: {},
    attendanceRate: 0,
    popularEventTypes: []
  });
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState("6months"); // 1month, 3months, 6months, 1year

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      if (parsedUser.role !== "admin") {
        navigate("/dashboard");
      }
    } else {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    if (user?.id) {
      loadAnalytics();
    }
  }, [user, timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      console.log('📊 Loading REAL analytics data...');
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case "1month":
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case "3months":
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case "6months":
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case "1year":
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // 1. Get all events from both tables
      const [{ data: eventsData }, { data: eventRequestsData }] = await Promise.all([
        supabase
          .from('events')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        supabase
          .from('event_requests')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
      ]);

      const allEvents = [...(eventsData || []), ...(eventRequestsData || [])];
      console.log('📅 Total events found:', allEvents.length);

      // 2. Get all registrations
      const { data: registrations, error: regError } = await supabase
        .from('event_registrations')
        .select('*')
        .gte('registration_date', startDate.toISOString())
        .lte('registration_date', endDate.toISOString());

      if (regError) console.log('Registrations query error:', regError);
      console.log('👥 Total registrations:', registrations?.length || 0);

      // 3. Get all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (usersError) console.log('Users query error:', usersError);
      console.log('👤 Total users:', users?.length || 0);

      // 4. Calculate analytics
      const analyticsData: AnalyticsData = {
        totalEvents: allEvents.length,
        totalParticipants: users?.length || 0,
        totalRegistrations: registrations?.length || 0,
        eventsByType: {},
        eventsByStatus: {},
        registrationsByMonth: {},
        topEvents: [],
        userGrowth: {},
        attendanceRate: 0,
        popularEventTypes: []
      };

      // Events by type
      allEvents.forEach(event => {
        const type = event.event_type || 'Other';
        analyticsData.eventsByType[type] = (analyticsData.eventsByType[type] || 0) + 1;
      });

      // Events by status
      allEvents.forEach(event => {
        const status = event.status || 'pending';
        analyticsData.eventsByStatus[status] = (analyticsData.eventsByStatus[status] || 0) + 1;
      });

      // Registrations by month
      (registrations || []).forEach(reg => {
        const monthKey = new Date(reg.registration_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
        analyticsData.registrationsByMonth[monthKey] = (analyticsData.registrationsByMonth[monthKey] || 0) + 1;
      });

      // User growth by month
      (users || []).forEach(user => {
        const monthKey = new Date(user.created_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
        analyticsData.userGrowth[monthKey] = (analyticsData.userGrowth[monthKey] || 0) + 1;
      });

      // Top events (events with most registrations)
      const eventRegistrationCounts = new Map();
      (registrations || []).forEach(reg => {
        const count = eventRegistrationCounts.get(reg.event_id) || 0;
        eventRegistrationCounts.set(reg.event_id, count + 1);
      });

      const topEvents = Array.from(eventRegistrationCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([eventId, count]) => {
          const event = allEvents.find(e => e.id === eventId);
          return {
            id: eventId,
            title: event?.title || 'Unknown Event',
            participants: count,
            type: event?.event_type || 'Other',
            date: event?.date || new Date().toISOString()
          };
        });

      analyticsData.topEvents = topEvents;

      // Popular event types with percentages
      const totalEventTypes = Object.values(analyticsData.eventsByType).reduce((a, b) => a + b, 0);
      analyticsData.popularEventTypes = Object.entries(analyticsData.eventsByType)
        .map(([type, count]) => ({
          type,
          count,
          percentage: totalEventTypes > 0 ? Math.round((count / totalEventTypes) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count);

      // Attendance rate (assuming attendance_status 'attended' means they attended)
      const attendedCount = (registrations || []).filter(reg => reg.attendance_status === 'attended').length;
      analyticsData.attendanceRate = registrations?.length > 0 
        ? Math.round((attendedCount / registrations.length) * 100) 
        : 0;

      console.log('✅ Analytics calculated:', analyticsData);
      setAnalytics(analyticsData);

    } catch (error) {
      console.error('❌ Error loading analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      toast({
        title: "📊 Exporting Data",
        description: "Preparing analytics report..."
      });
      
      // Create CSV data
      const csvData = [
        ['Metric', 'Value'],
        ['Total Events', analytics.totalEvents.toString()],
        ['Total Participants', analytics.totalParticipants.toString()],
        ['Total Registrations', analytics.totalRegistrations.toString()],
        ['Attendance Rate', `${analytics.attendanceRate}%`],
        [''],
        ['Events by Type', ''],
        ...Object.entries(analytics.eventsByType).map(([type, count]) => [type, count.toString()]),
        [''],
        ['Events by Status', ''],
        ...Object.entries(analytics.eventsByStatus).map(([status, count]) => [status, count.toString()]),
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "✅ Export Complete",
        description: "Analytics report downloaded successfully"
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not export analytics data",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    const colors = {
      'Academic': 'bg-blue-100 text-blue-800',
      'Sports': 'bg-green-100 text-green-800',
      'Cultural': 'bg-pink-100 text-pink-800',
      'Research': 'bg-purple-100 text-purple-800',
      'Examination': 'bg-red-100 text-red-800',
      'Holiday': 'bg-orange-100 text-orange-800',
      'Other': 'bg-gray-100 text-gray-800'
    };
    return colors[type as keyof typeof colors] || colors['Other'];
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-white">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      
      <main className="flex-1 flex flex-col h-screen overflow-auto">
        {/* Header */}
        <header className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-8 h-8" />
              Reports & Analytics
            </h1>
            <p className="text-indigo-100 text-sm">Real-time insights from your event management system</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-white/20 text-white border-white/30 rounded px-3 py-1 text-sm"
            >
              <option value="1month">Last Month</option>
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="1year">Last Year</option>
            </select>
            <Button
              onClick={loadAnalytics}
              disabled={loading}
              className="bg-white/20 text-white border-2 border-white/50 hover:bg-white/30 backdrop-blur-sm font-medium shadow-lg"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={exportData}
              className="bg-white text-indigo-600 hover:bg-gray-100"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </header>

        <div className="flex-1 p-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Total Events</p>
                    <p className="text-3xl font-bold">{loading ? "..." : analytics.totalEvents}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Total Participants</p>
                    <p className="text-3xl font-bold">{loading ? "..." : analytics.totalParticipants}</p>
                  </div>
                  <Users className="w-8 h-8 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Total Registrations</p>
                    <p className="text-3xl font-bold">{loading ? "..." : analytics.totalRegistrations}</p>
                  </div>
                  <Activity className="w-8 h-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm">Attendance Rate</p>
                    <p className="text-3xl font-bold">{loading ? "..." : analytics.attendanceRate}%</p>
                  </div>
                  <Award className="w-8 h-8 text-orange-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Events by Type */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Events by Type
                </CardTitle>
                <CardDescription>Distribution of event types in your system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.popularEventTypes.map((item, index) => (
                    <div key={item.type} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded ${index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-green-500' : index === 2 ? 'bg-purple-500' : 'bg-gray-400'}`}></div>
                        <span className="font-medium">{item.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{item.count} events</span>
                        <Badge variant="outline">{item.percentage}%</Badge>
                      </div>
                    </div>
                  ))}
                  {analytics.popularEventTypes.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      No event type data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Events by Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Event Status Overview
                </CardTitle>
                <CardDescription>Current status of all events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.eventsByStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(status)}
                        <span className="font-medium capitalize">{status}</span>
                      </div>
                      <Badge variant="outline">{count} events</Badge>
                    </div>
                  ))}
                  {Object.keys(analytics.eventsByStatus).length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      No status data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Events */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Top Performing Events
              </CardTitle>
              <CardDescription>Events with the highest participant registration</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.topEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">No event data yet</h3>
                  <p className="text-gray-500">Events with registrations will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {analytics.topEvents.map((event, index) => (
                    <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium">{event.title}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(event.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getTypeColor(event.type)}>{event.type}</Badge>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{event.participants}</p>
                          <p className="text-xs text-gray-500">participants</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Growth Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Registration Growth */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Registration Growth
                </CardTitle>
                <CardDescription>Monthly registration trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.registrationsByMonth).map(([month, count]) => (
                    <div key={month} className="flex items-center justify-between">
                      <span className="font-medium">{month}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ 
                              width: `${Math.min((count / Math.max(...Object.values(analytics.registrationsByMonth))) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    </div>
                  ))}
                  {Object.keys(analytics.registrationsByMonth).length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      No registration data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* User Growth */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Growth
                </CardTitle>
                <CardDescription>New user registrations by month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.userGrowth).map(([month, count]) => (
                    <div key={month} className="flex items-center justify-between">
                      <span className="font-medium">{month}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ 
                              width: `${Math.min((count / Math.max(...Object.values(analytics.userGrowth))) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    </div>
                  ))}
                  {Object.keys(analytics.userGrowth).length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      No user growth data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminAnalytics;