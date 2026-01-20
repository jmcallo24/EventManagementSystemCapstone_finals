import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Eye, Download, FileText, User, Calendar, MapPin, Users, Clock } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { autoCreateNotifications } from "@/lib/notificationService";

// Real EventRequest type matching database
interface EventRequest {
  id: string;
  title: string;
  event_type: string;
  description: string;
  requester_name: string;
  created_at: string;
  date: string;
  time: string;
  venue: string;
  expected_participants: number;
  request_reason: string;
  status: "pending" | "approved" | "rejected" | "under_review";
  admin_comments?: string;
  budget_estimate?: number;
  requirements?: string;
  form_data?: any; // Store complete form data object
}

// Real function to fetch from Supabase
const fetchEventRequests = async (): Promise<EventRequest[]> => {
  try {
    console.log('Fetching event requests from database...');
    
    const { data, error } = await supabase
      .from('event_requests')
      .select(`
        *,
        requester:requester_id (name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching event requests:', error);
      throw error;
    }

    console.log('Event requests fetched:', data);

    // Format data for component
    const formattedData: EventRequest[] = data?.map(request => ({
      id: request.id,
      title: request.title,
      event_type: request.event_type,
      description: request.description,
      requester_name: request.requester?.name || 'Unknown User',
      created_at: request.created_at,
      date: request.date,
      time: request.time,
      venue: request.venue,
      expected_participants: request.expected_participants,
      request_reason: request.request_reason,
      status: request.status,
      admin_comments: request.admin_comments,
      budget_estimate: request.budget_estimate,
      requirements: request.requirements,
      form_data: request.form_data // Keep as object
    })) || [];

    return formattedData;
  } catch (error) {
    console.error('Failed to fetch event requests:', error);
    return [];
  }
};

const Approvals = () => {
  const { toast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [requests, setRequests] = useState<EventRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<EventRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    const loadRequests = async () => {
      setLoading(true);
      const data = await fetchEventRequests();
      setRequests(data);
      setLoading(false);
    };
    
    loadRequests();
  }, []);

  // Format time (e.g., "2 hours ago")
  const timeAgo = (iso: string) => {
    const now = new Date();
    const date = new Date(iso);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff} sec ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return date.toLocaleString();
  };

  // Real Approve handler with Supabase
  const handleApprove = async (id: string) => {
    try {
      // Get the request details first to find the requester
      const { data: requestData, error: fetchError } = await supabase
        .from('event_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Update the request status
      const { error } = await supabase
        .from('event_requests')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          admin_comments: 'Request approved by admin'
        })
        .eq('id', id);

      if (error) throw error;

      // Create notification for the participant using notification service
      try {
        await autoCreateNotifications.eventApproved(
          id, 
          requestData.requester_id, 
          requestData.title
        );
      } catch (notifError) {
        console.log('Notification creation failed (non-critical):', notifError);
      }

      // Update local state
      setRequests(reqs =>
        reqs.map(r => (r.id === id ? { ...r, status: "approved" } : r))
      );

      toast({
        title: "Request Approved",
        description: "Event request has been approved successfully. Participant has been notified.",
      });
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: "Failed to approve request. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Real Reject handler with Supabase
  const handleReject = async (id: string) => {
    try {
      // Get the request details first to find the requester
      const { data: requestData, error: fetchError } = await supabase
        .from('event_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Update the request status
      const { error } = await supabase
        .from('event_requests')
        .update({ 
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          admin_comments: 'Request rejected by admin'
        })
        .eq('id', id);

      if (error) throw error;

      // Create notification for the participant using notification service
      try {
        await autoCreateNotifications.eventRejected(
          id, 
          requestData.requester_id, 
          requestData.title,
          'Request rejected by admin'
        );
      } catch (notifError) {
        console.log('Notification creation failed (non-critical):', notifError);
      }

      // Update local state
      setRequests(reqs =>
        reqs.map(r => (r.id === id ? { ...r, status: "rejected" } : r))
      );

      toast({
        title: "Request Rejected",
        description: "Event request has been rejected. Participant has been notified.",
      });
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: "Failed to reject request. Please try again.",
        variant: "destructive"
      });
    }
  };

  // View detailed request information
  const handleViewDetails = (request: EventRequest) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
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
      <div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; line-height: 1.4;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">EVENT REQUEST FORM</h1>
          <div style="display: inline-block; padding: 10px 20px; background: ${request.status === 'approved' ? '#10b981' : '#ef4444'}; color: white; border-radius: 8px; font-weight: bold;">
            ${request.status.toUpperCase()}
          </div>
          <p style="margin-top: 10px; color: #6b7280;">Request ID: ${request.id}</p>
        </div>

        <div style="border: 2px solid #3b82f6; padding: 20px; margin-bottom: 20px; background: #eff6ff;">
          <h3 style="color: #1e40af; margin-bottom: 15px; font-size: 18px;">📋 REQUEST DETAILS</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div><strong>Event Requested By:</strong> ${formData.eventRequestedBy || request.requester_name || 'N/A'}</div>
            <div><strong>Position/Designation:</strong> ${formData.position || 'N/A'}</div>
            <div><strong>Organization/Department:</strong> ${formData.organization || 'N/A'}</div>
            <div><strong>Contact Number/Email:</strong> ${formData.contactNumber || formData.email || 'N/A'}</div>
            <div><strong>Date of Submission:</strong> ${formData.dateOfSubmission || new Date(request.created_at).toLocaleDateString()}</div>
          </div>
        </div>

        <div style="border: 2px solid #10b981; padding: 20px; margin-bottom: 20px; background: #f0fdf4;">
          <h3 style="color: #15803d; margin-bottom: 15px; font-size: 18px;">🎉 EVENT INFORMATION</h3>
          <div style="margin-bottom: 10px;"><strong>Event Name:</strong> ${request.title}</div>
          <div style="margin-bottom: 10px;"><strong>Purpose:</strong> ${request.description}</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 10px;">
            <div><strong>Participants:</strong> ${formData.participants || request.expected_participants}</div>
            <div><strong>Modality:</strong> ${formData.modality || 'N/A'}</div>
            <div><strong>Overall In-Charge:</strong> ${formData.overallInCharge || 'N/A'}</div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
            <div><strong>Event Date:</strong> ${request.date}</div>
            <div><strong>Event Time:</strong> ${request.time}</div>
            <div><strong>Venue:</strong> ${request.venue}</div>
          </div>
          <div style="margin-top: 10px;"><strong>Event Type:</strong> ${request.event_type}</div>
          ${request.request_reason ? `<div style="margin-top: 10px;"><strong>Request Reason:</strong> ${request.request_reason}</div>` : ''}
          ${request.budget_estimate ? `<div style="margin-top: 10px;"><strong>Budget Estimate:</strong> ₱${request.budget_estimate}</div>` : ''}
          ${request.requirements ? `<div style="margin-top: 10px;"><strong>Requirements:</strong> ${request.requirements}</div>` : ''}
        </div>

        <div style="border: 2px solid #8b5cf6; padding: 20px; margin-bottom: 20px; background: #faf5ff;">
          <h3 style="color: #7c3aed; margin-bottom: 15px; font-size: 18px;">👥 COMMITTEE ASSIGNMENTS</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div><strong>1. Invitation:</strong> ${formData.invitation || 'N/A'}</div>
            <div><strong>2. Program:</strong> ${formData.program || 'N/A'}</div>
            <div><strong>3. Sound System:</strong> ${formData.soundSystem || 'N/A'}</div>
            <div><strong>4. Stage Decoration:</strong> ${formData.stageDecoration || 'N/A'}</div>
            <div><strong>5. Demolition/Clean-Up:</strong> ${formData.demolitionCleanup || 'N/A'}</div>
            <div><strong>6. Food/Refreshments:</strong> ${formData.foodRefreshments || 'N/A'}</div>
            <div><strong>7. Safety & Security:</strong> ${formData.safetySecurityUsher || 'N/A'}</div>
            <div><strong>8. Documentation:</strong> ${formData.documentation || 'N/A'}</div>
            <div><strong>9. Registration:</strong> ${formData.registration || 'N/A'}</div>
            <div><strong>10. Evaluation:</strong> ${formData.evaluation || 'N/A'}</div>
          </div>
        </div>

        <div style="border: 2px solid #f59e0b; padding: 20px; margin-bottom: 20px; background: #fffbeb;">
          <h3 style="color: #d97706; margin-bottom: 15px; font-size: 18px;">📄 PRE-EVENT REQUIREMENTS</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>☑ Letter of Request: ${formData.letterOfRequest ? '✓ Completed' : '☐ Pending'}</div>
            <div>☑ Student Board Resolution: ${formData.studentBoardResolution ? '✓ Completed' : '☐ Pending'}</div>
            <div>☑ Event Program/Invitation: ${formData.eventProgramInvitation ? '✓ Completed' : '☐ Pending'}</div>
            <div>☑ List of Permits Needed: ${formData.listOfPermits ? '✓ Completed' : '☐ Pending'}</div>
            <div>☑ Copy of Certificate: ${formData.copyOfCertificate ? '✓ Completed' : '☐ Pending'}</div>
          </div>
        </div>

        <div style="border: 2px solid #6366f1; padding: 20px; margin-bottom: 20px; background: #f0f9ff;">
          <h3 style="color: #4338ca; margin-bottom: 15px; font-size: 18px;">📊 POST-EVENT REQUIREMENTS</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>☑ Post-Event Result: ${formData.postEventResult ? '✓ Completed' : '☐ Pending'}</div>
            <div>☑ Accomplishment Report: ${formData.accomplishmentReport ? '✓ Completed' : '☐ Pending'}</div>
          </div>
        </div>

        <div style="border: 2px solid #ef4444; padding: 20px; margin-bottom: 20px; background: #fef2f2;">
          <h3 style="color: #dc2626; margin-bottom: 15px; font-size: 18px;">⚠️ IMPORTANT REMINDERS</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Requests must be submitted at least 8 days before the event date</li>
            <li>Office hours: Monday to Friday, 8:00 AM - 5:00 PM</li>
            <li>Incomplete requirements will not be accepted</li>
          </ul>
        </div>

        ${request.admin_comments ? `
        <div style="border: 2px solid #64748b; padding: 20px; margin-bottom: 20px; background: #f8fafc;">
          <h3 style="color: #475569; margin-bottom: 15px; font-size: 18px;">💬 ADMIN COMMENTS</h3>
          <p style="margin: 0; padding: 10px; background: white; border-radius: 5px;">${request.admin_comments}</p>
        </div>
        ` : ''}

        <div style="text-align: center; margin-top: 30px; padding: 20px; border: 2px solid ${request.status === 'approved' ? '#10b981' : '#ef4444'}; background: ${request.status === 'approved' ? '#f0fdf4' : '#fef2f2'};">
          <div style="font-size: 24px; font-weight: bold; color: ${request.status === 'approved' ? '#15803d' : '#dc2626'}; margin-bottom: 10px;">
            ${request.status === 'approved' ? '✅' : '❌'} ${request.status.toUpperCase()}
          </div>
          <div style="font-size: 14px; color: #6b7280;">
            Generated on: ${new Date().toLocaleDateString('en-US', { 
              year: 'numeric', month: 'long', day: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })}
          </div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">
            School Event Management System - Admin Panel
          </div>
        </div>
      </div>
    `;

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
              <button onclick="window.print()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer;">Print PDF</button>
              <button onclick="window.close()" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Close</button>
            </div>
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
          <div className="w-full max-w-5xl">
            <div className="overflow-x-auto rounded-lg shadow border bg-white mt-2">
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
                  {!loading && requests.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-gray-400">
                        No event requests found.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    requests.map(req => (
                      <tr key={req.id} className="border-b last:border-b-0">
                        <td className="px-4 py-2 font-semibold">{req.title}</td>
                        <td className="px-4 py-2">{req.event_type}</td>
                        <td className="px-4 py-2">{req.description}</td>
                        <td className="px-4 py-2">{req.requester_name}</td>
                        <td className="px-4 py-2">{timeAgo(req.created_at)}</td>
                        <td className="px-4 py-2">
                          <span
                            className={
                              req.status === "approved"
                                ? "px-2 py-1 rounded bg-green-100 text-green-700"
                                : req.status === "rejected"
                                ? "px-2 py-1 rounded bg-red-100 text-red-700"
                                : "px-2 py-1 rounded bg-yellow-100 text-yellow-700"
                            }
                          >
                            {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-2 flex gap-2">
                          {req.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-700 border-green-300"
                                onClick={() => handleApprove(req.id)}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-700 border-red-300"
                                onClick={() => handleReject(req.id)}
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
              
              <div className="p-6 space-y-6">
                {/* Enhanced Form Data Display */}
                {(() => {
                  const formData = selectedRequest.form_data || {};
                  
                  return (
                    <div className="space-y-6">
                        {/* REQUEST DETAILS Section */}
                        <Card className="border-blue-200 bg-blue-50">
                          <CardHeader>
                            <CardTitle className="text-blue-800">📋 REQUEST DETAILS</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <div>
                                  <Label className="font-semibold">Event Requested By</Label>
                                  <p className="text-gray-700">{formData.eventRequestedBy || selectedRequest.requester_name || 'N/A'}</p>
                                </div>
                                <div>
                                  <Label className="font-semibold">Position / Designation</Label>
                                  <p className="text-gray-700">{formData.position || 'N/A'}</p>
                                </div>
                                <div>
                                  <Label className="font-semibold">Organization / Department</Label>
                                  <p className="text-gray-700">{formData.organization || 'N/A'}</p>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <Label className="font-semibold">Contact Number / Email</Label>
                                  <p className="text-gray-700">{formData.contactNumber || formData.email || 'N/A'}</p>
                                </div>
                                <div>
                                  <Label className="font-semibold">Date of Submission</Label>
                                  <p className="text-gray-700">{formData.dateOfSubmission || new Date(selectedRequest.created_at).toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <Label className="font-semibold">Submitted</Label>
                                  <p className="text-gray-700">{timeAgo(selectedRequest.created_at)}</p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* EVENT INFORMATION Section */}
                        <Card className="border-green-200 bg-green-50">
                          <CardHeader>
                            <CardTitle className="text-green-800">🎉 EVENT INFORMATION</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="font-semibold">Event Name</Label>
                                  <p className="text-gray-700">{selectedRequest.title}</p>
                                </div>
                                <div>
                                  <Label className="font-semibold">Purpose</Label>
                                  <p className="text-gray-700">{selectedRequest.description}</p>
                                </div>
                              </div>
                              
                              <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                  <Label className="font-semibold">Participants</Label>
                                  <p className="text-gray-700">{formData.participants || selectedRequest.expected_participants}</p>
                                </div>
                                <div>
                                  <Label className="font-semibold">Modality</Label>
                                  <p className="text-gray-700">{formData.modality || 'N/A'}</p>
                                </div>
                                <div>
                                  <Label className="font-semibold">Overall In-Charge</Label>
                                  <p className="text-gray-700">{formData.overallInCharge || 'N/A'}</p>
                                </div>
                              </div>

                              <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                  <Label className="font-semibold">Event Date</Label>
                                  <p className="text-gray-700">{selectedRequest.date}</p>
                                </div>
                                <div>
                                  <Label className="font-semibold">Event Time</Label>
                                  <p className="text-gray-700">{selectedRequest.time}</p>
                                </div>
                                <div>
                                  <Label className="font-semibold">Venue</Label>
                                  <p className="text-gray-700">{selectedRequest.venue}</p>
                                </div>
                              </div>

                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="font-semibold">Event Type</Label>
                                  <p className="text-gray-700">{selectedRequest.event_type}</p>
                                </div>
                                {selectedRequest.budget_estimate && (
                                  <div>
                                    <Label className="font-semibold">Budget Estimate</Label>
                                    <p className="text-gray-700">₱{selectedRequest.budget_estimate}</p>
                                  </div>
                                )}
                              </div>

                              {selectedRequest.request_reason && (
                                <div>
                                  <Label className="font-semibold">Request Reason</Label>
                                  <p className="text-gray-700 bg-white p-3 rounded border">{selectedRequest.request_reason}</p>
                                </div>
                              )}

                              {selectedRequest.requirements && (
                                <div>
                                  <Label className="font-semibold">Special Requirements</Label>
                                  <p className="text-gray-700 bg-white p-3 rounded border">{selectedRequest.requirements}</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        {/* COMMITTEE ASSIGNMENTS Section */}
                        <Card className="border-purple-200 bg-purple-50">
                          <CardHeader>
                            <CardTitle className="text-purple-800">👥 COMMITTEE ASSIGNMENTS</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid md:grid-cols-2 gap-3">
                              {[
                                { label: '1. Invitation', value: formData.invitation },
                                { label: '2. Program', value: formData.program },
                                { label: '3. Sound System', value: formData.soundSystem },
                                { label: '4. Stage Decoration', value: formData.stageDecoration },
                                { label: '5. Demolition/Clean-Up', value: formData.demolitionCleanup },
                                { label: '6. Food/Refreshments', value: formData.foodRefreshments },
                                { label: '7. Safety & Security', value: formData.safetySecurityUsher },
                                { label: '8. Documentation', value: formData.documentation },
                                { label: '9. Registration', value: formData.registration },
                                { label: '10. Evaluation', value: formData.evaluation }
                              ].map(({ label, value }) => (
                                <div key={label} className="flex">
                                  <span className="font-medium w-40">{label}:</span>
                                  <span className="text-gray-700">{value || 'N/A'}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        {/* PRE-EVENT REQUIREMENTS Section */}
                        <Card className="border-orange-200 bg-orange-50">
                          <CardHeader>
                            <CardTitle className="text-orange-800">📄 PRE-EVENT REQUIREMENTS</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid md:grid-cols-2 gap-2">
                              {[
                                { key: 'letterOfRequest', label: 'Letter of Request (signed by Program Head or Dean)' },
                                { key: 'studentBoardResolution', label: 'Student Board Resolution' },
                                { key: 'eventProgramInvitation', label: 'Event Program / Invitation' },
                                { key: 'listOfPermits', label: 'List of Permits Needed (if applicable)' },
                                { key: 'copyOfCertificate', label: 'Copy of Certificate (if applicable)' }
                              ].map(({ key, label }) => (
                                <div key={key} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={formData[key] || false}
                                    disabled
                                    className="h-4 w-4 text-green-600"
                                  />
                                  <span className={formData[key] ? 'text-sm text-green-700 font-medium' : 'text-sm text-gray-500'}>
                                    {label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        {/* POST-EVENT REQUIREMENTS Section */}
                        <Card className="border-indigo-200 bg-indigo-50">
                          <CardHeader>
                            <CardTitle className="text-indigo-800">📊 POST-EVENT REQUIREMENTS</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {[
                                { key: 'postEventResult', label: 'Post-Event Result' },
                                { key: 'accomplishmentReport', label: 'Accomplishment / Narrative Report' }
                              ].map(({ key, label }) => (
                                <div key={key} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={formData[key] || false}
                                    disabled
                                    className="h-4 w-4 text-indigo-600"
                                  />
                                  <span className={formData[key] ? 'text-sm text-indigo-700 font-medium' : 'text-sm text-gray-500'}>
                                    {label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        {/* ADMIN COMMENTS Section */}
                        {selectedRequest.admin_comments && (
                          <Card className="border-gray-200 bg-gray-50">
                            <CardHeader>
                              <CardTitle className="text-gray-800">💬 ADMIN COMMENTS</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-gray-700 bg-white p-4 rounded border">{selectedRequest.admin_comments}</p>
                            </CardContent>
                          </Card>
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
                        handleReject(selectedRequest.id);
                        setShowDetailModal(false);
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
      </main>
    </div>
  );
};

export default Approvals;