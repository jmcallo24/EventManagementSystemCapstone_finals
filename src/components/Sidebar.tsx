import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Calendar, 
  Bell, 
  Users, 
  MapPin, 
  Workflow, 
  Image, 
  CheckSquare, 
  MessageCircle, 
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CalendarDays
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logo from "@/assets/image.png";
import { getUnreadCount } from "@/lib/notificationService";

const sidebarItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Calendar of Activities", url: "/calendar", icon: Calendar },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Participants", url: "/participants", icon: Users },
  { title: "Venue & Registration", url: "/venue", icon: MapPin },
  { title: "Program Flow", url: "/program", icon: Workflow },
  { title: "Multimedia", url: "/multimedia", icon: Image },
  { title: "Approvals", url: "/approvals", icon: CheckSquare },
  { title: "Feedback", url: "/feedback", icon: MessageCircle },
  { title: "Reports & Analytics", url: "/reports", icon: BarChart3 },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

interface NavigationItem {
  title: string;
  url: string;
  icon: any;
  badge?: number;
  tab?: string;
}


// ...existing imports...


const Sidebar = ({ collapsed, onToggle, activeTab, onTabChange }: SidebarProps) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const [showConfirm, setShowConfirm] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Get current user
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Load unread notification count
  useEffect(() => {
    const loadUnreadCount = async () => {
      if (user?.id) {
        const count = await getUnreadCount(user.id);
        setUnreadCount(count);
      }
    };

    loadUnreadCount();

    // Refresh count every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const isActive = (path: string) => currentPath === path;

  // Determine user role based on current URL and user data
  const isAdmin = user?.role === 'admin' || 
                  currentPath.includes('/dashboard') || 
                  currentPath.includes('/calendar') || 
                  currentPath.includes('/notifications') || 
                  currentPath.includes('/participants') || 
                  currentPath.includes('/venue') || 
                  currentPath.includes('/program') || 
                  currentPath.includes('/multimedia') || 
                  currentPath.includes('/approvals') || 
                  currentPath.includes('/feedback') || 
                  currentPath.includes('/reports');
  const isParticipant = currentPath.includes('/participant-dashboard') || user?.role === 'participant';
  
  // Dynamic navigation based on user role
  let navigationItems;
  
  if (isParticipant) {
    // Participant-specific navigation
    navigationItems = [
      { title: "Dashboard", url: "/participant-dashboard", icon: LayoutDashboard, tab: "dashboard" },
      { title: "Calendar", url: "/participant-dashboard", icon: Calendar, tab: "calendar" },
      { title: "Events", url: "/participant-dashboard", icon: CalendarDays, tab: "events" },
      { title: "Multimedia", url: "/participant-dashboard", icon: Image, tab: "multimedia" },
      { title: "Program Flow", url: "/participant-dashboard", icon: Workflow, tab: "program" },
      { 
        title: "Notifications", 
        url: "/participant-dashboard", 
        icon: Bell,
        badge: unreadCount > 0 ? unreadCount : undefined,
        tab: "notifications"
      },
      { title: "Help Support", url: "/participant-dashboard", icon: MessageCircle, tab: "reports" },
    ];
  } else {
    if (isAdmin) {
      // ADMIN navigation - ORIGINAL FULL VERSION
      navigationItems = [
        { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
        { title: "Calendar of Activities", url: "/calendar", icon: Calendar },
        { title: "Notifications", url: "/notifications", icon: Bell },
        { title: "Participants", url: "/participants", icon: Users },
        { title: "Venue & Registration", url: "/venue", icon: MapPin },
        { title: "Program Flow", url: "/program", icon: Workflow },
        { title: "Multimedia", url: "/multimedia", icon: Image },
        { title: "Approvals", url: "/approvals", icon: CheckSquare },
        { title: "Feedback", url: "/feedback", icon: MessageCircle },
        { title: "Reports", url: "/reports", icon: BarChart3 },
      ];
    } else {
      // ORGANIZER navigation - tabbed structure
      navigationItems = [
        { title: "Dashboard", url: "/organizer-dashboard", icon: LayoutDashboard, tab: "dashboard" },
        { title: "Calendar of Activities", url: "/organizer-dashboard", icon: Calendar, tab: "calendar" },
        { title: "Events", url: "/organizer-dashboard", icon: CalendarDays, tab: "events" },
        { title: "Venue Registration", url: "/organizer-dashboard", icon: MapPin, tab: "venue" },
        { title: "Multimedia", url: "/organizer-dashboard", icon: Image, tab: "multimedia" },
        { title: "Help Support", url: "/organizer-dashboard", icon: BarChart3, tab: "reports" },
        { title: "Program Flow", url: "/organizer-dashboard", icon: Workflow, tab: "program" },
      ];
    }
  }

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <div className={cn(
      "h-screen bg-white border-r border-border transition-all duration-300 flex flex-col text-foreground",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100">
                <img src={logo} alt="Logo" className="w-12 h-12 object-contain rounded-xl shadow" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Event Manager</h2>
                <p className="text-xs text-muted-foreground">School Events</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="p-2 hover:bg-muted"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-2">
        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const handleClick = (e: React.MouseEvent) => {
              if (item.tab && onTabChange) {
                e.preventDefault();
                onTabChange(item.tab);
              }
            };

            const isItemActive = item.tab 
              ? activeTab === item.tab 
              : isActive(item.url);

            return (
              <NavLink
                key={item.title}
                to={item.url}
                onClick={handleClick}
                className={cn(
                  "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors relative",
                  isItemActive
                    ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-sm"
                    : "text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-blue-400 hover:to-violet-500",
                  collapsed ? "justify-center" : "justify-start"
                )}
              >
                <div className="relative">
                  <item.icon className={cn("w-5 h-5", !collapsed && "mr-3")} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center min-w-[20px] text-[10px] font-bold">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <div className="flex items-center justify-between w-full">
                    <span>{item.title}</span>
                    {item.badge && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        {!collapsed && (
          <div>
            <Button
              variant="outline"
              className="w-full mb-3 bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0 hover:from-blue-600 hover:to-violet-600"
              onClick={() => setShowConfirm(true)}
            >
              Log out
            </Button>
            {showConfirm && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-xs w-full text-center">
                  <p className="mb-4 text-foreground font-semibold">Are you sure you want to log out?</p>
                  <div className="flex justify-center gap-4">
                    <Button
                      variant="destructive"
                      onClick={handleLogout}
                      className="w-24"
                    >
                      Yes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowConfirm(false)}
                      className="w-24"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <div className="text-xs text-gray-400">
              <p>Version 1.0.0</p>
              <p>© 2025 Event Manager</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;