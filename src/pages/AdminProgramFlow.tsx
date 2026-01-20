import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  PlayCircle,
  Clock,
  Calendar,
  Users,
  MapPin,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Filter,
  Send,
  MessageCircle,
  Settings,
  FileText,
  Award
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import {
  ProgramFlow,
  getAllProgramFlows,
  reviewProgramFlow
} from "@/lib/programFlowService";

const AdminProgramFlow = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [programFlows, setProgramFlows] = useState<ProgramFlow[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<ProgramFlow | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');
  const [adminComments, setAdminComments] = useState("");
  const { toast } = useToast();

  // Load all program flows from database
  const loadProgramFlows = async () => {
    try {
      setLoading(true);
      console.log('👁️ ADMIN: Loading all program flows from database...');
      
      // Load from event_requests table where admin_comments contains program flow data
      const { data, error } = await supabase
        .from('event_requests')
        .select('*')
        .like('admin_comments', 'PROGRAM_FLOW:%')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ ADMIN: Database error:', error);
        setProgramFlows([]);
        return;
      }

      // Convert event_requests with program flow data to ProgramFlow objects
      const flows: ProgramFlow[] = [];
      
      data?.forEach(req => {
        try {
          if (req.admin_comments?.startsWith('PROGRAM_FLOW:')) {
            const jsonData = req.admin_comments.replace('PROGRAM_FLOW:', '');
            const programFlowData = JSON.parse(jsonData);
            
            const flow: ProgramFlow = {
              id: req.id,
              event_id: req.id,
              event_title: req.title,
              event_date: req.date,
              organizer_id: req.requester_id,
              organizer_name: req.requester_id, // We'll improve this later
              title: programFlowData.title || req.title + ' Program Flow',
              description: programFlowData.description || '',
              status: programFlowData.status || 'draft',
              activities: programFlowData.activities || [],
              created_at: req.created_at,
              updated_at: req.updated_at,
              is_active: true,
              admin_comments: programFlowData.admin_comments
            };
            
            flows.push(flow);
          }
        } catch (parseError) {
          console.error('❌ ADMIN: JSON parse error for request:', req.id, parseError);
        }
      });

      console.log('🔍 ADMIN: Loaded flows from database:', flows.length);
      
      flows.forEach((flow, index) => {
        console.log(`- Flow ${index + 1}:`, {
          id: flow.id,
          title: flow.title,
          status: flow.status,
          organizer: flow.organizer_id,
          activities: flow.activities?.length || 0
        });
      });
      
      setProgramFlows(flows);
      console.log('✅ ADMIN: Successfully loaded program flows from database');
    } catch (error) {
      console.error('❌ ADMIN: Error loading program flows:', error);
      setProgramFlows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgramFlows();
    // Auto-refresh every 5 seconds for testing
    const interval = setInterval(() => {
      console.log('🔄 ADMIN: Auto-refreshing program flows...');
      loadProgramFlows();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Filter program flows
  const filteredFlows = programFlows.filter(flow => {
    const matchesSearch = flow.title.toLowerCase().includes(search.toLowerCase()) ||
                         flow.event_title.toLowerCase().includes(search.toLowerCase()) ||
                         flow.organizer_name.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = filterStatus === "all" || flow.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Handle review program flow
  const handleReview = async () => {
    if (!selectedFlow) return;

    try {
      console.log('👁️ ADMIN: Reviewing program flow...', reviewAction);
      
      // First get current program flow data from admin_comments
      const { data: currentData, error: fetchError } = await supabase
        .from('event_requests')
        .select('admin_comments')
        .eq('id', selectedFlow.id)
        .single();

      if (fetchError || !currentData?.admin_comments?.startsWith('PROGRAM_FLOW:')) {
        console.error('❌ ADMIN: Error fetching current data:', fetchError);
        toast({
          title: "Error",
          description: "Program flow not found",
          variant: "destructive"
        });
        return;
      }

      // Parse current data and update with admin review
      try {
        const jsonData = currentData.admin_comments.replace('PROGRAM_FLOW:', '');
        const programFlowData = JSON.parse(jsonData);
        
        // Update status and add admin comments
        programFlowData.status = reviewAction;
        programFlowData.admin_comments = adminComments;
        programFlowData.updated_at = new Date().toISOString();
        
        const updatedJsonString = 'PROGRAM_FLOW:' + JSON.stringify(programFlowData);

        // Update the database
        const { data, error } = await supabase
          .from('event_requests')
          .update({ 
            admin_comments: updatedJsonString,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedFlow.id)
          .select();

        if (error) {
          console.error('❌ ADMIN: Database error:', error);
          toast({
            title: "Error",
            description: "Failed to update program flow in database",
            variant: "destructive"
          });
          return;
        }

        console.log('✅ ADMIN: Program flow updated in database:', data);

        // Reload to get fresh data
        await loadProgramFlows();

        toast({
          title: `✅ Program Flow ${reviewAction.charAt(0).toUpperCase() + reviewAction.slice(1)}!`,
          description: `Program flow has been ${reviewAction}`
        });

        setShowReviewModal(false);
        setAdminComments("");
        setSelectedFlow(null);
        
        console.log('✅ ADMIN: Program flow reviewed and saved to database');
        
      } catch (parseError) {
        console.error('❌ ADMIN: JSON parse error:', parseError);
        toast({
          title: "Error",
          description: "Invalid program flow data",
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error('❌ ADMIN: Error reviewing program flow:', error);
      toast({
        title: "Error",
        description: "Failed to review program flow",
        variant: "destructive"
      });
    }
  };

  // Get stats
  const stats = {
    total: programFlows.length,
    submitted: programFlows.filter(f => f.status === 'submitted').length,
    approved: programFlows.filter(f => f.status === 'approved').length,
    rejected: programFlows.filter(f => f.status === 'rejected').length,
    draft: programFlows.filter(f => f.status === 'draft').length
  };

  return (
    <div className="flex h-screen w-screen bg-white overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 flex flex-col h-screen w-full p-0 m-0">
        <header className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">👁️ Admin Program Flow Management</h1>
            <p className="text-indigo-100 text-sm">Review and manage event program flows</p>
          </div>
          <div className="text-white text-sm bg-white/20 px-3 py-1 rounded-full">
            <Settings className="w-4 h-4 inline mr-1" />
            Admin Panel
          </div>
        </header>
        
        <section className="flex-1 flex flex-col items-center justify-start bg-gray-50 p-4 overflow-auto">
          <div className="w-full max-w-7xl">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                  <div className="text-sm text-gray-600">Total Flows</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.submitted}</div>
                  <div className="text-sm text-gray-600">Pending Review</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                  <div className="text-sm text-gray-600">Approved</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                  <div className="text-sm text-gray-600">Rejected</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
                  <div className="text-sm text-gray-600">Drafts</div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filter */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search program flows, events, or organizers..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="border rounded px-3 py-2 text-sm"
                    >
                      <option value="all">All Status</option>
                      <option value="draft">Draft</option>
                      <option value="submitted">Pending Review</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <Button
                    onClick={() => {
                      console.log('🔧 CREATING TEST DATA...');
                      const testFlow: ProgramFlow = {
                        id: '1729630200000',
                        event_id: 'testt-event',
                        event_title: 'testt',
                        event_date: '2025-10-01',
                        organizer_id: '846b4ad6-8d66-40d9-9435-0a38b03342c9',
                        organizer_name: 'ivan cute',
                        title: 'test',
                        description: 'test',
                        status: 'submitted',
                        activities: [
                          {
                            id: 'activity-1',
                            time: '17:15',
                            title: 'test',
                            description: 'test activity',
                            location: '',
                            duration: 60,
                            activity_type: 'activity',
                            is_active: true,
                            order_index: 0
                          }
                        ],
                        created_at: '2025-10-02T00:00:00.000Z',
                        updated_at: new Date().toISOString(),
                        is_active: true
                      };
                      
                      localStorage.setItem('allProgramFlows', JSON.stringify([testFlow]));
                      console.log('✅ Test data created in localStorage');
                      loadProgramFlows();
                      alert('Test data created! Check admin view.');
                    }}
                    variant="secondary"
                    size="sm"
                  >
                    🔧 Create Test Data
                  </Button>

                  <Button
                    onClick={() => {
                      console.log('🗑️ CLEARING ALL DATA...');
                      localStorage.removeItem('allProgramFlows');
                      localStorage.removeItem('programFlows_846b4ad6-8d66-40d9-9435-0a38b03342c9');
                      setProgramFlows([]);
                      console.log('✅ All program flow data cleared');
                      alert('All data cleared! Now test the real flow: Organizer Create → Submit → Admin Approve');
                    }}
                    variant="destructive"
                    size="sm"
                  >
                    🗑️ Clear Data
                  </Button>

                  <Button
                    onClick={() => {
                      console.log('🔍 MANUAL DEBUG: Checking localStorage...');
                      const allFlows = localStorage.getItem('allProgramFlows');
                      console.log('🌐 Raw data:', allFlows);
                      if (allFlows) {
                        const flows = JSON.parse(allFlows);
                        console.log('📋 Parsed flows:', flows);
                        alert(`Found ${flows.length} program flows in storage`);
                      } else {
                        alert('No program flows found in localStorage');
                      }
                    }}
                    variant="secondary"
                    size="sm"
                  >
                    🔍 Debug Storage
                  </Button>
                  
                  <Button
                    onClick={loadProgramFlows}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                  >
                    {loading ? "Loading..." : "Refresh"}
                  </Button>
                </div>
                
                <div className="flex gap-2 mt-3 text-xs text-gray-600">
                  <span>Showing {filteredFlows.length} of {programFlows.length} program flows</span>
                </div>
              </CardContent>
            </Card>

            {/* Program Flows List */}
            <div className="space-y-6">
              {filteredFlows.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <PlayCircle className="w-16 h-16 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                      {search || filterStatus !== "all" ? "No program flows match your search" : "No program flows yet"}
                    </h3>
                    <p className="text-gray-500 text-center">
                      {search || filterStatus !== "all" 
                        ? "Try adjusting your search or filter criteria"
                        : "Organizers haven't created any program flows yet."
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredFlows.map((flow) => (
                  <Card key={flow.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <CardTitle className="text-xl">{flow.title}</CardTitle>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{flow.event_title}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{formatDate(flow.event_date)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>by {flow.organizer_name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <PlayCircle className="w-4 h-4" />
                              <span>{flow.activities.length} Activities</span>
                            </div>
                          </div>
                          {flow.description && (
                            <p className="text-sm text-gray-600">{flow.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={
                              flow.status === 'approved' ? 'default' :
                              flow.status === 'submitted' ? 'secondary' :
                              flow.status === 'rejected' ? 'destructive' : 'outline'
                            }
                          >
                            {flow.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {flow.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                            {flow.status.charAt(0).toUpperCase() + flow.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Quick Timeline Preview */}
                      <div className="space-y-3 mb-4">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Activity Preview (showing first 3)
                        </h4>
                        <div className="space-y-2">
                          {flow.activities.slice(0, 3).map((activity, index) => (
                            <div key={activity.id || index} className="flex items-center gap-3 p-2 bg-gray-50 rounded text-sm">
                              <div className="w-12 text-xs font-mono text-center bg-blue-100 rounded px-1">
                                {activity.time}
                              </div>
                              <div className="flex-1">
                                <span className="font-medium">{activity.title}</span>
                                {activity.location && (
                                  <span className="text-gray-500 ml-2">
                                    <MapPin className="w-3 h-3 inline mr-1" />
                                    {activity.location}
                                  </span>
                                )}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {activity.activity_type}
                              </Badge>
                            </div>
                          ))}
                          {flow.activities.length > 3 && (
                            <div className="text-xs text-gray-500 text-center">
                              +{flow.activities.length - 3} more activities
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Admin Comments */}
                      {flow.admin_comments && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded mb-4">
                          <h5 className="font-medium text-yellow-800 text-sm mb-1">Admin Comments</h5>
                          <p className="text-sm text-yellow-700">{flow.admin_comments}</p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-xs text-gray-500">
                          Created {formatDate(flow.created_at)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedFlow(flow);
                              setShowDetailsModal(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                          {flow.status === 'submitted' && (
                            <>
                              <Button 
                                size="sm"
                                onClick={() => {
                                  setSelectedFlow(flow);
                                  setReviewAction('approved');
                                  setShowReviewModal(true);
                                }}
                                className="bg-green-500 hover:bg-green-600"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button 
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setSelectedFlow(flow);
                                  setReviewAction('rejected');
                                  setShowReviewModal(true);
                                }}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Details Modal */}
      {showDetailsModal && selectedFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <PlayCircle className="w-6 h-6" />
                    {selectedFlow.title}
                  </h2>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span>{selectedFlow.event_title}</span>
                    <span>•</span>
                    <span>{formatDate(selectedFlow.event_date)}</span>
                    <span>•</span>
                    <span>by {selectedFlow.organizer_name}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </Button>
              </div>

              <div className="space-y-6">
                {selectedFlow.description && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium mb-2">Description</h3>
                    <p className="text-sm text-gray-600">{selectedFlow.description}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Complete Activity Timeline ({selectedFlow.activities.length} activities)
                  </h3>
                  <div className="space-y-3">
                    {selectedFlow.activities.map((activity, index) => (
                      <div key={activity.id || index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0 w-20 text-center">
                          <div className="text-lg font-mono font-bold text-indigo-600">
                            {activity.time}
                          </div>
                          <div className="text-xs text-gray-500">
                            {activity.duration}min
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium">{activity.title}</h4>
                            <Badge variant="outline">
                              {activity.activity_type}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                          {activity.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-500">{activity.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">
                  {reviewAction === 'approved' ? '✅ Approve' : '❌ Reject'} Program Flow
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowReviewModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </Button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">{selectedFlow.title}</h3>
                  <p className="text-sm text-gray-600">{selectedFlow.event_title}</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    {reviewAction === 'approved' ? 'Approval Comments (Optional)' : 'Rejection Reason (Required)'}
                  </label>
                  <Textarea
                    value={adminComments}
                    onChange={(e) => setAdminComments(e.target.value)}
                    placeholder={
                      reviewAction === 'approved' 
                        ? "Add any comments for the organizer..."
                        : "Please explain why this program flow is being rejected..."
                    }
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t mt-6">
                <Button
                  onClick={handleReview}
                  className={reviewAction === 'approved' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}
                  disabled={reviewAction === 'rejected' && !adminComments.trim()}
                >
                  {reviewAction === 'approved' ? '✅ Approve' : '❌ Reject'} Program Flow
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowReviewModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProgramFlow;