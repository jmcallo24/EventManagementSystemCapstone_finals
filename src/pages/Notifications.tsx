import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, UserPlus, Calendar, AlertCircle, MessageCircle, FileText, Users, RefreshCw, Send, Plus, Megaphone } from "lucide-react";
import { getNotifications, markAsRead, markAllAsRead, createNotification, createBroadcastNotification, type Notification } from "@/lib/notificationService";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "event_request":
      return <Calendar className="w-5 h-5 text-blue-600" />;
    case "event_approved":
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    case "event_rejected":
      return <AlertCircle className="w-5 h-5 text-red-600" />;
    case "registration":
      return <UserPlus className="w-5 h-5 text-purple-600" />;
    case "participant_joined":
      return <Users className="w-5 h-5 text-blue-600" />;
    case "announcement":
      return <Bell className="w-5 h-5 text-orange-600" />;
    case "report_update":
      return <FileText className="w-5 h-5 text-gray-600" />;
    default:
      return <Bell className="w-5 h-5 text-gray-600" />;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case "event_request":
      return "bg-blue-50 border-blue-200";
    case "event_approved":
      return "bg-green-50 border-green-200";
    case "event_rejected":
      return "bg-red-50 border-red-200";
    case "registration":
      return "bg-purple-50 border-purple-200";
    case "participant_joined":
      return "bg-blue-50 border-blue-200";
    case "announcement":
      return "bg-orange-50 border-orange-200";
    case "report_update":
      return "bg-gray-50 border-gray-200";
    default:
      return "bg-gray-50 border-gray-200";
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} days ago`;
  
  return date.toLocaleDateString();
};

const Notifications = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    type: 'announcement' as Notification['type'],
    isBroadcast: true
  });
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  // Get current user
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const loadNotifications = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setRefreshing(true);
      const data = await getNotifications(user.id);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user?.id]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const success = await markAsRead(notificationId);
      if (success) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, is_read: true }
              : notif
          )
        );
        toast({
          title: "Success",
          description: "Notification marked as read"
        });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive"
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const success = await markAllAsRead(user.id);
      if (success) {
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, is_read: true }))
        );
        toast({
          title: "Success",
          description: "All notifications marked as read"
        });
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive"
      });
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const isAdmin = user?.role === 'admin';

  const handleCreateNotification = async () => {
    if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    try {
      let success = false;
      
      if (notificationForm.isBroadcast) {
        success = await createBroadcastNotification(
          notificationForm.title,
          notificationForm.message,
          notificationForm.type
        );
      } else {
        // For now, we'll create for the current user as example
        success = await createNotification(
          user.id,
          notificationForm.title,
          notificationForm.message,
          notificationForm.type
        );
      }

      if (success) {
        toast({
          title: "Success",
          description: `Notification ${notificationForm.isBroadcast ? 'broadcast' : 'created'} successfully!`
        });
        setNotificationForm({
          title: '',
          message: '',
          type: 'announcement',
          isBroadcast: true
        });
        setShowCreateForm(false);
        await loadNotifications(); // Refresh notifications
      } else {
        throw new Error('Failed to create notification');
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      toast({
        title: "Error",
        description: "Failed to create notification",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };



  return (
    <div className="flex h-screen w-screen bg-white overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 flex flex-col h-screen w-full p-0 m-0">
        <header className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Bell className="w-8 h-8" />
              Notifications
            </h1>
            <p className="text-purple-100 text-sm">
              Stay updated with your events and activities
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button
                variant="secondary"
                onClick={() => setShowCreateForm(true)}
                className="bg-white/20 text-white border-white/30 hover:bg-white/30"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Notification
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={loadNotifications}
              disabled={refreshing}
              className="bg-white/20 text-white border-white/30 hover:bg-white/30"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="secondary"
                onClick={handleMarkAllAsRead}
                className="bg-white/20 text-white border-white/30 hover:bg-white/30"
              >
                Mark All Read
              </Button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Bell className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="text-xl font-semibold">{notifications.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Unread</p>
                      <p className="text-xl font-semibold">{unreadCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Read</p>
                      <p className="text-xl font-semibold">{notifications.length - unreadCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Create Notification Modal */}
            {showCreateForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Megaphone className="w-5 h-5 text-purple-600" />
                      Create Notification
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCreateForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <Input
                        placeholder="Enter notification title..."
                        value={notificationForm.title}
                        onChange={(e) => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                      <Textarea
                        placeholder="Enter notification message..."
                        rows={3}
                        value={notificationForm.message}
                        onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <Select
                        value={notificationForm.type}
                        onValueChange={(value) => setNotificationForm(prev => ({ ...prev, type: value as Notification['type'] }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="announcement">📢 Announcement</SelectItem>
                          <SelectItem value="event_request">📅 Event Request</SelectItem>
                          <SelectItem value="registration">👥 Registration</SelectItem>
                          <SelectItem value="report_update">📊 Report Update</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="broadcast"
                        checked={notificationForm.isBroadcast}
                        onChange={(e) => setNotificationForm(prev => ({ ...prev, isBroadcast: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="broadcast" className="text-sm text-gray-700">
                        📡 Broadcast to all users
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button
                      onClick={handleCreateNotification}
                      disabled={creating}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
                    >
                      {creating ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          {notificationForm.isBroadcast ? 'Broadcast' : 'Send'}
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateForm(false)}
                      disabled={creating}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications List */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Notifications</CardTitle>
                <CardDescription>
                  Your latest updates and announcements
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-gray-400" />
                    <p className="text-gray-500">Loading notifications...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2 text-gray-900">No notifications yet</h3>
                    <p className="text-gray-500 mb-4">
                      You'll see updates about your events and activities here
                    </p>
                    <Button variant="outline" onClick={loadNotifications}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Check for Updates
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`border rounded-lg p-4 transition-all hover:shadow-md cursor-pointer ${
                          notification.is_read 
                            ? 'bg-white border-gray-200' 
                            : `${getNotificationColor(notification.type)} shadow-sm`
                        }`}
                        onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full ${
                            notification.is_read ? 'bg-gray-100' : 'bg-white'
                          }`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className={`font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                                {notification.title}
                              </h4>
                              <div className="flex items-center gap-2">
                                <Badge variant={notification.is_read ? "secondary" : "default"}>
                                  {notification.type.replace('_', ' ')}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {formatDate(notification.created_at)}
                                </span>
                                {!notification.is_read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600">{notification.message}</p>
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notification.id);
                                }}
                              >
                                Mark as read
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Notifications;