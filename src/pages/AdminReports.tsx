import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileText, 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  User,
  Send,
  ArrowLeft
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";

interface Report {
  id: string;
  reporter_id: string;
  title: string;
  description: string;
  report_type: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  admin_response?: string;
  related_event_id?: string;
  created_at: string;
  reporter_name?: string;
}

interface ReportMessage {
  id: string;
  message: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  created_at: string;
}

const AdminReports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [messages, setMessages] = useState<ReportMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Check if user is admin
      if (parsedUser.role !== "admin") {
        navigate("/login");
      }
    } else {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    if (user?.id) {
      loadReports();
    }
  }, [user]);

  const loadReports = async () => {
    try {
      // Try simple query first
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Simple query failed:', error);
        // If simple query fails, table might not exist
        if (error.message.includes('relation "reports" does not exist')) {
          toast({
            title: "Database Setup Required",
            description: "Reports table not found. Please run the database setup script first.",
            variant: "destructive"
          });
          setReports([]);
          return;
        }
        throw error;
      }
      
      // If simple query works, try to get reporter names
      let formattedReports: Report[] = [];
      
      if (data && data.length > 0) {
        try {
          // Try to get user names for each report
          const userIds = [...new Set(data.map(r => r.reporter_id))];
          const { data: users } = await supabase
            .from('users')
            .select('id, name')
            .in('id', userIds);
          
          const userMap = new Map();
          users?.forEach(user => userMap.set(user.id, user.name));
          
          formattedReports = data.map(report => ({
            ...report,
            reporter_name: userMap.get(report.reporter_id) || 'Unknown User'
          }));
        } catch (userError) {
          console.log('Could not load user names, using fallback');
          formattedReports = data.map(report => ({
            ...report,
            reporter_name: 'User'
          }));
        }
      }
      
      setReports(formattedReports);
      console.log('Reports loaded successfully:', formattedReports);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast({
        title: "Error",
        description: "Failed to load reports. Please check if the database tables exist.",
        variant: "destructive"
      });
      setReports([]);
    }
  };

  const loadMessages = async (reportId: string) => {
    try {
      // Try simple query first
      const { data, error } = await supabase
        .from('report_messages')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Messages query failed:', error);
        setMessages([]);
        return;
      }
      
      // Try to get sender names
      let formattedMessages: ReportMessage[] = [];
      
      if (data && data.length > 0) {
        try {
          const senderIds = [...new Set(data.map(m => m.sender_id))];
          const { data: users } = await supabase
            .from('users')
            .select('id, name, role')
            .in('id', senderIds);
          
          const userMap = new Map();
          users?.forEach(user => userMap.set(user.id, { name: user.name, role: user.role }));
          
          formattedMessages = data.map(msg => {
            const userInfo = userMap.get(msg.sender_id) || { name: 'Unknown', role: 'user' };
            return {
              id: msg.id,
              message: msg.message,
              sender_id: msg.sender_id,
              sender_name: userInfo.name,
              sender_role: userInfo.role,
              created_at: msg.created_at
            };
          });
        } catch (userError) {
          console.log('Could not load sender names, using fallback');
          formattedMessages = data.map(msg => ({
            id: msg.id,
            message: msg.message,
            sender_id: msg.sender_id,
            sender_name: msg.sender_id === user?.id ? 'Admin' : 'Participant',
            sender_role: msg.sender_id === user?.id ? 'admin' : 'participant',
            created_at: msg.created_at
          }));
        }
      }
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  };

  const handleSendMessage = async () => {
    if (!user?.id || !selectedReport || !newMessage.trim()) return;

    try {
      setLoading(true);
      
      await supabase
        .from('report_messages')
        .insert([{
          report_id: selectedReport.id,
          sender_id: user.id,
          message: newMessage
        }]);

      // Update report status to in_progress if it was open
      if (selectedReport.status === 'open') {
        await supabase
          .from('reports')
          .update({ status: 'in_progress' })
          .eq('id', selectedReport.id);
        
        // Update local state
        setSelectedReport({ ...selectedReport, status: 'in_progress' });
        setReports(reports.map(r => 
          r.id === selectedReport.id ? { ...r, status: 'in_progress' } : r
        ));
      }

      setNewMessage("");
      await loadMessages(selectedReport.id);
      
      toast({
        title: "Message Sent",
        description: "Your response has been sent to the participant.",
      });
    } catch (error) {
      console.error('Send message error:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: "resolved" | "closed") => {
    if (!selectedReport) return;

    try {
      await supabase
        .from('reports')
        .update({ status })
        .eq('id', selectedReport.id);

      // Create notification for participant
      await supabase
        .from('notifications')
        .insert([{
          user_id: selectedReport.reporter_id,
          title: `Report ${status === 'resolved' ? 'Resolved' : 'Closed'}`,
          message: `Your report "${selectedReport.title}" has been ${status}. Thank you for your feedback.`,
          type: "announcement"
        }]);

      // Update local state
      setSelectedReport({ ...selectedReport, status });
      setReports(reports.map(r => 
        r.id === selectedReport.id ? { ...r, status } : r
      ));

      toast({
        title: "Status Updated",
        description: `Report has been marked as ${status}. Participant has been notified.`,
      });
    } catch (error) {
      console.error('Update status error:', error);
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "resolved":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "closed":
        return <CheckCircle className="w-4 h-4 text-gray-600" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
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
              <Button 
                variant="ghost" 
                onClick={() => navigate("/dashboard")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </Button>
              <div>
                <h1 className="text-xl font-bold gradient-primary bg-clip-text text-transparent">
                  Participant Feedback & Reports
                </h1>
                <p className="text-sm text-muted-foreground">Manage participant complaints, feedback, and technical issues</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">{user.name}</span>
              <Badge variant="secondary">Admin</Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Reports List */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>All Feedback & Reports</CardTitle>
              <CardDescription>
                Participant complaints, feedback, suggestions, and technical issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {reports.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No reports yet</h3>
                    <p className="text-muted-foreground">
                      Participant reports will appear here
                    </p>
                  </div>
                ) : (
                  reports.map((report) => (
                    <Card 
                      key={report.id} 
                      className={`cursor-pointer transition-colors hover:border-primary/50 ${
                        selectedReport?.id === report.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => {
                        setSelectedReport(report);
                        loadMessages(report.id);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm">{report.title}</h4>
                          <Badge className={getStatusColor(report.status)}>
                            {report.status}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          {getStatusIcon(report.status)}
                          <span className="text-xs text-muted-foreground">
                            {report.report_type}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          By: {report.reporter_name}
                        </p>
                        <p className="text-sm line-clamp-2 mb-2">
                          {report.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(report.created_at)}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chat Interface */}
          <Card className="card-elevated">
            {selectedReport ? (
              <>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{selectedReport.title}</CardTitle>
                      <CardDescription>
                        {selectedReport.report_type} • By {selectedReport.reporter_name}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(selectedReport.status)}>
                        {selectedReport.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    {selectedReport.status !== 'resolved' && selectedReport.status !== 'closed' && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUpdateStatus('resolved')}
                        >
                          Mark Resolved
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUpdateStatus('closed')}
                        >
                          Close Report
                        </Button>
                      </>
                    )}
                  </div>
                </CardHeader>
                
                {/* Messages */}
                <CardContent className="flex-1 overflow-y-auto space-y-3 max-h-64">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs rounded-lg p-3 ${
                          message.sender_id === user?.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-medium">
                            {message.sender_name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {message.sender_role}
                          </Badge>
                        </div>
                        <p className="text-sm">{message.message}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {formatDateTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
                
                {/* Message Input */}
                {selectedReport.status !== 'closed' && (
                  <div className="p-4 border-t">
                    <div className="flex items-center space-x-2">
                      <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your response..."
                        className="flex-1"
                        rows={2}
                      />
                      <Button 
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || loading}
                        size="sm"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-96 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Select a Report</h3>
                  <p className="text-muted-foreground">
                    Choose a report from the left to start responding
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminReports;