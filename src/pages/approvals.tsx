import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { CheckCircle2, XCircle, Eye, Download } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import Sidebar from "../components/Sidebar";
import { autoCreateNotifications } from "@/lib/notificationService";
import { useToast } from "@/hooks/use-toast";

interface EventRequest {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  expected_participants: number;
  status: "pending" | "approved" | "rejected";
  requester_name: string;
  requester_id: string;
  created_at: string;
  event_type: string;
  budget_estimate?: number;
  request_reason?: string;
  requirements?: string;
  admin_comments?: string;
  form_data?: any;
}

const Approvals: React.FC = () => {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [requests, setRequests] = useState<EventRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<EventRequest | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [adminComments, setAdminComments] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState<EventRequest | null>(null);

  useEffect(() => {
    // Load user data
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
    
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("event_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      // Find the request to get user info
      const request = requests.find(r => r.id === id);
      if (!request) return;

      const { error } = await supabase
        .from("event_requests")
        .update({ status: "approved" })
        .eq("id", id);

      if (error) throw error;

      // Create REAL notification for the user who submitted the request
      try {
        await autoCreateNotifications.eventApproved(
          String(id),
          request.requester_id,
          request.title
        );
        console.log('✅ APPROVAL NOTIFICATION: Sent to user who requested event');
      } catch (notifError) {
        console.log('Approval notification failed (non-critical):', notifError);
      }

      await fetchRequests();
      
      toast({
        title: "✅ Event Approved!",
        description: `"${request.title}" has been approved and the organizer has been notified.`
      });
    } catch (error) {
      console.error("Error approving request:", error);
      toast({
        title: "Error",
        description: "Failed to approve event request",
        variant: "destructive"
      });
    }
  };

  const handleReject = (request: EventRequest) => {
    setRejectingRequest(request);
    setAdminComments("");
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!rejectingRequest || !adminComments.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejecting this request.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("event_requests")
        .update({ 
          status: "rejected",
          admin_comments: adminComments.trim()
        })
        .eq("id", rejectingRequest.id);

      if (error) throw error;

      // Create REAL notification for the user who submitted the request
      try {
        await autoCreateNotifications.eventRejected(
          String(rejectingRequest.id),
          rejectingRequest.requester_id,
          rejectingRequest.title,
          adminComments.trim()
        );
        console.log('❌ REJECTION NOTIFICATION: Sent to user who requested event');
      } catch (notifError) {
        console.log('Rejection notification failed (non-critical):', notifError);
      }
      
      await fetchRequests();
      setShowRejectModal(false);
      setRejectingRequest(null);
      setAdminComments("");
      
      toast({
        title: "❌ Event Rejected",
        description: `"${rejectingRequest.title}" has been rejected and the organizer has been notified.`
      });
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast({
        title: "Error",
        description: "Failed to reject event request",
        variant: "destructive"
      });
    }
  };

  const handleViewDetails = (request: EventRequest) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  // Filter requests based on active tab, search, and date
  const filteredRequests = requests.filter(request => {
    try {
      // Tab filter
      if (activeTab !== "all" && request.status !== activeTab) {
        return false;
      }

      // Search filter
      if (searchTerm && searchTerm.trim() !== "") {
        const searchLower = searchTerm.toLowerCase().trim();
        const titleMatch = request.title?.toLowerCase().includes(searchLower) || false;
        const requesterMatch = request.requester_name?.toLowerCase().includes(searchLower) || false;
        const typeMatch = request.event_type?.toLowerCase().includes(searchLower) || false;
        
        if (!titleMatch && !requesterMatch && !typeMatch) {
          return false;
        }
      }

      // Date filter
      if (dateFilter && dateFilter.trim() !== "") {
        try {
          const requestDate = new Date(request.created_at).toISOString().split('T')[0];
          if (requestDate !== dateFilter) {
            return false;
          }
        } catch (dateError) {
          return true; // If date parsing fails, include the item
        }
      }

      return true;
    } catch (error) {
      console.error('Filter error:', error);
      return true; // If any error occurs, include the item to prevent crashes
    }
  });

  // Get counts for each status
  const getStatusCount = (status: "pending" | "approved" | "rejected") => {
    return requests.filter(req => req.status === status).length;
  };

  // Generate enhanced PDF matching participant version
  const generatePDF = (request: EventRequest) => {
    let formData;
    try {
      formData = request.form_data || {};
    } catch (e) {
      formData = {};
    }
    
    const printContent = `
      <div style="max-width: 800px; margin: 0 auto; padding: 30px; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; background: white;">
        <!-- Form Header with Status -->
        <div style="text-align: center; margin-bottom: 30px; position: relative;">
          <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 20px; letter-spacing: 2px;">EVENT REQUEST FORM</h1>
          <!-- Status Stamp -->
          <div style="position: absolute; top: 0; right: 0;">
            <div style="display: inline-block; padding: 12px 24px; color: white; font-weight: bold; font-size: 18px; border: 3px solid ${request.status === 'approved' ? '#065f46' : request.status === 'rejected' ? '#991b1b' : '#92400e'}; background: ${request.status === 'approved' ? '#16a34a' : request.status === 'rejected' ? '#dc2626' : '#ca8a04'}; transform: rotate(12deg); border-radius: 8px; box-shadow: 2px 2px 8px rgba(0,0,0,0.3);">
              ${request.status.toUpperCase()}
            </div>
          </div>
          <p style="margin-top: 10px; color: #666; font-size: 14px;">Request ID: ${request.id}</p>
        </div>

        <!-- REQUEST DETAILS Section -->
        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 4px;">REQUEST DETAILS</h2>
          <div style="margin-bottom: 12px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">• Event Requested By:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.eventRequestedBy || request.requester_name || ''}</span>
          </div>
          <div style="margin-bottom: 12px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">• Position / Designation:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.position || ''}</span>
          </div>
          <div style="margin-bottom: 12px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">• Organization / Department:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.organization || ''}</span>
          </div>
          <div style="margin-bottom: 12px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">• Contact Number / Email:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.contactNumber || formData.email || ''}</span>
          </div>
          <div style="margin-bottom: 12px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">• Date of Submission:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.dateOfSubmission || new Date(request.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <!-- EVENT INFORMATION Section -->
        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 4px;">EVENT INFORMATION</h2>
          <div style="margin-bottom: 12px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">• Event Name:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${request.title}</span>
          </div>
          <div style="margin-bottom: 12px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">• Purpose:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${request.description}</span>
          </div>
          <div style="margin-bottom: 12px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">• Participants:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.participants || request.expected_participants}</span>
          </div>
          <div style="margin-bottom: 12px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">• Modality: (Face-to-Face / Online / Hybrid)</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.modality || ''}</span>
          </div>
          <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 30px;">
            <div style="display: flex; align-items: center; flex: 1;">
              <span style="font-weight: bold; margin-right: 8px;">• Event Date:</span>
              <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${request.date}</span>
            </div>
            <div style="display: flex; align-items: center; flex: 1;">
              <span style="font-weight: bold; margin-right: 8px;">Time:</span>
              <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${request.time}</span>
            </div>
          </div>
          <div style="margin-bottom: 12px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">• Venue:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${request.venue}</span>
          </div>
          <div style="margin-bottom: 12px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px;">• Overall In-Charge:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.overallInCharge || ''}</span>
          </div>
        </div>

        <!-- EVENT COMMITTEE ASSIGNMENTS Section -->
        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 4px;">EVENT COMMITTEE ASSIGNMENTS</h2>
          <div style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px; width: 200px;">1. Invitation:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.invitationCommittee || ''}</span>
          </div>
          <div style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px; width: 200px;">2. Program:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.programCommittee || ''}</span>
          </div>
          <div style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px; width: 200px;">3. Sound System:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.soundSystemCommittee || ''}</span>
          </div>
          <div style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px; width: 200px;">4. Stage Decoration:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.stageDecorationCommittee || ''}</span>
          </div>
          <div style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px; width: 200px;">5. Demolition / Clean-Up:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.demolitionCleanupCommittee || ''}</span>
          </div>
          <div style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px; width: 200px;">6. Food / Refreshments:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.foodRefreshmentsCommittee || ''}</span>
          </div>
          <div style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px; width: 200px;">7. Safety & Security:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.safetySecurityCommittee || ''}</span>
          </div>
          <div style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px; width: 200px;">8. Documentation:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.documentationCommittee || ''}</span>
          </div>
          <div style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px; width: 200px;">9. Registration:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.registrationCommittee || ''}</span>
          </div>
          <div style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="font-weight: bold; margin-right: 8px; width: 200px;">10. Evaluation:</span>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 4px 8px; min-height: 24px;">${formData.evaluationCommittee || ''}</span>
          </div>
        </div>

        <!-- PRE-EVENT REQUIREMENTS Section -->
        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 4px;">PRE-EVENT REQUIREMENTS (to be attached upon submission)</h2>
          <div style="margin-bottom: 8px;">• Letter of Request (signed by Program Head or Dean)</div>
          <div style="margin-bottom: 8px;">• Student Board Resolution (if the event will be held outside the school or involves a proposal for collections)</div>
          <div style="margin-bottom: 8px;">• Event Program / Invitation</div>
          <div style="margin-bottom: 8px;">• List of Permits Needed (if applicable)</div>
          <div style="margin-bottom: 8px;">• Copy of Certificate (if applicable)</div>
        </div>

        <!-- POST-EVENT REQUIREMENTS Section -->
        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 4px;">POST-EVENT REQUIREMENTS (to be submitted within 3-5 days after the event)</h2>
          <div style="margin-bottom: 8px;">• Post-Event Result</div>
          <div style="margin-bottom: 8px;">• Accomplishment / Narrative Report</div>
        </div>

        <!-- IMPORTANT REMINDERS Section -->
        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 4px;">IMPORTANT REMINDERS:</h2>
          <div style="margin-bottom: 8px;">• Requests must be submitted to the Office of the School Activities <strong>8 days or more before the event date</strong> to comply with the VPAA's 7-day requirement.</div>
          <div style="margin-bottom: 8px;">• The Office of the School Activities is open <strong>Monday to Friday, 8:00 a.m. to 5:00 p.m. only</strong>.</div>
          <div style="margin-bottom: 8px;">• Incomplete requirements will not be accepted.</div>
        </div>

        ${request.admin_comments ? `
        <!-- ADMIN COMMENTS Section -->
        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 4px;">ADMIN COMMENTS</h2>
          <div style="padding: 15px; border: 2px solid #666; background: #f9f9f9;">
            <p style="margin: 0; font-size: 14px;">${request.admin_comments}</p>
          </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; font-size: 12px; color: #666;">
          <p>Generated on: ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })}</p>
          <p>School Event Management System - Admin Panel</p>
        </div>
      </div>
    `;

    // Create a temporary window for PDF generation
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Event Request - ${request.title}</title>
            <style>
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            ${printContent}
            <div class="no-print" style="text-align: center; margin: 20px;">
              <button onclick="window.print(); setTimeout(() => window.close(), 1000);" style="padding: 10px 20px; background: #16a34a; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; margin-right: 10px;">📄 Save as PDF</button>
              <button onclick="window.close()" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 5px; cursor: pointer;">Close</button>
            </div>
            <script>
              // Auto-trigger print dialog for direct PDF save
              setTimeout(() => {
                window.print();
              }, 500);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="flex h-screen w-screen bg-white overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 flex flex-col h-screen w-full p-0 m-0">
        <header className="bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-4">
          <h1 className="text-3xl font-bold text-white">Event Approvals</h1>
        </header>
        <section className="flex-1 flex flex-col items-center justify-start bg-white p-4 overflow-auto">
          <div className="w-full max-w-6xl">
            {/* Tabs and Filters */}
            <div className="mb-6">
              {/* Status Tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  variant={activeTab === "all" ? "default" : "outline"}
                  onClick={() => setActiveTab("all")}
                  className="flex items-center gap-2"
                >
                  All Requests
                  <Badge variant="secondary">{requests.length}</Badge>
                </Button>
                <Button
                  variant={activeTab === "pending" ? "default" : "outline"}
                  onClick={() => setActiveTab("pending")}
                  className="flex items-center gap-2"
                >
                  Pending
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{getStatusCount("pending")}</Badge>
                </Button>
                <Button
                  variant={activeTab === "approved" ? "default" : "outline"}
                  onClick={() => setActiveTab("approved")}
                  className="flex items-center gap-2"
                >
                  Approved
                  <Badge variant="secondary" className="bg-green-100 text-green-800">{getStatusCount("approved")}</Badge>
                </Button>
                <Button
                  variant={activeTab === "rejected" ? "default" : "outline"}
                  onClick={() => setActiveTab("rejected")}
                  className="flex items-center gap-2"
                >
                  Rejected
                  <Badge variant="secondary" className="bg-red-100 text-red-800">{getStatusCount("rejected")}</Badge>
                </Button>
              </div>

              {/* Search and Date Filters */}
              <div className="flex flex-wrap gap-4 items-center">
                <div className="w-80">
                  <input
                    type="text"
                    placeholder="Search by event name, requester, or type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Filter by Date:</Label>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {(searchTerm || dateFilter) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setDateFilter("");
                    }}
                    className="text-gray-600"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg shadow border bg-white">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-500 to-violet-500 text-white">
                    <th className="px-4 py-2 text-left">Event Title</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Description</th>
                    <th className="px-4 py-2 text-left">Requested By</th>
                    <th className="px-4 py-2 text-left">Requested At</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-gray-400">
                        Loading...
                      </td>
                    </tr>
                  )}
                  {!loading && filteredRequests.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-gray-400">
                        {searchTerm || dateFilter || activeTab !== "all" 
                          ? `No ${activeTab === "all" ? "" : activeTab} requests found matching your filters.`
                          : "No event requests found."
                        }
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    filteredRequests.map(req => (
                      <tr key={req.id} className="border-b last:border-b-0">
                        <td className="px-4 py-2 font-semibold">{req.title}</td>
                        <td className="px-4 py-2">{req.event_type}</td>
                        <td className="px-4 py-2 text-gray-600 max-w-xs truncate">
                          {req.description}
                        </td>
                        <td className="px-4 py-2">{req.requester_name}</td>
                        <td className="px-4 py-2">
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2">
                          <Badge
                            className={
                              req.status === "approved"
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : req.status === "rejected"
                                ? "bg-red-100 text-red-800 hover:bg-red-100"
                                : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                            }
                          >
                            {req.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2">
                          {req.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-700 border-green-300 mr-2"
                                onClick={() => handleApprove(req.id)}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-700 border-red-300"
                                onClick={() => handleReject(req)}
                              >
                                <XCircle className="w-4 h-4 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                          {req.status !== "pending" && (
                            <span className="text-gray-400 text-sm">
                              {req.status === "approved" ? "Approved" : "Rejected"}
                            </span>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(req)}
                            className="text-blue-600 border-blue-300 hover:bg-blue-50 ml-2"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                          {req.status === "approved" && (
                            <Button
                              variant="outline" 
                              size="sm"
                              onClick={() => generatePDF(req)}
                              className="text-green-600 border-green-300 hover:bg-green-50 ml-2"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              PDF
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Enhanced Detail Modal */}
        {showDetailModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-primary">Event Request Details</h2>
                  <p className="text-muted-foreground">Request ID: {selectedRequest.id}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge 
                    className={
                      selectedRequest.status === "approved" ? "text-lg px-4 py-2 bg-green-100 text-green-800" :
                      selectedRequest.status === "rejected" ? "text-lg px-4 py-2 bg-red-100 text-red-800" : 
                      "text-lg px-4 py-2 bg-yellow-100 text-yellow-800"
                    }
                  >
                    {selectedRequest.status.toUpperCase()}
                  </Badge>
                  {selectedRequest.status === "approved" && (
                    <Button
                      onClick={() => generatePDF(selectedRequest)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setShowDetailModal(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
              
              <div className="p-8 bg-white">
                {(() => {
                  const formData = selectedRequest.form_data || {};
                  
                  return (
                    <div className="max-w-4xl mx-auto bg-white" style={{ fontFamily: 'Arial, sans-serif', fontSize: '14px', lineHeight: '1.6' }}>
                      {/* Form Header with Status */}
                      <div className="text-center mb-8 relative">
                        <h1 className="text-3xl font-bold mb-6" style={{ letterSpacing: '2px' }}>EVENT REQUEST FORM</h1>
                        {/* Status Stamp */}
                        <div className="absolute top-0 right-0">
                          <div 
                            className={`inline-block px-6 py-3 text-white font-bold text-lg rounded-lg shadow-lg transform rotate-12 ${
                              selectedRequest.status === 'approved' ? 'bg-green-600' : 
                              selectedRequest.status === 'rejected' ? 'bg-red-600' : 'bg-yellow-600'
                            }`}
                            style={{ 
                              border: `3px solid ${selectedRequest.status === 'approved' ? '#065f46' : selectedRequest.status === 'rejected' ? '#991b1b' : '#92400e'}`,
                              fontSize: '18px',
                              fontWeight: 'bold'
                            }}
                          >
                            {selectedRequest.status.toUpperCase()}
                          </div>
                        </div>
                      </div>

                      {/* REQUEST DETAILS Section */}
                      <div className="mb-8">
                        <h2 className="text-lg font-bold mb-4" style={{ borderBottom: '2px solid #000', paddingBottom: '4px' }}>REQUEST DETAILS</h2>
                        <div className="space-y-3">
                          <div className="flex items-center">
                            <span className="font-semibold mr-2">• Event Requested By:</span>
                            <span className="flex-1 border-b border-black px-2 min-h-[24px]">{formData.eventRequestedBy || selectedRequest.requester_name || ''}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-semibold mr-2">• Position / Designation:</span>
                            <span className="flex-1 border-b border-black px-2 min-h-[24px]">{formData.position || ''}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-semibold mr-2">• Organization / Department:</span>
                            <span className="flex-1 border-b border-black px-2 min-h-[24px]">{formData.organization || ''}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-semibold mr-2">• Contact Number / Email:</span>
                            <span className="flex-1 border-b border-black px-2 min-h-[24px]">{formData.contactNumber || formData.email || ''}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-semibold mr-2">• Date of Submission:</span>
                            <span className="flex-1 border-b border-black px-2 min-h-[24px]">{formData.dateOfSubmission || new Date(selectedRequest.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* EVENT INFORMATION Section */}
                      <div className="mb-8">
                        <h2 className="text-lg font-bold mb-4" style={{ borderBottom: '2px solid #000', paddingBottom: '4px' }}>EVENT INFORMATION</h2>
                        <div className="space-y-3">
                          <div className="flex items-center">
                            <span className="font-semibold mr-2">• Event Name:</span>
                            <span className="flex-1 border-b border-black px-2 min-h-[24px]">{selectedRequest.title}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-semibold mr-2">• Purpose:</span>
                            <span className="flex-1 border-b border-black px-2 min-h-[24px]">{selectedRequest.description}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-semibold mr-2">• Participants:</span>
                            <span className="flex-1 border-b border-black px-2 min-h-[24px]">{formData.participants || selectedRequest.expected_participants}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-semibold mr-2">• Modality: (Face-to-Face / Online / Hybrid)</span>
                            <span className="flex-1 border-b border-black px-2 min-h-[24px]">{formData.modality || ''}</span>
                          </div>
                          <div className="flex items-center gap-8">
                            <div className="flex items-center flex-1">
                              <span className="font-semibold mr-2">• Event Date:</span>
                              <span className="flex-1 border-b border-black px-2 min-h-[24px]">{selectedRequest.date}</span>
                            </div>
                            <div className="flex items-center flex-1">
                              <span className="font-semibold mr-2">Time:</span>
                              <span className="flex-1 border-b border-black px-2 min-h-[24px]">{selectedRequest.time}</span>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <span className="font-semibold mr-2">• Venue:</span>
                            <span className="flex-1 border-b border-black px-2 min-h-[24px]">{selectedRequest.venue}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-semibold mr-2">• Overall In-Charge:</span>
                            <span className="flex-1 border-b border-black px-2 min-h-[24px]">{formData.overallInCharge || ''}</span>
                          </div>
                        </div>
                      </div>

                      {/* EVENT COMMITTEE ASSIGNMENTS Section */}
                      <div className="mb-8">
                        <h2 className="text-lg font-bold mb-4" style={{ borderBottom: '2px solid #000', paddingBottom: '4px' }}>EVENT COMMITTEE ASSIGNMENTS</h2>
                        <div className="space-y-2">
                          {[
                            { label: '1. Invitation:', value: formData.invitationCommittee },
                            { label: '2. Program:', value: formData.programCommittee },
                            { label: '3. Sound System:', value: formData.soundSystemCommittee },
                            { label: '4. Stage Decoration:', value: formData.stageDecorationCommittee },
                            { label: '5. Demolition / Clean-Up:', value: formData.demolitionCleanupCommittee },
                            { label: '6. Food / Refreshments:', value: formData.foodRefreshmentsCommittee },
                            { label: '7. Safety & Security:', value: formData.safetySecurityCommittee },
                            { label: '8. Documentation:', value: formData.documentationCommittee },
                            { label: '9. Registration:', value: formData.registrationCommittee },
                            { label: '10. Evaluation:', value: formData.evaluationCommittee }
                          ].map((item, index) => (
                            <div key={index} className="flex items-center">
                              <span className="font-semibold mr-2 w-48">{item.label}</span>
                              <span className="flex-1 border-b border-black px-2 min-h-[24px]">{item.value || ''}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* PRE-EVENT REQUIREMENTS Section */}
                      <div className="mb-8">
                        <h2 className="text-lg font-bold mb-4" style={{ borderBottom: '2px solid #000', paddingBottom: '4px' }}>PRE-EVENT REQUIREMENTS (to be attached upon submission)</h2>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span>• Letter of Request (signed by Program Head or Dean)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>• Student Board Resolution (if the event will be held outside the school or involves a proposal for collections)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>• Event Program / Invitation</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>• List of Permits Needed (if applicable)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>• Copy of Certificate (if applicable)</span>
                          </div>
                        </div>
                      </div>

                      {/* POST-EVENT REQUIREMENTS Section */}
                      <div className="mb-8">
                        <h2 className="text-lg font-bold mb-4" style={{ borderBottom: '2px solid #000', paddingBottom: '4px' }}>POST-EVENT REQUIREMENTS (to be submitted within 3-5 days after the event)</h2>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span>• Post-Event Result</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>• Accomplishment / Narrative Report</span>
                          </div>
                        </div>
                      </div>

                      {/* IMPORTANT REMINDERS Section */}
                      <div className="mb-8">
                        <h2 className="text-lg font-bold mb-4" style={{ borderBottom: '2px solid #000', paddingBottom: '4px' }}>IMPORTANT REMINDERS:</h2>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <span>• Requests must be submitted to the Office of the School Activities <strong>8 days or more before the event date</strong> to comply with the VPAA's 7-day requirement.</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span>• The Office of the School Activities is open <strong>Monday to Friday, 8:00 a.m. to 5:00 p.m. only</strong>.</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span>• Incomplete requirements will not be accepted.</span>
                          </div>
                        </div>
                      </div>

                      {/* ADMIN COMMENTS Section */}
                      {selectedRequest.admin_comments && (
                        <div className="mb-8">
                          <h2 className="text-lg font-bold mb-4" style={{ borderBottom: '2px solid #000', paddingBottom: '4px' }}>ADMIN COMMENTS</h2>
                          <div className="p-4 border-2 border-gray-400 bg-gray-50">
                            <p className="text-gray-700">{selectedRequest.admin_comments}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Action Buttons */}
                {selectedRequest.status === "pending" && (
                  <div className="flex gap-4 pt-6 border-t">
                    <Button
                      onClick={() => {
                        handleApprove(selectedRequest.id);
                        setShowDetailModal(false);
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Approve Request
                    </Button>
                    <Button
                      onClick={() => {
                        setShowDetailModal(false);
                        handleReject(selectedRequest);
                      }}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject Request
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rejection Reason Modal */}
        {showRejectModal && rejectingRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-red-600">❌ Reject Event Request</h2>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectingRequest(null);
                    setAdminComments("");
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </Button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900">{rejectingRequest.title}</h3>
                  <p className="text-sm text-gray-600">Requested by: {rejectingRequest.requester_name}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rejection-reason" className="text-sm font-medium text-red-700">
                    Rejection Reason (Required) *
                  </Label>
                  <Textarea
                    id="rejection-reason"
                    value={adminComments}
                    onChange={(e) => setAdminComments(e.target.value)}
                    placeholder="Please explain why this event request is being rejected..."
                    rows={4}
                    className="w-full border-red-200 focus:border-red-500 focus:ring-red-500"
                  />
                  <p className="text-xs text-gray-500">
                    This reason will be shown to the participant who submitted the request.
                  </p>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={confirmReject}
                    variant="destructive"
                    className="flex-1"
                    disabled={!adminComments.trim()}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Request
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectingRequest(null);
                      setAdminComments("");
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Approvals;