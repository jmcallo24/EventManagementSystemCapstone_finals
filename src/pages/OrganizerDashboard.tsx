import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle, 
  Plus, 
  TrendingUp, 
  AlertCircle,
  CalendarDays,
  MapPin,
  Building,
  FileText,
  Award,
  Star,
  Heart,
  Share2,
  Download,
  LogOut,
  User,
  Settings,
  Filter,
  Search,
  Send,
  Camera,
  Bell,
  MessageCircle,
  MessageSquare,
  PlayCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import logo from "@/assets/image.png";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { autoCreateNotifications } from "@/lib/notificationService";
import { 
  SharedVenue, 
  uploadVenueImage,
  createVenuesFromApprovedEvents,
  loadVenuesFromDatabase
} from "@/lib/venueService";
import { 
  MultimediaPost, 
  createMultimediaPost, 
  getAllMultimediaPosts, 
  uploadMultimediaFile,
  likePost,
  addComment,
  getPostComments,
  MultimediaComment
} from "@/lib/multimediaService";
import {
  ProgramFlow,
  ProgramFlowActivity,
  CreateProgramFlowData,
  getProgramFlowsByOrganizer,
  getApprovedEventsForProgramFlow,
  createProgramFlow,
  updateProgramFlow,
  submitProgramFlow,
  deleteProgramFlow
} from "@/lib/programFlowService";

// Helper function to format dates
const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
};

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  organizer_name: string;
  current_participants: number;
  max_participants: number;
  status: "pending" | "approved" | "rejected" | "completed";
  event_type: string;
  description: string;
  isRegistered: boolean;
  isFavorite: boolean;
  isMyEvent: boolean; // NEW - indicates if this is user's approved request
}

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  type: "event_approved" | "event_rejected" | "event_reminder" | "registration_confirmed" | "announcement";
  is_read: boolean;
  related_event_id?: string;
}

interface Report {
  id: string;
  title: string;
  description: string;
  report_type: "rejection_complaint" | "technical_issue" | "general_inquiry" | "event_feedback";
  status: "open" | "in_progress" | "resolved" | "closed";
  admin_response?: string;
  created_at: string;
  related_event_id?: string;
  event_title?: string;
}

interface ReportMessage {
  id: string;
  message: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  created_at: string;
}

interface EventRequest {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  event_type: string;
  expected_participants: number;
  requirements?: string;
  budget_estimate?: number;
  request_reason: string;
  status: "pending" | "approved" | "rejected" | "under_review";
  admin_comments?: string;
  created_at: string;
}

// Multimedia Feed Component for Organizers
const MultimediaFeed = () => {
  const [posts, setPosts] = useState<MultimediaPost[]>([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postForm, setPostForm] = useState({
    title: "",
    content: "",
    media_type: "text" as "image" | "video" | "text" | "meme",
    tags: ""
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newComment, setNewComment] = useState<{ [postId: string]: string }>({});
  const [postComments, setPostComments] = useState<{ [postId: string]: MultimediaComment[] }>({});
  const [showComments, setShowComments] = useState<{ [postId: string]: boolean }>({});
  const { toast } = useToast();

  // Load posts from database
  const loadPosts = async () => {
    try {
      console.log('📱 ORGANIZER: Loading multimedia posts...');
      const allPosts = await getAllMultimediaPosts();
      setPosts(allPosts);
      console.log('✅ ORGANIZER: Loaded posts:', allPosts.length);
    } catch (error) {
      console.error("Error loading posts:", error);
    }
  };

  useEffect(() => {
    loadPosts();
    const interval = setInterval(loadPosts, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load comments for a specific post
  const loadCommentsForPost = async (postId: string) => {
    try {
      console.log('💬 Loading comments for post:', postId);
      const comments = await getPostComments(postId);
      setPostComments(prev => ({ ...prev, [postId]: comments }));
      console.log('✅ Loaded comments:', comments.length);
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  // Toggle comments visibility and load if needed
  const toggleComments = async (postId: string) => {
    const isCurrentlyShowing = showComments[postId];
    setShowComments(prev => ({ ...prev, [postId]: !isCurrentlyShowing }));
    
    // If showing comments and we don't have them loaded, load them
    if (!isCurrentlyShowing && !postComments[postId]) {
      await loadCommentsForPost(postId);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        setPostForm(prev => ({ ...prev, media_type: 'image' }));
      } else if (file.type.startsWith('video/')) {
        setPostForm(prev => ({ ...prev, media_type: 'video' }));
      }
    }
  };

  // Create new post
  const handleCreatePost = async () => {
    if (!postForm.content.trim()) {
      toast({
        title: "Content Required",
        description: "Please enter some content for your post",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      let mediaUrl = null;

      if (selectedFile) {
        console.log('📸 ORGANIZER: Uploading media file...');
        mediaUrl = await uploadMultimediaFile(selectedFile);
        if (!mediaUrl) {
          throw new Error("Failed to upload media");
        }
      }

      const newPost = await createMultimediaPost({
        user_name: "Event Organizer",
        user_role: "organizer",
        title: postForm.title,
        content: postForm.content,
        media_type: postForm.media_type,
        media_url: mediaUrl,
        tags: postForm.tags ? postForm.tags.split(',').map(t => t.trim()) : []
      });

      if (newPost) {
        toast({
          title: "🎉 Post Created!",
          description: "Your post has been shared successfully!"
        });
        
        setPostForm({ title: "", content: "", media_type: "text", tags: "" });
        setSelectedFile(null);
        setShowCreatePost(false);
        await loadPosts();
      }
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  // Handle like
  const handleLike = async (postId: string) => {
    try {
      console.log('👍 ORGANIZER: Liking post...', postId);
      const success = await likePost(postId, "00000000-0000-0000-0000-000000000001");
      
      if (success) {
        // Force immediate refresh
        await loadPosts();
        toast({
          title: "👍 Liked!",
          description: "You liked this post"
        });
      } else {
        toast({
          title: "Like Failed",
          description: "Could not like this post",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error liking post:", error);
      toast({
        title: "Error",
        description: "Failed to like post",
        variant: "destructive"
      });
    }
  };

  // Handle comment
  const handleComment = async (postId: string) => {
    const commentText = newComment[postId];
    if (!commentText?.trim()) return;

    try {
      console.log('💬 ORGANIZER: Adding comment...', postId, commentText);
      const comment = await addComment(postId, "00000000-0000-0000-0000-000000000001", "Event Organizer", commentText);
      
      if (comment) {
        // Clear comment input immediately
        setNewComment(prev => ({ ...prev, [postId]: "" }));
        
        // Force immediate refresh to show new comment
        await loadPosts();
        
        toast({
          title: "💬 Comment Added!",
          description: "Your comment has been posted"
        });
      } else {
        toast({
          title: "Comment Failed",
          description: "Could not add comment",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Create Post Button */}
      <Card className="card-elevated">
        <CardContent className="pt-6">
          <Button
            onClick={() => setShowCreatePost(true)}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center gap-2 py-4"
            size="lg"
          >
            <Plus className="w-5 h-5" />
            What's happening at your event? Share a moment! 🎉
          </Button>
        </CardContent>
      </Card>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-xl font-bold mb-4">🎬 Create New Post</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="post-title">Title (Optional)</Label>
                <Input
                  id="post-title"
                  placeholder="Add a catchy title..."
                  value={postForm.title}
                  onChange={(e) => setPostForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="post-content">Content *</Label>
                <Textarea
                  id="post-content"
                  rows={4}
                  placeholder="What's on your mind? Share your event updates, funny moments, memes!"
                  value={postForm.content}
                  onChange={(e) => setPostForm(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="post-tags">Tags (comma-separated)</Label>
                <Input
                  id="post-tags"
                  placeholder="funny, event, sports, meme, success"
                  value={postForm.tags}
                  onChange={(e) => setPostForm(prev => ({ ...prev, tags: e.target.value }))}
                />
              </div>

              <div>
                <Label>Media Type</Label>
                <div className="flex gap-2 mt-2">
                  {[
                    { type: 'text', label: 'Text' },
                    { type: 'image', label: 'Image' },
                    { type: 'video', label: 'Video' },
                    { type: 'meme', label: 'Meme' }
                  ].map(({ type, label }) => (
                    <Button
                      key={type}
                      variant={postForm.media_type === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPostForm(prev => ({ ...prev, media_type: type as any }))}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {(postForm.media_type === 'image' || postForm.media_type === 'video') && (
                <div>
                  <Label htmlFor="post-file">Upload File</Label>
                  <Input
                    id="post-file"
                    type="file"
                    accept={postForm.media_type === 'image' ? 'image/*' : 'video/*'}
                    onChange={handleFileSelect}
                  />
                  {selectedFile && (
                    <p className="text-sm text-gray-600 mt-1">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleCreatePost}
                disabled={uploading}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600"
              >
                {uploading ? "Posting..." : "🚀 Post"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreatePost(false);
                  setPostForm({ title: "", content: "", media_type: "text", tags: "" });
                  setSelectedFile(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Posts Feed */}
      <div className="space-y-6">
        {posts.length === 0 ? (
          <Card className="card-elevated">
            <CardContent className="text-center py-12">
              <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No posts yet!</h3>
              <p className="text-gray-500 mb-4">Be the first to share something awesome!</p>
              <Button
                onClick={() => setShowCreatePost(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Post
              </Button>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="card-elevated">
              <CardContent className="p-6">
                {/* Post Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {post.user_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{post.user_name}</h4>
                    <p className="text-sm text-gray-500">{formatDate(post.created_at)} • {post.user_role}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {post.media_type}
                  </Badge>
                </div>

                {/* Post Title */}
                {post.title && (
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{post.title}</h3>
                )}

                {/* Post Content */}
                <div className="mb-4">
                  <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
                </div>

                {/* Post Media */}
                {post.media_url && (
                  <div className="mb-4">
                    {post.media_type === 'image' || post.media_type === 'meme' ? (
                      <img 
                        src={post.media_url} 
                        alt="Post media" 
                        className="w-full max-h-96 object-cover rounded-lg cursor-pointer"
                        onClick={() => window.open(post.media_url, '_blank')}
                      />
                    ) : post.media_type === 'video' ? (
                      <video 
                        src={post.media_url} 
                        controls 
                        className="w-full max-h-96 rounded-lg"
                      />
                    ) : null}
                  </div>
                )}

                {/* Post Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Post Actions */}
                <div className="flex items-center gap-6 pt-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(post.id)}
                    className="flex items-center gap-2 text-gray-600 hover:text-red-500"
                  >
                    <Heart className="w-4 h-4" />
                    {post.likes_count} Likes
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-2 text-gray-600 hover:text-blue-500"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {post.comments_count} Comments
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 text-gray-600 hover:text-green-500"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                </div>

                {/* Comments Display */}
                {showComments[post.id] && (
                  <div className="mt-4 pt-4 border-t bg-gray-50 -mx-6 px-6 py-4">
                    <h4 className="font-medium text-gray-900 mb-3">Comments</h4>
                    {postComments[post.id] && postComments[post.id].length > 0 ? (
                      <div className="space-y-3">
                        {postComments[post.id].map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {comment.user_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
                                <h5 className="font-medium text-sm text-gray-900">{comment.user_name}</h5>
                                <p className="text-gray-800 text-sm">{comment.comment_text}</p>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDate(comment.created_at)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
                    )}
                  </div>
                )}

                {/* Comment Input */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex gap-3">
                    <Input
                      placeholder="Write a comment..."
                      value={newComment[post.id] || ""}
                      onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleComment(post.id);
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleComment(post.id)}
                      disabled={!newComment[post.id]?.trim()}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

// Program Flow Card Component
interface ProgramFlowCardProps {
  flow: ProgramFlow;
  onSubmit?: (flowId: string) => Promise<void>;
  onDelete?: (flowId: string) => Promise<void>;
  onEdit?: (flow: ProgramFlow) => void;
  onViewDetails?: (flow: ProgramFlow) => void;
}

const ProgramFlowCard = ({ flow, onSubmit, onDelete, onEdit, onViewDetails }: ProgramFlowCardProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="card-elevated">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <CardTitle className="text-xl">{flow.title}</CardTitle>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
                <span>{flow.activities.length} Activities</span>
              </div>
            </div>
            {flow.description && (
              <p className="text-sm text-muted-foreground">{flow.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Badge 
              variant={
                flow.status === 'approved' ? 'default' :
                flow.status === 'submitted' ? 'secondary' :
                flow.status === 'rejected' ? 'destructive' : 'outline'
              }
              className="whitespace-nowrap"
            >
              {flow.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
              {flow.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
              {flow.status === 'submitted' && <Clock className="w-3 h-3 mr-1" />}
              {flow.status.charAt(0).toUpperCase() + flow.status.slice(1)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Activities Timeline Preview */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <PlayCircle className="w-4 h-4" />
            Activity Timeline
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {flow.activities.slice(0, 3).map((activity, index) => (
              <div key={activity.id || index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-shrink-0 w-16 text-xs font-mono text-center bg-primary/10 rounded px-2 py-1">
                  {activity.time}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="font-medium text-sm truncate">{activity.title}</h5>
                    <Badge variant="outline" className="text-xs">
                      {activity.activity_type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{activity.description}</p>
                  {activity.location && (
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate">{activity.location}</span>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 text-xs text-muted-foreground">
                  {activity.duration}min
                </div>
              </div>
            ))}
            {flow.activities.length > 3 && (
              <div className="text-center py-2">
                <Badge variant="outline" className="text-xs">
                  +{flow.activities.length - 3} more activities
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t">
          <div className="text-xs text-muted-foreground">
            Created {formatDate(flow.created_at)}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onViewDetails?.(flow)}
            >
              <Eye className="w-4 h-4 mr-1" />
              View Details
            </Button>
            {flow.status === 'draft' && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onEdit?.(flow)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  size="sm"
                  onClick={() => onSubmit?.(flow.id)}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  <Send className="w-4 h-4 mr-1" />
                  Submit
                </Button>
              </>
            )}
            {flow.status !== 'approved' && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => onDelete?.(flow.id)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const OrganizerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [multimediaPosts, setMultimediaPosts] = useState<MultimediaPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportMessages, setReportMessages] = useState<ReportMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newReportTitle, setNewReportTitle] = useState("");
  const [newReportDescription, setNewReportDescription] = useState("");
  const [newReportType, setNewReportType] = useState<"rejection_complaint" | "technical_issue" | "general_inquiry" | "event_feedback">("rejection_complaint");
  const [showNewReportForm, setShowNewReportForm] = useState(false);
  
  // Event details modal
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  
  // Event Request states
  const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [newEventRequest, setNewEventRequest] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    venue: "",
    event_type: "Academic",
    custom_event_type: "", // NEW: For custom event type when "Others" is selected
    expected_participants: 50,
    requirements: "",
    budget_estimate: 0,
    request_reason: ""
  });

  // FIXED SCHOOL CALENDAR EVENTS (From STLINK COLLEGE Calendar 2025-2026)
  const FIXED_SCHOOL_EVENTS = [
    // June 2025
    { id: 'fixed-1', title: 'Brigada Eskwela (All Dept)', date: '2025-06-25', type: 'Academic', description: 'All Campuses', isFixed: true },
    { id: 'fixed-2', title: 'INSET (All Dept)', date: '2025-06-27', type: 'Academic', description: 'MV Gymnasium', isFixed: true },
    { id: 'fixed-3', title: 'Distribution of Loads', date: '2025-06-28', type: 'Academic', description: 'All Departments', isFixed: true },
    { id: 'fixed-4', title: 'Orientation on the Research Activities for the Semester', date: '2025-07-01', type: 'Research', description: 'Research orientation', isFixed: true },
    
    // July 2025
    { id: 'fixed-5', title: 'Title Proposal', date: '2025-07-10', type: 'Research', description: 'Research title proposal submission', isFixed: true },
    { id: 'fixed-6', title: 'Research Forum CHTBAM, BSIT and BSCPE', date: '2025-07-13', type: 'Research', description: 'Tech programs research forum', isFixed: true },
    { id: 'fixed-7', title: 'Student Orientation', date: '2025-07-14', type: 'Academic', description: 'New student orientation', isFixed: true },
    { id: 'fixed-8', title: 'Research Forum BS Criminology', date: '2025-07-20', type: 'Research', description: 'Criminology research forum', isFixed: true },
    { id: 'fixed-9', title: 'INC Founding Anniversary (Special Non-Working Holiday)', date: '2025-07-27', type: 'Holiday', description: 'Special holiday', isFixed: true },
    { id: 'fixed-10', title: 'Nutrition Month Celebration', date: '2025-07-31', type: 'Cultural', description: 'Slogan Making Contest, Filipino Food Cooking Contest, SPS Project', isFixed: true },
    
    // August 2025
    { id: 'fixed-11', title: 'Research Forum BSBA, BSEntrep and BSAIS', date: '2025-08-03', type: 'Research', description: 'Business programs research forum', isFixed: true },
    { id: 'fixed-12', title: 'Administration of Preliminary Examination', date: '2025-08-10', type: 'Examination', description: 'Preliminary exams for all departments', isFixed: true },
    { id: 'fixed-13', title: 'Research Forum SHS', date: '2025-08-11', type: 'Research', description: 'Senior High School research forum', isFixed: true },
    { id: 'fixed-14', title: 'Start of Photoshoot for Graduating Students', date: '2025-08-11', type: 'Academic', description: 'Academic Year 2025-2026', isFixed: true },
    { id: 'fixed-15', title: 'ENTREP EXPO FAIR 2025 – Buss. Programs', date: '2025-08-18', type: 'Academic', description: 'MV & Annex Campus 8:00am – 5:00pm', isFixed: true },
    { id: 'fixed-16', title: 'Ninoy Aquino Day (Special Non-Working Holiday)', date: '2025-08-21', type: 'Holiday', description: 'Special holiday', isFixed: true },
    { id: 'fixed-17', title: 'National Heroes Day (Regular Holiday)', date: '2025-08-25', type: 'Holiday', description: 'Regular holiday', isFixed: true },
    { id: 'fixed-18', title: 'Departmental Sportsfest (SHS & Coll. Dept)', date: '2025-08-25', type: 'Sports', description: 'Sports festival', isFixed: true },
    
    // September 2025
    { id: 'fixed-19', title: '1st Quarter Examination SHS Dept.', date: '2025-09-08', type: 'Examination', description: 'First quarter exams', isFixed: true },
    { id: 'fixed-20', title: 'Payment week for Midterm Examination', date: '2025-09-08', type: 'Academic', description: 'Midterm exam payment', isFixed: true },
    { id: 'fixed-21', title: 'Administration of Midterm Examination (College Department)', date: '2025-09-18', type: 'Examination', description: 'Midterm exams for college', isFixed: true },
    { id: 'fixed-22', title: 'Submission Deadline of 1st Quarter Grades (SHS Dept.)', date: '2025-09-19', type: 'Academic', description: 'Grade submission deadline', isFixed: true },
    { id: 'fixed-23', title: 'School Sports fest', date: '2025-09-26', type: 'Sports', description: 'School-wide sports festival', isFixed: true },
    
    // October 2025
    { id: 'fixed-24', title: 'Parent\'s Teacher\'s Conference (PTC)/ Releasing of First Quarter Cards', date: '2025-09-26', type: 'Academic', description: 'PTC and card distribution', isFixed: true },
    { id: 'fixed-25', title: 'Administration of Final Examination (College Department)', date: '2025-10-27', type: 'Examination', description: 'Final exams for college', isFixed: true },
    { id: 'fixed-26', title: 'All Saint\'s Eve & All Saint\'s Day (SPECIAL Non-Working Holiday)', date: '2025-10-31', type: 'Holiday', description: 'Special holiday', isFixed: true },
    { id: 'fixed-27', title: 'Start of Semestral Break (SHS Dept.)', date: '2025-10-31', type: 'Academic', description: 'SHS semestral break begins', isFixed: true },
    
    // November 2025
    { id: 'fixed-28', title: 'Submission Deadline of Second Quarter Grades', date: '2025-11-10', type: 'Academic', description: 'Second quarter grade submission', isFixed: true },
    { id: 'fixed-29', title: 'Parents-Teachers Conference (PTC) / Releasing of First Semester Cards (SHS Dept.)', date: '2025-11-13', type: 'Academic', description: 'SHS PTC and card release', isFixed: true }
  ];

  // Separate data for different purposes
  const [allEventsForCalendar, setAllEventsForCalendar] = useState<Event[]>([]); // For calendar display (includes fixed events)
  const [registerableEvents, setRegisterableEvents] = useState<Event[]>([]); // For Events tab (only approved registerable events)
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  
  // Venue management state
  const [venues, setVenues] = useState<SharedVenue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<SharedVenue | null>(null);

  // Program Flow state
  const [programFlows, setProgramFlows] = useState<ProgramFlow[]>([]);
  const [approvedEvents, setApprovedEvents] = useState<any[]>([]);
  const [selectedProgramFlow, setSelectedProgramFlow] = useState<ProgramFlow | null>(null);
  const [showProgramFlowForm, setShowProgramFlowForm] = useState(false);
  const [showProgramFlowDetails, setShowProgramFlowDetails] = useState(false);
  const [programFlowForm, setProgramFlowForm] = useState({
    event_id: "",
    title: "",
    description: "",
    activities: [] as Omit<ProgramFlowActivity, 'id'>[]
  });
  const [newActivity, setNewActivity] = useState({
    time: "",
    title: "",
    description: "",
    location: "",
    duration: 60,
    activity_type: "activity" as ProgramFlowActivity['activity_type']
  });
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [venueImageFile, setVenueImageFile] = useState<File | null>(null);
  const [venueImageUrl, setVenueImageUrl] = useState<string>('');
  
  // Program Flow Filters and Search
  const [programFlowFilter, setProgramFlowFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [programFlowSearch, setProgramFlowSearch] = useState('');
  const [venueFormData, setVenueFormData] = useState({
    name: '',
    capacity: '',
    location: '',
    description: '',
    amenities: '',
    status: 'available'
  });

  // Load events for CALENDAR display (includes all types)
  const loadCalendarEvents = async () => {
    try {
      setLoading(true);
      
      console.log('🔥 ORGANIZER: Loading ALL events from ALL sources INCLUDING ADMIN CALENDAR...');
      
      // Get ALL events from ALL tables (SAME as Admin Dashboard + Admin Calendar)
      const [
        { data: eventsData }, 
        { data: eventRequestsData },
        { data: calendarEventsData }
      ] = await Promise.all([
        // Organizer-created events
        supabase
          .from('events')
          .select(`
            *,
            organizer:organizer_id (name)
          `)
          .order('created_at', { ascending: false }),

        // Participant-requested events
        supabase
          .from('event_requests')
          .select(`
            *,
            requester:requester_id (name, email)
          `)
          .order('created_at', { ascending: false }),
          
        // ADMIN CALENDAR EVENTS - This is what was missing!
        supabase
          .from('calendar_events')
          .select('*')
          .order('date', { ascending: true })
      ]);

      console.log('📊 ORGANIZER: Event sources loaded (INCLUDING ADMIN CALENDAR):');
      console.log('- Events table:', eventsData?.length || 0, 'events');
      console.log('- Event requests table:', eventRequestsData?.length || 0, 'requests');
      console.log('- Calendar events table:', calendarEventsData?.length || 0, 'calendar events');
      console.log('- Fixed school events:', FIXED_SCHOOL_EVENTS.length, 'fixed events');

      if (!user?.id) {
        setAllEventsForCalendar([]);
        return;
      }

      // Get user's registrations and favorites
      let registrations = [];
      let favorites = [];
      
      try {
        const { data: regData } = await supabase
          .from('event_registrations')
          .select('event_id')
          .eq('participant_id', user.id);
        registrations = regData || [];
      } catch (error) {
        console.log('Event registrations table not found, creating empty array...');
        registrations = [];
      }
      
      try {
        const { data: favData } = await supabase
          .from('event_favorites')
          .select('event_id')
          .eq('user_id', user.id);
        favorites = favData || [];
      } catch (error) {
        console.log('Event favorites table not found, creating empty array...');
        favorites = [];
      }

      const registrationIds = registrations?.map(r => r.event_id) || [];
      const favoriteIds = favorites?.map(f => f.event_id) || [];

      const allEvents: Event[] = [];

      // Process events from events table (EXACT SAME as Admin Dashboard)
      if (eventsData) {
        for (const event of eventsData) {
          // Get REAL participant count from event_registrations
          const { count, error: countError } = await supabase
            .from('event_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);

          const realParticipantCount = countError ? 0 : (count || 0);

          allEvents.push({
            id: event.id,
            title: event.title,
            date: event.date,
            time: event.time || '00:00',
            venue: event.venue || 'TBA',
            organizer_name: event.organizer?.name || 'Administrator',
            current_participants: realParticipantCount,
            max_participants: event.max_participants || 100,
            status: event.status,
            event_type: event.event_type || 'General',
            description: event.description || '',
            isRegistered: registrationIds.includes(event.id),
            isFavorite: favoriteIds.includes(event.id),
            isMyEvent: false // These are admin/organizer events
          });
        }
      }

      // Process approved event requests (EXACT SAME as Admin Dashboard)
      if (eventRequestsData) {
        for (const request of eventRequestsData) {
          // Get REAL participant count from event_registrations
          const { count, error: countError } = await supabase
            .from('event_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', request.id);

          const realParticipantCount = countError ? 0 : (count || 0);

          allEvents.push({
            id: request.id,
            title: request.title,
            date: request.date,
            time: request.time || '00:00',
            venue: request.venue || 'TBA',
            organizer_name: request.requester?.name || 'Event Requester',
            current_participants: realParticipantCount,
            max_participants: request.expected_participants || 50,
            status: request.status,
            event_type: request.event_type || 'General',
            description: request.description || '',
            isRegistered: request.requester_id === user.id || registrationIds.includes(request.id),
            isFavorite: favoriteIds.includes(request.id),
            isMyEvent: request.requester_id === user.id // This is their approved event
          });
        }
      }

      // Process ADMIN CALENDAR EVENTS (custom events from admin calendar)
      if (calendarEventsData) {
        for (const calEvent of calendarEventsData) {
          allEvents.push({
            id: calEvent.id,
            title: calEvent.title,
            date: calEvent.date,
            time: '09:00', // Default time for calendar events
            venue: 'Campus', // Default venue
            organizer_name: 'Administration',
            current_participants: 0,
            max_participants: 100,
            status: 'approved',
            event_type: calEvent.type || 'Academic',
            description: calEvent.description || '',
            isRegistered: false, // Calendar events don't have registrations
            isFavorite: false,
            isMyEvent: false // These are admin events
          });
        }
      }

      // Process FIXED SCHOOL EVENTS (hardcoded official events)
      for (const fixedEvent of FIXED_SCHOOL_EVENTS) {
        allEvents.push({
          id: fixedEvent.id,
          title: fixedEvent.title,
          date: fixedEvent.date,
          time: '09:00', // Default time
          venue: 'Campus',
          organizer_name: 'School Administration',
          current_participants: 0,
          max_participants: 200,
          status: 'approved',
          event_type: fixedEvent.type,
          description: fixedEvent.description,
          isRegistered: false, // Fixed events don't have registrations
          isFavorite: false,
          isMyEvent: false // These are school events
        });
      }

      console.log('🎯 ORGANIZER: PROCESSED EVENTS (INCLUDING ADMIN CALENDAR):', allEvents.length);
      console.log('📈 TOTAL PARTICIPANTS:', allEvents.reduce((sum, e) => sum + e.current_participants, 0));
      console.log('📅 EVENT SOURCES BREAKDOWN:');
      console.log('- Regular events:', eventsData?.length || 0);
      console.log('- Event requests:', eventRequestsData?.length || 0);
      console.log('- Admin calendar events:', calendarEventsData?.length || 0);
      console.log('- Fixed school events:', FIXED_SCHOOL_EVENTS.length);
      
      console.log('✅ ORGANIZER: Final events with REAL participant counts:');
      allEvents.forEach(event => {
        console.log(`📅 ${event.title} (${event.event_type}): ${event.current_participants}/${event.max_participants} - ${event.date} - ${event.organizer_name}`);
      });
      
      console.log('🎯 ORGANIZER CALENDAR: Setting', allEvents.length, 'events for calendar display');
      setAllEventsForCalendar(allEvents);
      
    } catch (error) {
      console.error('Error loading events:', error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive"
      });
      setAllEventsForCalendar([]);
    } finally {
      setLoading(false);
    }
  };

  // Load events for EVENTS TAB (only approved registerable events)
  const loadRegisterableEvents = async () => {
    try {
      console.log('🎫 ORGANIZER EVENTS: Loading registerable events only...');
      
      // Get only approved events from events and event_requests tables (NO calendar events, NO fixed events)
      const [{ data: eventsData }, { data: eventRequestsData }] = await Promise.all([
        // Regular events from events table
        supabase
          .from('events')
          .select(`
            *,
            organizer:organizer_id (name)
          `)
          .eq('status', 'approved') // Only approved events
          .order('date', { ascending: true }),

        // Approved participant requests
        supabase
          .from('event_requests')
          .select(`
            *,
            requester:requester_id (name, email)
          `)
          .eq('status', 'approved') // Only approved requests
          .order('date', { ascending: true })
      ]);

      if (!user?.id) {
        setRegisterableEvents([]);
        return;
      }

      // Get user's registrations and favorites
      let registrations = [];
      let favorites = [];
      
      try {
        const { data: regData } = await supabase
          .from('event_registrations')
          .select('event_id')
          .eq('participant_id', user.id);
        registrations = regData || [];
      } catch (error) {
        console.log('Event registrations table not found...');
        registrations = [];
      }
      
      try {
        const { data: favData } = await supabase
          .from('event_favorites')
          .select('event_id')
          .eq('user_id', user.id);
        favorites = favData || [];
      } catch (error) {
        console.log('Event favorites table not found...');
        favorites = [];
      }

      const registrationIds = registrations?.map(r => r.event_id) || [];
      const favoriteIds = favorites?.map(f => f.event_id) || [];

      const registerableEventsList: Event[] = [];

      // Process regular approved events (registerable)
      if (eventsData) {
        for (const event of eventsData) {
          const { count, error: countError } = await supabase
            .from('event_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);

          const realParticipantCount = countError ? 0 : (count || 0);

          registerableEventsList.push({
            id: event.id,
            title: event.title,
            date: event.date,
            time: event.time || '00:00',
            venue: event.venue || 'TBA',
            organizer_name: event.organizer?.name || 'Event Organizer',
            current_participants: realParticipantCount,
            max_participants: event.max_participants || 100,
            status: event.status,
            event_type: event.event_type || 'General',
            description: event.description || '',
            isRegistered: registrationIds.includes(event.id),
            isFavorite: favoriteIds.includes(event.id),
            isMyEvent: false
          });
        }
      }

      // Process approved event requests (registerable)
      if (eventRequestsData) {
        for (const request of eventRequestsData) {
          const { count, error: countError } = await supabase
            .from('event_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', request.id);

          const realParticipantCount = countError ? 0 : (count || 0);

          registerableEventsList.push({
            id: request.id,
            title: request.title,
            date: request.date,
            time: request.time || '00:00',
            venue: request.venue || 'TBA',
            organizer_name: request.requester?.name || 'Event Requester',
            current_participants: realParticipantCount,
            max_participants: request.expected_participants || 50,
            status: 'approved',
            event_type: request.event_type || 'General',
            description: request.description || '',
            isRegistered: request.requester_id === user.id || registrationIds.includes(request.id),
            isFavorite: favoriteIds.includes(request.id),
            isMyEvent: request.requester_id === user.id
          });
        }
      }

      console.log('🎫 ORGANIZER EVENTS: Loaded', registerableEventsList.length, 'registerable events');
      console.log('- Regular events:', eventsData?.length || 0);
      console.log('- Approved requests:', eventRequestsData?.length || 0);
      
      setRegisterableEvents(registerableEventsList);
      
    } catch (error) {
      console.error('Error loading registerable events:', error);
      setRegisterableEvents([]);
    }
  };

  const loadNotifications = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }
      
      console.log('Loaded notifications:', data);
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadReports = async () => {
    if (!user?.id) return;
    
    try {
      console.log('Loading reports for user:', user.id);
      
      // Simple query first - just get reports for this user
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('reporter_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Reports query error:', error);
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
      
      console.log('Raw reports data:', data);
      
      // Format reports with event titles (simple fallback)
      const formattedReports: Report[] = (data || []).map(report => ({
        ...report,
        event_title: report.related_event_id ? 'Related Event' : 'General Report'
      }));
      
      console.log('Formatted reports:', formattedReports);
      setReports(formattedReports);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast({
        title: "Error",
        description: "Failed to load reports. Please check database setup.",
        variant: "destructive"
      });
      setReports([]);
    }
  };

  const loadReportMessages = async (reportId: string) => {
    try {
      console.log('Loading messages for report:', reportId);
      
      // Simple query first
      const { data, error } = await supabase
        .from('report_messages')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }
      
      console.log('Raw messages data:', data);
      
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
            sender_name: msg.sender_id === user?.id ? 'You' : 'Admin',
            sender_role: msg.sender_id === user?.id ? 'participant' : 'admin',
            created_at: msg.created_at
          }));
        }
      }
      
      console.log('Formatted messages:', formattedMessages);
      setReportMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading report messages:', error);
    }
  };

  const loadEventRequests = async () => {
    if (!user?.id) return;
    
    try {
      console.log('Loading event requests for user:', user.id);
      
      const { data, error } = await supabase
        .from('event_requests')
        .select('*')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Event requests loaded:', data);
      setEventRequests(data || []);
    } catch (error) {
      console.error('Error loading event requests:', error);
      toast({
        title: "Info",
        description: "No event requests found or table not created yet.",
      });
      setEventRequests([]);
    }
  };

  // Load venues from VENUES DATABASE (REAL DATABASE!)
  const loadVenues = async () => {
    try {
      console.log('🔥 ORGANIZER: Loading venues from VENUES DATABASE...');
      
      // First try to load existing venues
      const existingVenues = await loadVenuesFromDatabase();
      
      if (existingVenues.length > 0) {
        console.log('✅ ORGANIZER: Found existing venues:', existingVenues.length);
        setVenues(existingVenues);
        return;
      }
      
      // If no venues, force create from approved events
      console.log('📝 ORGANIZER: No venues found, creating from approved events...');
      const createdVenues = await createVenuesFromApprovedEvents();
      
      if (createdVenues.length > 0) {
        console.log('✅ ORGANIZER: Created venues from events:', createdVenues.length);
        setVenues(createdVenues);
      } else {
        // Try loading again in case they were created
        const newVenues = await loadVenuesFromDatabase();
        if (newVenues.length > 0) {
          console.log('✅ ORGANIZER: Found venues after creation:', newVenues.length);
          setVenues(newVenues);
        } else {
          console.log('⚠️ ORGANIZER: Still no venues found after creation attempt');
          setVenues([]);
        }
      }
      
    } catch (error) {
      console.error('Error loading venues:', error);
      setVenues([]);
    }
  };

  // Venue management functions
  const handleVenueEdit = (venue: SharedVenue) => {
    setSelectedVenue(venue);
    setVenueFormData({
      name: venue.name,
      capacity: venue.capacity.toString(),
      location: venue.location,
      description: venue.description || '',
      amenities: venue.amenities?.join(', ') || '',
      status: venue.status || 'available'
    });
    setShowVenueModal(true);
  };

  const handleVenueDelete = async (venueId: string) => {
    if (confirm('Are you sure you want to delete this venue? This will remove it from the database.')) {
      try {
        // Delete from database
        const { error } = await supabase
          .from('venues')
          .update({ is_active: false })
          .eq('id', venueId);

        if (error) {
          console.error('❌ Database delete error:', error);
          throw error;
        }

        console.log('✅ VENUE DELETED FROM DATABASE!');
        
        // Refresh venues from database
        await loadVenues();
        
        toast({
          title: "Success",
          description: "Venue deleted from DATABASE! Admin will see this change immediately!",
        });
      } catch (error) {
        console.error('Error deleting venue:', error);
        toast({
          title: "Error", 
          description: "Failed to delete venue",
          variant: "destructive"
        });
      }
    }
  };

  const handleVenueImageUpload = async (file: File) => {
    try {
      console.log('🖼️ ORGANIZER: Starting image upload...', file.name);
      
      toast({
        title: "Uploading...",
        description: "Please wait while we upload your image.",
      });

      const imageUrl = await uploadVenueImage(file);
      
      if (!imageUrl) {
        console.error('❌ uploadVenueImage returned null');
        toast({
          title: "Upload Failed",
          description: "Failed to upload image to storage. Please try again.",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Image uploaded successfully:', imageUrl);

      if (selectedVenue) {
        // EDIT MODE: Save image URL to existing venue in database
        console.log('🖼️ ORGANIZER: Saving image to existing venue in database...', selectedVenue.id);
        
        const { error } = await supabase
          .from('venues')
          .update({ 
            image_url: imageUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedVenue.id);

        if (error) {
          console.error('❌ Database image save error:', error);
          toast({
            title: "Database Error",
            description: `Failed to save image URL to database: ${error.message}`,
            variant: "destructive"
          });
          return;
        }

        console.log('✅ IMAGE SAVED TO DATABASE!');
        
        // Refresh venues and update selected venue
        await loadVenues();
        setSelectedVenue({...selectedVenue, image_url: imageUrl});
        
        toast({
          title: "SUCCESS!",
          description: "Image uploaded and saved to database!",
        });
      } else {
        // CREATE MODE: Store the image URL for use when creating the venue
        console.log('📝 CREATE MODE: Image uploaded, will be saved when venue is created');
        
        // Store both file and URL for later use
        setVenueImageFile(file);
        setVenueImageUrl(imageUrl);
        
        toast({
          title: "✅ Image Ready!",
          description: "Image uploaded successfully. It will be saved when you create the venue.",
        });
      }
      
    } catch (error) {
      console.error('❌ Image upload error:', error);
      toast({
        title: "Upload Failed",
        description: `Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const handleVenueSave = async () => {
    try {
      // Validation
      if (!venueFormData.name?.trim()) {
        toast({
          title: "Missing Information",
          description: "Please enter a venue name",
          variant: "destructive"
        });
        return;
      }

      if (!venueFormData.location?.trim()) {
        toast({
          title: "Missing Information", 
          description: "Please enter a venue location",
          variant: "destructive"
        });
        return;
      }

      if (!venueFormData.capacity?.trim() || parseInt(venueFormData.capacity) <= 0) {
        toast({
          title: "Missing Information",
          description: "Please enter a valid capacity (greater than 0)",
          variant: "destructive"
        });
        return;
      }

      console.log('💾 ORGANIZER: Saving venue...', {
        mode: selectedVenue ? 'UPDATE' : 'CREATE',
        data: venueFormData
      });

      // Prepare venue data with proper types (matching database constraint)
      const venueData = {
        name: venueFormData.name.trim(),
        description: venueFormData.description?.trim() || 'Event venue',
        capacity: parseInt(venueFormData.capacity),
        location: venueFormData.location.trim(),
        venue_type: 'auditorium', // Fixed: use 'auditorium' instead of 'event_venue'
        facilities: venueFormData.amenities ? 
          venueFormData.amenities.split(',').map(a => a.trim()).filter(a => a.length > 0) : 
          ['Audio System', 'Seating', 'Lighting'], // Default facilities like existing venues
        hourly_rate: 0.00, // Match the decimal format in database
        is_active: true,
        updated_at: new Date().toISOString()
      };

      if (selectedVenue) {
        // UPDATE existing venue
        console.log('🔄 Updating venue:', selectedVenue.id);
        
        const { data, error } = await supabase
          .from('venues')
          .update(venueData)
          .eq('id', selectedVenue.id)
          .select()
          .single();

        if (error) {
          console.error('❌ Update error:', error);
          toast({
            title: "Update Failed",
            description: `Database error: ${error.message}`,
            variant: "destructive"
          });
          return;
        }

        console.log('✅ Venue updated:', data);
        
        toast({
          title: "✅ Venue Updated!",
          description: `"${venueData.name}" has been updated successfully`,
        });
        
      } else {
        // CREATE new venue
        console.log('➕ Creating new venue...');
        
        const { data, error } = await supabase
          .from('venues')
          .insert({
            ...venueData,
            image_url: venueImageUrl || null, // Include uploaded image URL
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Create error:', error);
          
          // Handle specific error cases
          if (error.message.includes('relation "venues" does not exist')) {
            toast({
              title: "Database Error",
              description: "Venues table not found. Please run database setup first.",
              variant: "destructive"
            });
          } else if (error.message.includes('duplicate key')) {
            toast({
              title: "Duplicate Venue",
              description: "A venue with this name already exists",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Create Failed",
              description: `Database error: ${error.message}`,
              variant: "destructive"
            });
          }
          return;
        }

        console.log('✅ Venue created:', data);
        
        toast({
          title: "✅ Venue Created!",
          description: `"${venueData.name}" has been created successfully`,
        });
      }

      // Close modal and reset
      setShowVenueModal(false);
      setSelectedVenue(null);
      setVenueFormData({
        name: '',
        capacity: '',
        location: '',
        description: '',
        amenities: '',
        status: 'available'
      });
      setVenueImageFile(null);
      setVenueImageUrl('');

      // Refresh venues list
      try {
        await loadVenues();
        console.log('✅ Venues refreshed');
      } catch (refreshError) {
        console.log('⚠️ Failed to refresh venues (non-critical):', refreshError);
      }
        
    } catch (error) {
      console.error('❌ Venue save error:', error);
      toast({
        title: "Error",
        description: `Failed to save venue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  // Program Flow Functions - Using admin_comments column for JSON storage (working approach)
  const loadProgramFlows = async () => {
    if (!user?.id) return;
    
    try {
      console.log('📋 ORGANIZER: Loading program flows from admin_comments...');
      
      // Look for ALL event_requests that have JSON data in admin_comments starting with "PROGRAM_FLOW:"
      const { data, error } = await supabase
        .from('event_requests')
        .select('*')
        .ilike('admin_comments', 'PROGRAM_FLOW:%')
        .eq('status', 'approved'); // Only load program flows for approved events

      if (error) {
        console.error('❌ ORGANIZER: Database error:', error);
        setProgramFlows([]);
        return;
      }

      // Convert event_requests with program flow data to ProgramFlow objects
      const flows: ProgramFlow[] = data?.map(req => {
        try {
          // Extract JSON from admin_comments
          const jsonData = req.admin_comments?.replace('PROGRAM_FLOW:', '') || '{}';
          const programData = JSON.parse(jsonData);
          
          return {
            id: programData.id || req.id,
            event_id: req.id,
            event_title: req.title,
            event_date: req.date,
            organizer_id: programData.organizer_id || req.requester_id,
            organizer_name: programData.organizer_name || 'Event Organizer',
            title: programData.title || req.title + ' Program Flow',
            description: programData.description || '',
            status: programData.status || 'draft',
            activities: programData.activities || [],
            created_at: programData.created_at || req.created_at,
            updated_at: programData.updated_at || req.updated_at,
            is_active: programData.is_active !== false,
            admin_comments: programData.admin_comments
          };
        } catch (parseError) {
          console.error('❌ ORGANIZER: JSON parse error:', parseError);
          return null;
        }
      }).filter(Boolean) || [];

      setProgramFlows(flows);
      console.log('✅ ORGANIZER: Loaded program flows from admin_comments:', flows.length);
      if (flows.length > 0) {
        flows.forEach(flow => {
          console.log('- Program Flow:', flow.title, 'for event:', flow.event_title, 'by:', flow.organizer_name);
        });
      }
      
    } catch (error) {
      console.error('❌ ORGANIZER: Error loading program flows:', error);
      setProgramFlows([]);
    }
  };

  const loadApprovedEvents = async () => {
    if (!user?.id) return;
    
    try {
      console.log('📅 ORGANIZER: Loading ALL approved events (for program flow creation)...');
      
      // Load ALL approved events for organizers to create program flows
      const { data: requestData, error: requestError } = await supabase
        .from('event_requests')
        .select('*')
        .eq('status', 'approved')  // Remove user filter - organizers can create flows for ANY approved event
        .order('date', { ascending: true });

      if (requestError) {
        console.error('❌ Error loading from event_requests:', requestError);
        setApprovedEvents([]);
        return;
      }

      console.log('✅ ORGANIZER: Found ALL approved events:', requestData?.length || 0);
      if (requestData && requestData.length > 0) {
        requestData.forEach(event => {
          console.log('- Event:', event.title, 'By:', event.user_name || 'Unknown', 'Date:', event.date);
        });
      }

      setApprovedEvents(requestData || []);
    } catch (error) {
      console.error('Error loading approved events:', error);
      setApprovedEvents([]);
    }
  };

  const handleCreateProgramFlow = () => {
    setProgramFlowForm({
      event_id: "",
      title: "",
      description: "",
      activities: []
    });
    setNewActivity({
      time: "",
      title: "",
      description: "",
      location: "",
      duration: 60,
      activity_type: "activity"
    });
    setShowProgramFlowForm(true);
  };

  const handleAddActivity = () => {
    if (!newActivity.title || !newActivity.time) {
      toast({
        title: "Missing Information",
        description: "Please fill in activity title and time",
        variant: "destructive"
      });
      return;
    }

    const activity = {
      ...newActivity,
      is_active: true,
      order_index: programFlowForm.activities.length
    };

    setProgramFlowForm(prev => ({
      ...prev,
      activities: [...prev.activities, activity]
    }));

    setNewActivity({
      time: "",
      title: "",
      description: "",
      location: "",
      duration: 60,
      activity_type: "activity"
    });

    toast({
      title: "Activity Added",
      description: "Activity added to program flow"
    });
  };

  const handleRemoveActivity = (index: number) => {
    setProgramFlowForm(prev => ({
      ...prev,
      activities: prev.activities.filter((_, i) => i !== index)
    }));
  };

  const handleSaveProgramFlow = async () => {
    if (!programFlowForm.event_id || !programFlowForm.title) {
      toast({
        title: "Missing Information",
        description: "Please select an event and enter a title",
        variant: "destructive"
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "User not authenticated",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('💾 ORGANIZER: Creating program flow...', {
        title: programFlowForm.title,
        event_id: programFlowForm.event_id,
        activities_count: programFlowForm.activities.length
      });
      
      const organizerName = user.name || user.email || 'Organizer';
      
      const programFlowData = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
        event_id: programFlowForm.event_id,
        organizer_id: user.id,
        organizer_name: organizerName,
        title: programFlowForm.title,
        description: programFlowForm.description,
        status: 'draft',
        activities: programFlowForm.activities,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true
      };

      // Store as JSON in admin_comments with PROGRAM_FLOW: prefix
      const jsonString = 'PROGRAM_FLOW:' + JSON.stringify(programFlowData);

      // Update the event_request with program flow data in admin_comments
      const { data, error } = await supabase
        .from('event_requests')
        .update({ 
          admin_comments: jsonString,
          updated_at: new Date().toISOString()
        })
        .eq('id', programFlowForm.event_id)
        .select();

      if (error) {
        console.error('❌ ORGANIZER: Database error:', error);
        toast({
          title: "Error",
          description: "Failed to save program flow to database",
          variant: "destructive"
        });
        return;
      }

      if (!data || data.length === 0) {
        console.error('❌ ORGANIZER: No data returned from update');
        toast({
          title: "Error",
          description: "Event not found or no permission to update",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ ORGANIZER: Program flow saved to database:', data);

      // Reset form and close modal
      setProgramFlowForm({
        event_id: '',
        title: '',
        description: '',
        activities: []
      });
      setShowProgramFlowForm(false);
      
      // Reload program flows to show the new one
      await loadProgramFlows();
      
      toast({
        title: "✅ Program Flow Created!",
        description: `Program flow "${programFlowData.title}" has been saved successfully`,
      });
      
    } catch (error) {
      console.error('❌ ORGANIZER: Error creating program flow:', error);
      toast({
        title: "Error",
        description: `Failed to create program flow: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const handleSubmitProgramFlow = async (flowId: string) => {
    try {
      console.log('📤 ORGANIZER: Submitting program flow for approval...', flowId);
      
      // Find the program flow in our local state to get the event_id
      const programFlow = programFlows.find(flow => flow.id === flowId);
      if (!programFlow) {
        toast({
          title: "Error",
          description: "Program flow not found in local state",
          variant: "destructive"
        });
        return;
      }
      
      console.log('📤 ORGANIZER: Found program flow, event_id:', programFlow.event_id);
      
      // Get the current program flow data from admin_comments using event_id
      const { data: currentData, error: fetchError } = await supabase
        .from('event_requests')
        .select('admin_comments, title')
        .eq('id', programFlow.event_id) // Use event_id instead of flowId
        .single();

      if (fetchError || !currentData?.admin_comments?.startsWith('PROGRAM_FLOW:')) {
        console.error('❌ ORGANIZER: Error fetching current data:', fetchError);
        toast({
          title: "Error",
          description: "Program flow not found for this event",
          variant: "destructive"
        });
        return;
      }

      // Parse current data and update status
      try {
        const jsonData = currentData.admin_comments.replace('PROGRAM_FLOW:', '');
        const programFlowData = JSON.parse(jsonData);
        
        // Verify that the current user is the organizer of this program flow
        if (programFlowData.organizer_id !== user?.id) {
          toast({
            title: "Error",
            description: "You can only submit program flows that you created",
            variant: "destructive"
          });
          return;
        }
        
        // Update status to submitted
        programFlowData.status = 'submitted';
        programFlowData.updated_at = new Date().toISOString();
        
        const updatedJsonString = 'PROGRAM_FLOW:' + JSON.stringify(programFlowData);

        // Update the database using event_id
        const { data, error } = await supabase
          .from('event_requests')
          .update({ 
            admin_comments: updatedJsonString,
            updated_at: new Date().toISOString()
          })
          .eq('id', programFlow.event_id) // Use event_id instead of flowId
          .select();

        if (error) {
          console.error('❌ ORGANIZER: Database update error:', error);
          toast({
            title: "Error", 
            description: "Failed to submit program flow",
            variant: "destructive"
          });
          return;
        }

        console.log('✅ ORGANIZER: Program flow submitted to database:', data);
        
        // Reload to get updated data
        await loadProgramFlows();
        
        // Create REAL notification for admin
        try {
          await autoCreateNotifications.admin.programFlowSubmitted(
            programFlowData.title,
            user.name || user.email || 'Event Organizer'
          );
          console.log('✅ ADMIN NOTIFICATION: Program flow submitted');
        } catch (notifError) {
          console.log('Admin notification failed (non-critical):', notifError);
        }
        
        toast({
          title: "📤 Program Flow Submitted!",
          description: "Your program flow has been sent to admin for approval"
        });
        
      } catch (parseError) {
        console.error('❌ ORGANIZER: JSON parse error:', parseError);
        toast({
          title: "Error",
          description: "Invalid program flow data",
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error('❌ ORGANIZER: Error submitting program flow:', error);
      toast({
        title: "Error",
        description: "Failed to submit program flow",
        variant: "destructive"
      });
    }
  };

  const handleDeleteProgramFlow = async (flowId: string) => {
    if (!confirm('Are you sure you want to delete this program flow?')) return;
    
    try {
      console.log('🗑️ ORGANIZER: Deleting program flow...');
      
      setProgramFlows(prev => prev.filter(flow => flow.id !== flowId));
      
      toast({
        title: "Program Flow Deleted",
        description: "Program flow has been removed"
      });
    } catch (error) {
      console.error('Error deleting program flow:', error);
      toast({
        title: "Error",
        description: "Failed to delete program flow",
        variant: "destructive"
      });
    }
  };

  // Filter and search helper functions
  const getFilteredProgramFlows = () => {
    let filtered = programFlows;

    // Apply status filter
    if (programFlowFilter !== 'all') {
      if (programFlowFilter === 'pending') {
        filtered = filtered.filter(flow => flow.status === 'draft' || flow.status === 'submitted');
      } else {
        filtered = filtered.filter(flow => flow.status === programFlowFilter);
      }
    }

    // Apply search filter
    if (programFlowSearch.trim()) {
      const searchLower = programFlowSearch.toLowerCase();
      filtered = filtered.filter(flow => 
        flow.title.toLowerCase().includes(searchLower) ||
        flow.event_title.toLowerCase().includes(searchLower) ||
        (flow.description && flow.description.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  };

  const getProgramFlowsByStatus = (status: string) => {
    if (status === 'pending') {
      return programFlows.filter(flow => flow.status === 'draft' || flow.status === 'submitted');
    }
    return programFlows.filter(flow => flow.status === status);
  };

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Check if user is organizer
      if (parsedUser.role !== "organizer") {
        if (parsedUser.role === "participant") {
          navigate("/participant-dashboard");
        } else {
          navigate("/dashboard");
        }
      }
    } else {
      navigate("/login");
    }
  }, [navigate]);

  // Load data when user is set
  useEffect(() => {
    if (user?.id) {
      loadCalendarEvents(); // For calendar display (includes all events)
      loadRegisterableEvents(); // For events tab (only approved registerable events)
      loadNotifications();
      loadReports();
      loadEventRequests();
      // Load venues from DATABASE
      loadVenues();
      console.log('🔥 ORGANIZER: Loading venues from DATABASE');
    }
  }, [user]);

  // AUTO-SYNC VENUES EVERY 3 SECONDS - FROM DATABASE!
  useEffect(() => {
    if (user?.id) {
      const venueSync = setInterval(async () => {
        try {
          // Load directly from database
          await loadVenues();
          console.log('🔄 ORGANIZER: Auto-synced venues from DATABASE');
        } catch (error) {
          console.error('Venue sync error:', error);
        }
      }, 3000); // Every 3 seconds

      return () => clearInterval(venueSync);
    }
  }, [user?.id]);

  // Auto-refresh notifications when notifications tab is active
  useEffect(() => {
    if (activeTab === "notifications" && user?.id) {
      loadNotifications();
    }
  }, [activeTab, user?.id]);

  // Auto-refresh reports and messages when reports tab is active
  useEffect(() => {
    if (activeTab === "reports" && user?.id) {
      loadReports();
      // If a report is selected, also refresh its messages
      if (selectedReport) {
        loadReportMessages(selectedReport.id);
      }
    }
  }, [activeTab, user?.id]);

  // Auto-refresh program flows when program tab is active
  useEffect(() => {
    if (activeTab === "program" && user?.id) {
      loadProgramFlows();
      loadApprovedEvents();
    }
  }, [activeTab, user?.id]);

  // Auto-refresh messages every 5 seconds when a report is selected
  useEffect(() => {
    if (selectedReport && activeTab === "reports") {
      const interval = setInterval(() => {
        loadReportMessages(selectedReport.id);
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
  }, [selectedReport, activeTab]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleEventRegister = async (eventId: string) => {
    if (!user?.id) return;
    
    try {
      const event = registerableEvents.find(e => e.id === eventId);
      if (!event) return;

      if (event.isRegistered) {
        // Unregister
        const { error } = await supabase
          .from('event_registrations')
          .delete()
          .eq('event_id', eventId)
          .eq('participant_id', user.id);

        if (error) {
          console.error('Unregister error:', error);
          throw error;
        }

        // Update participant count
        await supabase
          .from('events')
          .update({ current_participants: Math.max(0, event.current_participants - 1) })
          .eq('id', eventId);

        toast({
          title: "Unregistered",
          description: `You have been unregistered from ${event.title}`,
        });
      } else {
        // Register
        if (event.current_participants >= event.max_participants) {
          toast({
            title: "Event Full",
            description: "This event has reached maximum capacity",
            variant: "destructive"
          });
          return;
        }

        const { error } = await supabase
          .from('event_registrations')
          .insert([{
            event_id: eventId,
            participant_id: user.id
          }]);

        if (error) {
          console.error('Register error:', error);
          throw error;
        }

        // Update participant count
        await supabase
          .from('events')
          .update({ current_participants: event.current_participants + 1 })
          .eq('id', eventId);

        // Create REAL notification for successful registration
        try {
          // Notify admin about new registration
          await autoCreateNotifications.admin.highRegistrationAlert(
            event.title,
            event.current_participants + 1,
            event.max_participants
          );
          
          // Notify organizer about participant joining
          if (event.organizer_name !== 'Event Organizer') {
            await autoCreateNotifications.participantJoined(
              eventId,
              user.name || user.email,
              event.organizer_name
            );
          }
          
          await supabase
            .from('notifications')
            .insert([{
              user_id: user.id,
              title: "Registration Confirmed",
              message: `Your registration for "${event.title}" has been confirmed.`,
              type: "registration",
              related_event_id: eventId
            }]);
        } catch (notifError) {
          console.log('Notification creation failed (non-critical):', notifError);
        }

        // Notify event organizer about new participant
        try {
          const { data: eventData } = await supabase
            .from('events')
            .select('organizer_id, organizer_name')
            .eq('id', eventId)
            .single();

          if (eventData?.organizer_id && eventData.organizer_id !== user.id) {
            await autoCreateNotifications.participantJoined(
              eventId,
              user.name || 'New Participant',
              eventData.organizer_id
            );
          }
        } catch (notifError) {
          console.log('Organizer notification failed (non-critical):', notifError);
        }

        toast({
          title: "Registered Successfully",
          description: `You have been registered for ${event.title}`,
        });
      }

      // Reload events to get updated data
      await loadCalendarEvents();
      await loadRegisterableEvents();
      await loadNotifications();
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: "Failed to update registration. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleToggleFavorite = async (eventId: string) => {
    if (!user?.id) return;
    
    try {
      const event = registerableEvents.find(e => e.id === eventId);
      if (!event) return;

      if (event.isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('event_favorites')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id);

        if (error) {
          console.error('Remove favorite error:', error);
          // Handle specific error cases
          if (error.message.includes('relation "event_favorites" does not exist')) {
            toast({
              title: "Database Setup Required",
              description: "Please run the database setup script first.",
              variant: "destructive"
            });
            return;
          }
          throw error;
        }
        
        toast({
          title: "Removed from Favorites",
          description: `${event.title} has been removed from your favorites.`,
        });
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('event_favorites')
          .insert([{
            event_id: eventId,
            user_id: user.id
          }]);

        if (error) {
          console.error('Add favorite error:', error);
          // Handle specific error cases
          if (error.message.includes('relation "event_favorites" does not exist')) {
            toast({
              title: "Database Setup Required",
              description: "Please run the database setup script first.",
              variant: "destructive"
            });
            return;
          }
          // Handle duplicate entry (409 conflict)
          if (error.message.includes('duplicate key') || error.code === '23505') {
            toast({
              title: "Already in Favorites",
              description: `${event.title} is already in your favorites.`,
            });
            await loadRegisterableEvents(); // Refresh to sync state
            return;
          }
          throw error;
        }
        
        toast({
          title: "Added to Favorites",
          description: `${event.title} has been added to your favorites.`,
        });
      }

      // Reload events to get updated data
      await loadCalendarEvents();
      await loadRegisterableEvents();
    } catch (error) {
      console.error('Favorite toggle error:', error);
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, is_read: true }
          : notification
      ));
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const handleCreateReport = async () => {
    if (!user?.id || !newReportTitle.trim() || !newReportDescription.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Creating report:', {
        reporter_id: user.id,
        title: newReportTitle,
        description: newReportDescription,
        report_type: newReportType
      });

      const { data, error } = await supabase
        .from('reports')
        .insert([{
          reporter_id: user.id,
          title: newReportTitle,
          description: newReportDescription,
          report_type: newReportType
        }])
        .select()
        .single();

      if (error) {
        console.error('Create report error:', error);
        if (error.message.includes('relation "reports" does not exist')) {
          toast({
            title: "Database Setup Required",
            description: "Reports table not found. Please run the database setup script first.",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }

      console.log('Report created successfully:', data);

      // Add initial message from user
      try {
        await supabase
          .from('report_messages')
          .insert([{
            report_id: data.id,
            sender_id: user.id,
            message: newReportDescription
          }]);
        console.log('Initial message added to report');
      } catch (msgError) {
        console.log('Could not add initial message (non-critical):', msgError);
      }
      
      // Create REAL admin notification about new report (HARDCODED APPROACH)
      try {
        console.log('🔔 Creating admin notifications for new report...');
        
        // Use hardcoded admin IDs for reliability (same as event notifications)
        const hardcodedAdminIds = [
          'b7cc74a6-de67-4b03-9481-f59a33a4d7f4', // reichard
          'cdcdefb1-0cbf-44be-a8ae-5e23008878ee', // sosa
          '04b63328-231f-4d7b-bad0-4a18d0c0d3f5', // Admin User
          'fde6ec11-e1ef-4663-a93b-de1e48ff2b6d', // Saiz
          '72150cf8-b7b7-4a66-90a4-479720ceebef', // john michael
          'fd174ebc-7386-4a25-aee5-da6741d43905'  // asdasdasdas
        ];

        const reportTypeDisplay = newReportType.replace(/_/g, ' ').toUpperCase();
        const organizerName = user.name || user.email || 'Organization';
        
        console.log(`Creating notifications for ${hardcodedAdminIds.length} admins about ${reportTypeDisplay} report`);

        const notifications = hardcodedAdminIds.map(adminId => ({
          user_id: adminId,
          title: `📋 New ${reportTypeDisplay} Report from Organization`,
          message: `${organizerName} submitted a ${reportTypeDisplay.toLowerCase()} report: "${newReportTitle}". Please review and respond in the admin dashboard.`,
          type: 'new_report' as const,
          is_read: false,
          created_at: new Date().toISOString()
        }));

        const { data: insertResult, error: insertError } = await supabase
          .from('notifications')
          .insert(notifications)
          .select('id');

        if (insertError) {
          console.error('❌ Failed to create admin notifications:', insertError);
        } else {
          console.log(`✅ Successfully created ${insertResult?.length || 0} admin notifications for report`);
          console.log('Notification IDs:', insertResult?.map(n => n.id));
        }
        
      } catch (notifError) {
        console.error('❌ Admin notification error:', notifError);
      }

      toast({
        title: "Report Submitted",
        description: "Your report has been submitted successfully. An admin will respond soon.",
      });

      // Reset form
      setNewReportTitle("");
      setNewReportDescription("");
      setShowNewReportForm(false);
      
      // Reload reports to show the new one
      await loadReports();
    } catch (error) {
      console.error('Create report error:', error);
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSendMessage = async () => {
    if (!user?.id || !selectedReport || !newMessage.trim()) return;

    try {
      console.log('Sending message:', {
        report_id: selectedReport.id,
        sender_id: user.id,
        message: newMessage
      });

      await supabase
        .from('report_messages')
        .insert([{
          report_id: selectedReport.id,
          sender_id: user.id,
          message: newMessage
        }]);

      // Notify admins about new message in existing report
      try {
        console.log('🔔 Notifying admins about new message in report...');
        
        const hardcodedAdminIds = [
          'b7cc74a6-de67-4b03-9481-f59a33a4d7f4', // reichard
          'cdcdefb1-0cbf-44be-a8ae-5e23008878ee', // sosa
          '04b63328-231f-4d7b-bad0-4a18d0c0d3f5', // Admin User
          'fde6ec11-e1ef-4663-a93b-de1e48ff2b6d', // Saiz
          '72150cf8-b7b7-4a66-90a4-479720ceebef', // john michael
          'fd174ebc-7386-4a25-aee5-da6741d43905'  // asdasdasdas
        ];

        const organizerName = user.name || user.email || 'Organization';
        const messagePreview = newMessage.length > 80 ? newMessage.substring(0, 80) + '...' : newMessage;
        
        const messageNotifications = hardcodedAdminIds.map(adminId => ({
          user_id: adminId,
          title: `💬 New Message in Report: ${selectedReport.title}`,
          message: `${organizerName} sent a new message: "${messagePreview}"`,
          type: 'report_message' as const,
          is_read: false,
          created_at: new Date().toISOString()
        }));

        await supabase
          .from('notifications')
          .insert(messageNotifications);
          
        console.log(`✅ Notified ${hardcodedAdminIds.length} admins about new message`);
      } catch (messageNotifError) {
        console.error('❌ Failed to notify admins about message:', messageNotifError);
      }

      setNewMessage("");
      
      // Immediately reload messages to show the new message
      await loadReportMessages(selectedReport.id);
      
      toast({
        title: "Message Sent",
        description: "Your message has been sent to all admins.",
      });
    } catch (error) {
      console.error('Send message error:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSubmitEventRequest = async () => {
    if (!user?.id || !newEventRequest.title.trim() || !newEventRequest.description.trim() || 
        !newEventRequest.date || !newEventRequest.time || !newEventRequest.venue.trim() ||
        !newEventRequest.request_reason.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Check if custom event type is required but not provided
    if (newEventRequest.event_type === "Others" && !newEventRequest.custom_event_type.trim()) {
      toast({
        title: "Custom Event Type Required",
        description: "Please specify your custom event type when 'Others' is selected",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      console.log('Submitting event request for user:', user.id);
      console.log('Request data:', newEventRequest);

      // Use custom event type if "Others" is selected, otherwise use the standard type
      const finalEventType = newEventRequest.event_type === "Others" 
        ? newEventRequest.custom_event_type 
        : newEventRequest.event_type;

      const requestData = {
        requester_id: user.id,
        title: newEventRequest.title,
        description: newEventRequest.description,
        date: newEventRequest.date,
        time: newEventRequest.time,
        venue: newEventRequest.venue,
        event_type: finalEventType, // Use the final event type (either standard or custom)
        expected_participants: newEventRequest.expected_participants,
        requirements: newEventRequest.requirements || null,
        budget_estimate: newEventRequest.budget_estimate > 0 ? newEventRequest.budget_estimate : null,
        request_reason: newEventRequest.request_reason
      };

      console.log('Sending to Supabase:', requestData);

      const { data, error } = await supabase
        .from('event_requests')
        .insert([requestData])
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        
        // Check if table doesn't exist
        if (error.message.includes('relation "event_requests" does not exist')) {
          toast({
            title: "Database Error",
            description: "Event requests table not found. Please run the database setup first.",
            variant: "destructive"
          });
          return;
        }
        
        // Check if RLS policy issue
        if (error.message.includes('new row violates row-level security policy')) {
          toast({
            title: "Permission Error", 
            description: "Unable to create request. Please check your account permissions.",
            variant: "destructive"
          });
          return;
        }
        
        throw error;
      }

      console.log('Event request created:', data);

      // Create REAL notifications for both user and admin
      try {
        // Notify user about submission
        await supabase
          .from('notifications')
          .insert([{
            user_id: user.id,
            title: "Event Request Submitted",
            message: `Your ${finalEventType} event request "${newEventRequest.title}" has been submitted for admin review.`,
            type: "announcement"
          }]);
          
        // Create REAL admin notification with comprehensive debug logging
        console.log('🔔 ORGANIZER: About to create admin notification...');
        console.log('- Event ID:', data.id);
        console.log('- Organizer:', user.name || user.email || 'Event Organizer');
        console.log('- Event Title:', newEventRequest.title);
        console.log('- Current user role:', user.role);
        
        // FUCK IT! DIRECT APPROACH - CREATE ADMIN NOTIFICATIONS MANUALLY
        console.log('🔥 HARDCODED ADMIN NOTIFICATIONS - EXACT IDs');
        
        // HARDCODED ADMIN IDs - NO MORE DATABASE QUERIES!
        const exactAdminIds = [
          'b7cc74a6-de67-4b03-9481-f59a33a4d7f4', // reichard
          'cdcdefb1-0cbf-44be-a8ae-5e23008878ee', // sosa  
          '04b63328-231f-4d7b-bad0-4a18d0c0d3f5', // Admin User
          'fde6ec11-e1ef-4663-a93b-de1e48ff2b6d', // Saiz
          '72150cf8-b7b7-4a66-90a4-479720ceebef', // john michael
          'fd174ebc-7386-4a25-aee5-da6741d43905'  // asdasdasdas
        ];
        
        console.log('� Using hardcoded admin IDs:', exactAdminIds.length);
        
        // Create notifications for ALL hardcoded admin IDs - NO IF STATEMENTS!
        console.log('� Creating notifications for', exactAdminIds.length, 'admins');
          
        const adminNotifications = exactAdminIds.map(adminId => ({
          user_id: adminId,
          title: '🚨 NEW EVENT REQUEST',
          message: `${user.name || user.email || 'User'} submitted event request: "${newEventRequest.title}". Please review and approve.`,
          type: 'event_request',
          is_read: false,
          related_event_id: data.id
        }));
          
          console.log('� INSERTING admin notifications:', adminNotifications.length);
          
          const { data: createdNotifs, error: notifError } = await supabase
            .from('notifications')
            .insert(adminNotifications)
            .select();
            
        if (notifError) {
          console.error('❌ NOTIFICATION INSERT ERROR:', notifError);
          console.error('❌ Full error:', JSON.stringify(notifError, null, 2));
        } else if (createdNotifs && createdNotifs.length > 0) {
          console.log('✅ ADMIN NOTIFICATIONS CREATED:', createdNotifs.length);
          createdNotifs.forEach((notif, i) => {
            console.log(`✅ [${i+1}] Admin ${notif.user_id}: "${notif.title}"`);
          });
        } else {
          console.error('❌ NO NOTIFICATIONS CREATED - Unknown error');
        }

      } catch (notifError) {
        console.log('Admin notification error (non-critical):', notifError);
      }

      // Use the existing finalEventType variable (already declared above)

      toast({
        title: "Request Submitted",
        description: `Your ${finalEventType} event request has been submitted successfully. You'll be notified when it's reviewed.`,
      });

      // Reset form
      setNewEventRequest({
        title: "",
        description: "",
        date: "",
        time: "",
        venue: "",
        event_type: "Academic",
        custom_event_type: "",
        expected_participants: 50,
        requirements: "",
        budget_estimate: 0,
        request_reason: ""
      });
      setShowNewRequestForm(false);
      
      // Reload data
      await loadEventRequests();
      await loadNotifications();
      
    } catch (error) {
      console.error('Submit event request error:', error);
      toast({
        title: "Error",
        description: "Failed to submit event request. Please try again or contact admin.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "event_approved":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "event_rejected":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case "event_reminder":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "registration_confirmed":
        return <Calendar className="w-4 h-4 text-green-600" />;
      case "announcement":
        return <Bell className="w-4 h-4 text-purple-600" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex h-screen bg-white">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-border p-6">
          <div className="flex items-center justify-between">
            <img src={logo} alt="Logo" className="w-12 h-12 object-contain rounded-xl shadow" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Welcome back, {user?.name || "Organizer"}!
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your events and activities
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">{user?.name || "Organizer"}</span>
              <Badge variant="secondary">Organizer</Badge>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Hide TabsList since navigation is now handled by sidebar */}
          <div className="hidden">
            <TabsList className="grid w-full grid-cols-7 bg-white/50 backdrop-blur-sm">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="calendar">Calendar of Activities</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="venue">Venue Registration</TabsTrigger>
              <TabsTrigger value="multimedia">Multimedia</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="program">Program Flow</TabsTrigger>
            </TabsList>
          </div>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Welcome Section */}
            <Card className="card-elevated">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Welcome, {user?.name}!</h2>
                    <p className="text-muted-foreground">Organizer Dashboard</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="card-elevated">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Registerable Events</p>
                      <p className="text-3xl font-bold gradient-primary bg-clip-text text-transparent">
                        {registerableEvents.length}
                      </p>
                    </div>
                    <CalendarDays className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-elevated">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Venues</p>
                      <p className="text-3xl font-bold text-green-600">
                        {venues.length}
                      </p>
                    </div>
                    <Building className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-elevated">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Media Posts</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {multimediaPosts.length}
                      </p>
                    </div>
                    <Camera className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-elevated">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Event Requests</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {eventRequests.length}
                      </p>
                    </div>
                    <Plus className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Frequently used actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button 
                    className="h-20 flex-col space-y-2 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                    onClick={() => setActiveTab("calendar")}
                  >
                    <Calendar className="w-6 h-6" />
                    <span>School Calendar</span>
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="h-20 flex-col space-y-2"
                    onClick={() => setActiveTab("events")}
                  >
                    <CalendarDays className="w-6 h-6" />
                    <span>Manage Events</span>
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="h-20 flex-col space-y-2"
                    onClick={() => setActiveTab("venue")}
                  >
                    <Building className="w-6 h-6" />
                    <span>Venues</span>
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="h-20 flex-col space-y-2"
                    onClick={() => setActiveTab("multimedia")}
                  >
                    <Camera className="w-6 h-6" />
                    <span>Multimedia</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calendar Tab - Pure Calendar View (Admin Created Events) */}
          <TabsContent value="calendar" className="space-y-6">
            {/* READ-ONLY Info Banner */}
            <Card className="card-elevated border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="font-medium text-amber-800">📅 Official School Calendar (Read-Only)</h3>
                    <p className="text-sm text-amber-700">
                      <strong>View-only access:</strong> This calendar shows official school events created by administrators. 
                      Only admins can create/edit/delete calendar events. For your event management, use the <strong>Events</strong> tab.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Calendar View */}
            <Card className="card-elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-6 h-6" />
                      📅 Official School Calendar (Admin Managed)
                    </CardTitle>
                    <CardDescription>
                      <strong>Read-only view</strong> of official school events created by administrators. 
                      Events are managed by admin only.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const today = new Date();
                        const currentMonth = today.getMonth();
                        const currentYear = today.getFullYear();
                        // Navigate to current month (this would be implemented with state)
                      }}
                    >
                      Today
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Calendar Navigation */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm">
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <h3 className="text-xl font-semibold">
                      {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <Button variant="outline" size="sm">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                      Official Events
                    </Badge>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="border rounded-xl overflow-hidden shadow-lg bg-white">
                  {/* Calendar Header - Days of Week */}
                  <div className="grid grid-cols-7 bg-gradient-to-r from-blue-50 to-purple-50">
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
                      <div key={day} className={`p-4 text-sm font-semibold text-center border-r last:border-r-0 ${
                        index === 0 || index === 6 ? 'text-red-600' : 'text-gray-700'
                      }`}>
                        <div className="hidden sm:block">{day}</div>
                        <div className="sm:hidden">{day.slice(0, 3)}</div>
                      </div>
                    ))}
                  </div>

                  {/* Calendar Body - Dates */}
                  <div className="grid grid-cols-7">
                    {Array.from({ length: 35 }, (_, index) => {
                      const today = new Date();
                      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                      const startDate = new Date(firstDay);
                      startDate.setDate(startDate.getDate() - firstDay.getDay());
                      
                      const currentDate = new Date(startDate);
                      currentDate.setDate(startDate.getDate() + index);
                      
                      const isCurrentMonth = currentDate.getMonth() === today.getMonth();
                      const isToday = currentDate.toDateString() === today.toDateString();
                      
                      // Get events for this date (from calendar events)
                      const eventsForDate = allEventsForCalendar.filter(event => {
                        const eventDate = new Date(event.date);
                        return eventDate.toDateString() === currentDate.toDateString();
                      });

                      return (
                        <div
                          key={index}
                          className={`min-h-[140px] border-r border-b last:border-r-0 p-3 hover:bg-gray-50 transition-colors ${
                            !isCurrentMonth ? 'bg-gray-50/50 text-gray-400' : 'bg-white'
                          } ${isToday ? 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-300 shadow-inner' : ''}`}
                        >
                          <div className={`text-sm font-semibold mb-3 flex items-center justify-between ${
                            isToday ? 'text-blue-700' : isCurrentMonth ? 'text-gray-700' : 'text-gray-400'
                          }`}>
                            <span>{currentDate.getDate()}</span>
                            {isToday && (
                              <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                              </div>
                            )}
                          </div>
                          
                          {/* Events for this date */}
                          <div className="space-y-1">
                            {eventsForDate.slice(0, 3).map((event, eventIndex) => {
                              // Different colors for different event types
                              const getEventColor = (eventType: string) => {
                                switch (eventType.toLowerCase()) {
                                  case 'academic': return 'bg-blue-100 text-blue-800 border-blue-200';
                                  case 'sports': return 'bg-green-100 text-green-800 border-green-200';
                                  case 'cultural': return 'bg-pink-100 text-pink-800 border-pink-200';
                                  case 'research': return 'bg-purple-100 text-purple-800 border-purple-200';
                                  case 'examination': return 'bg-red-100 text-red-800 border-red-200';
                                  case 'holiday': return 'bg-orange-100 text-orange-800 border-orange-200';
                                  default: return 'bg-gray-100 text-gray-800 border-gray-200';
                                }
                              };
                              
                              return (
                                <div
                                  key={event.id}
                                  className={`text-xs p-2 rounded-lg border cursor-pointer hover:shadow-md transition-all duration-200 transform hover:scale-105 ${getEventColor(event.event_type)}`}
                                  onClick={() => {
                                    setSelectedEvent(event);
                                    setShowEventDetails(true);
                                  }}
                                  title={`${event.title} - ${event.time} (${event.event_type})`}
                                >
                                  <div className="flex items-start gap-1">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${
                                      event.event_type.toLowerCase() === 'academic' ? 'bg-blue-500' :
                                      event.event_type.toLowerCase() === 'sports' ? 'bg-green-500' :
                                      event.event_type.toLowerCase() === 'cultural' ? 'bg-pink-500' :
                                      event.event_type.toLowerCase() === 'research' ? 'bg-purple-500' :
                                      event.event_type.toLowerCase() === 'examination' ? 'bg-red-500' :
                                      event.event_type.toLowerCase() === 'holiday' ? 'bg-orange-500' : 'bg-gray-500'
                                    }`}></div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">{event.title}</div>
                                      <div className="text-xs opacity-75">{event.time}</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            {eventsForDate.length > 3 && (
                              <div className="text-xs text-center p-2 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg border border-gray-200 cursor-pointer hover:from-gray-200 hover:to-gray-300 transition-colors">
                                <span className="font-medium text-gray-600">+{eventsForDate.length - 3} more events</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Calendar Legend */}
                <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border">
                  <h4 className="font-semibold text-gray-700 mb-3">📅 Event Types Legend</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-600">Academic</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-gray-600">Sports</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                      <span className="text-gray-600">Cultural</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-gray-600">Research</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-gray-600">Examination</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-gray-600">Holiday</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
                      <span className="text-blue-600 font-medium">Today</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                      <span className="text-gray-600">Other</span>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-500 text-center border-t pt-2">
                    💡 Click on any event to view details • All events are managed by school administration
                  </div>
                </div>
              </CardContent>
            </Card>


          </TabsContent>

          {/* Events Tab - Event Management & Requests */}
          <TabsContent value="events" className="space-y-6">
            {/* Search and Filter Header */}
            <Card className="card-elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="w-6 h-6" />
                      Event Management
                    </CardTitle>
                    <CardDescription>Browse and register for all available events</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search events..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="px-3 py-2 border rounded-md"
                    >
                      <option value="all">All Events</option>
                      <option value="available">Available Events</option>
                      <option value="myevents">My Events</option>
                      <option value="registered">Registered Events</option>
                      <option value="favorites">Favorites</option>
                      <option value="academic">Academic</option>
                      <option value="sports">Sports</option>
                      <option value="cultural">Cultural</option>
                      <option value="social">Social</option>
                      <option value="workshop">Workshop</option>
                      <option value="conference">Conference</option>
                      <option value="competition">Competition</option>
                      <option value="seminar">Seminar</option>
                      <option value="training">Training</option>
                      <option value="others">Others</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Event Management Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="card-elevated">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Available Events</p>
                      <p className="text-3xl font-bold gradient-primary bg-clip-text text-transparent">
                        {registerableEvents.filter(e => !e.isMyEvent).length}
                      </p>
                    </div>
                    <CalendarDays className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-elevated">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">My Events</p>
                      <p className="text-3xl font-bold text-green-600">
                        {registerableEvents.filter(e => e.isMyEvent).length}
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-elevated">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Registered</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {registerableEvents.filter(e => e.isRegistered).length}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-elevated">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Event Requests</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {eventRequests.length}
                      </p>
                    </div>
                    <Plus className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Events Filtering Logic */}
            {(() => {
              // Filter events based on search and filter criteria
              const filteredEvents = registerableEvents.filter(event => {
                const matchesSearch = searchTerm === "" || 
                  event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  event.organizer_name.toLowerCase().includes(searchTerm.toLowerCase());
                
                if (filterType === "all") return matchesSearch;
                if (filterType === "available") return matchesSearch && !event.isMyEvent;
                if (filterType === "myevents") return matchesSearch && event.isMyEvent;
                if (filterType === "registered") return matchesSearch && event.isRegistered;
                if (filterType === "favorites") return matchesSearch && event.isFavorite;
                
                return matchesSearch && event.event_type.toLowerCase() === filterType.toLowerCase();
              });

              return (
                <>
                  {/* Approved Events Grid Display */}
                  <Card className="card-elevated">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CalendarDays className="w-5 h-5" />
                        All Events ({filteredEvents.length})
                      </CardTitle>
                <CardDescription>All available events for registration and viewing</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarDays className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium mb-2 text-muted-foreground">No events found</h3>
                    <p className="text-muted-foreground mb-4">
                      Try adjusting your search or filter criteria
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEvents.map((event) => (
                      <Card key={event.id} className="card-elevated overflow-hidden hover:shadow-lg transition-all duration-300">
                        <CardContent className="p-0">
                          {/* Event Header */}
                          <div className="relative p-6 pb-4">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center space-x-2">
                                <Badge className={getStatusColor(event.status)}>
                                  {event.status}
                                </Badge>
                                {event.isMyEvent && (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                    My Event
                                  </Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleFavorite(event.id)}
                                className="p-1"
                              >
                                <Heart className={`w-4 h-4 ${event.isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                              </Button>
                            </div>
                            
                            <h3 
                              className="font-bold text-lg mb-2 cursor-pointer hover:text-primary line-clamp-2"
                              onClick={() => {
                                setSelectedEvent(event);
                                setShowEventDetails(true);
                              }}
                            >
                              {event.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                              {event.description}
                            </p>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span>{formatDate(event.date)} at {event.time}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span>{event.venue}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span>{event.organizer_name}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Users className="w-4 h-4 text-muted-foreground" />
                                  <span>{event.current_participants}/{event.max_participants} participants</span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {event.event_type}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          {/* Event Actions */}
                          <div className="border-t p-4 bg-muted/20">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant={event.isRegistered ? "secondary" : "default"}
                                size="sm"
                                onClick={() => handleEventRegister(event.id)}
                                className="flex-1"
                                disabled={loading || event.status === "completed" || (event.current_participants >= event.max_participants && !event.isRegistered)}
                              >
                                {loading ? "Loading..." : (event.isRegistered ? "Registered" : "Register")}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedEvent(event);
                                  setShowEventDetails(true);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Share2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
                </>
              );
            })()}

          </TabsContent>

          {/* Venue Management Tab */}
          <TabsContent value="venue" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="w-6 h-6" />
                      Venue Management - SAME DATABASE AS ADMIN!
                    </CardTitle>
                    <CardDescription>Manage venues used in your approved events</CardDescription>
                  </div>
                  <Button 
                    onClick={() => {
                      setVenueFormData({
                        name: '',
                        capacity: '',
                        location: '',
                        description: '',
                        amenities: '',
                        status: 'available'
                      });
                      setVenueImageFile(null);
                      setVenueImageUrl('');
                      setSelectedVenue(null);
                      setShowVenueModal(true);
                    }}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Venue
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {venues.length === 0 ? (
                  <div className="text-center py-12">
                    <Building className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-2">No venues found</p>
                    <p className="text-sm text-muted-foreground">Venues will appear here when you have approved events</p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {venues.map((venue) => (
                      <Card key={venue.id} className="overflow-hidden hover:shadow-lg transition-all duration-300">
                        <div className="relative">
                          {venue.image_url ? (
                            <img 
                              src={venue.image_url} 
                              alt={venue.name}
                              className="w-full h-48 object-cover"
                            />
                          ) : (
                            <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                              <Building className="w-12 h-12 text-gray-400" />
                            </div>
                          )}
                          <div className="absolute top-3 right-3">
                            <Badge variant={venue.is_available ? "secondary" : "destructive"}>
                              {venue.status || (venue.is_available ? "Available" : "Unavailable")}
                            </Badge>
                          </div>
                        </div>
                        
                        <CardContent className="p-4 space-y-3">
                          <div>
                            <h3 className="font-semibold text-lg">{venue.name}</h3>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {venue.location}
                            </p>
                          </div>
                          
                          {venue.event_details && (
                            <div className="bg-blue-50 p-3 rounded-lg space-y-1">
                              <p className="text-sm font-medium text-blue-800">Event: {venue.event_details.event_name}</p>
                              <p className="text-xs text-gray-600">Date: {formatDate(venue.event_details.event_date)}</p>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4 text-blue-500" />
                              <span>Capacity: <strong>{venue.capacity}</strong></span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-green-500" />
                              <span><strong>{venue.events_count}</strong> events</span>
                            </div>
                          </div>
                          
                          {venue.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">{venue.description}</p>
                          )}
                          
                          {venue.amenities && venue.amenities.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {venue.amenities.slice(0, 3).map((amenity, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {amenity}
                                </Badge>
                              ))}
                              {venue.amenities.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{venue.amenities.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          <div className="flex gap-2 pt-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleVenueEdit(venue)}
                              className="flex-1"
                            >
                              <Camera className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleVenueDelete(venue.id)}
                              className="flex-1"
                            >
                              <AlertCircle className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Multimedia Tab */}
          <TabsContent value="multimedia" className="space-y-6">
            <MultimediaFeed />
          </TabsContent>

          {/* Program Flow Tab */}
          <TabsContent value="program" className="space-y-6">
            {/* Header with Create Button and Filters */}
            <Card className="card-elevated">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <PlayCircle className="w-5 h-5" />
                      Program Flow Management
                    </CardTitle>
                    <CardDescription>Create and manage event program flows for your approved events</CardDescription>
                  </div>
                  <Button onClick={handleCreateProgramFlow} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Program Flow
                  </Button>
                </div>
                
                {/* Search and Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-4 mt-4 pt-4 border-t">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search program flows by title, event, or description..."
                      value={programFlowSearch}
                      onChange={(e) => setProgramFlowSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <select
                      value={programFlowFilter}
                      onChange={(e) => setProgramFlowFilter(e.target.value as any)}
                      className="px-3 py-2 border border-input bg-background rounded-md"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Statistics Cards - Clickable Filters */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card 
                className={`card-elevated cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
                  programFlowFilter === 'all' ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => {
                  setProgramFlowFilter('all');
                  setProgramFlowSearch('');
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <PlayCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{programFlows.length}</p>
                      <p className="text-sm text-muted-foreground">Total Flows</p>
                    </div>
                  </div>
                  {programFlowFilter === 'all' && (
                    <div className="mt-2 text-xs text-blue-600 font-medium">
                      ✓ Currently viewing all
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card 
                className={`card-elevated cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
                  programFlowFilter === 'pending' ? 'ring-2 ring-yellow-500 bg-yellow-50' : ''
                }`}
                onClick={() => {
                  setProgramFlowFilter('pending');
                  setProgramFlowSearch('');
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Clock className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{getProgramFlowsByStatus('pending').length}</p>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                  </div>
                  {programFlowFilter === 'pending' && (
                    <div className="mt-2 text-xs text-yellow-600 font-medium">
                      ✓ Currently viewing pending
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card 
                className={`card-elevated cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
                  programFlowFilter === 'approved' ? 'ring-2 ring-green-500 bg-green-50' : ''
                }`}
                onClick={() => {
                  setProgramFlowFilter('approved');
                  setProgramFlowSearch('');
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{getProgramFlowsByStatus('approved').length}</p>
                      <p className="text-sm text-muted-foreground">Approved</p>
                    </div>
                  </div>
                  {programFlowFilter === 'approved' && (
                    <div className="mt-2 text-xs text-green-600 font-medium">
                      ✓ Currently viewing approved
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card 
                className={`card-elevated cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
                  programFlowFilter === 'rejected' ? 'ring-2 ring-red-500 bg-red-50' : ''
                }`}
                onClick={() => {
                  setProgramFlowFilter('rejected');
                  setProgramFlowSearch('');
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <XCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{getProgramFlowsByStatus('rejected').length}</p>
                      <p className="text-sm text-muted-foreground">Rejected</p>
                    </div>
                  </div>
                  {programFlowFilter === 'rejected' && (
                    <div className="mt-2 text-xs text-red-600 font-medium">
                      ✓ Currently viewing rejected
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Program Flows Organized by Status */}
            {programFlows.length === 0 ? (
              <Card className="card-elevated">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <PlayCircle className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Program Flows Yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create your first program flow to organize your event activities and timeline.
                  </p>
                  <Button onClick={handleCreateProgramFlow} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Program Flow
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {/* Filter Results or Show All */}
                {programFlowFilter !== 'all' || programFlowSearch.trim() ? (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-lg font-semibold">
                        {programFlowFilter === 'all' ? 'Search Results' : 
                         programFlowFilter === 'pending' ? 'Pending Program Flows' :
                         programFlowFilter.charAt(0).toUpperCase() + programFlowFilter.slice(1) + ' Program Flows'}
                      </h3>
                      <Badge variant="outline">{getFilteredProgramFlows().length}</Badge>
                    </div>
                    <div className="grid gap-4">
                      {getFilteredProgramFlows().map((flow) => (
                        <ProgramFlowCard 
                          key={flow.id} 
                          flow={flow} 
                          onSubmit={handleSubmitProgramFlow}
                          onDelete={handleDeleteProgramFlow}
                          onEdit={(flow) => {
                            setProgramFlowForm({
                              event_id: flow.event_id,
                              title: flow.title,
                              description: flow.description || "",
                              activities: flow.activities
                            });
                            setShowProgramFlowForm(true);
                          }}
                          onViewDetails={(flow) => {
                            setSelectedProgramFlow(flow);
                            setShowProgramFlowDetails(true);
                          }}
                        />
                      ))}
                      {getFilteredProgramFlows().length === 0 && (
                        <Card className="card-elevated">
                          <CardContent className="text-center py-8">
                            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-muted-foreground">No program flows match your search criteria</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Pending Section */}
                    {getProgramFlowsByStatus('pending').length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Clock className="w-5 h-5 text-yellow-600" />
                          <h3 className="text-lg font-semibold">Pending Approval</h3>
                          <Badge variant="secondary">{getProgramFlowsByStatus('pending').length}</Badge>
                        </div>
                        <div className="grid gap-4">
                          {getProgramFlowsByStatus('pending').map((flow) => (
                            <ProgramFlowCard 
                              key={flow.id} 
                              flow={flow} 
                              onSubmit={handleSubmitProgramFlow}
                              onDelete={handleDeleteProgramFlow}
                              onEdit={(flow) => {
                                setProgramFlowForm({
                                  event_id: flow.event_id,
                                  title: flow.title,
                                  description: flow.description || "",
                                  activities: flow.activities
                                });
                                setShowProgramFlowForm(true);
                              }}
                              onViewDetails={(flow) => {
                                setSelectedProgramFlow(flow);
                                setShowProgramFlowDetails(true);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Approved Section */}
                    {getProgramFlowsByStatus('approved').length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <h3 className="text-lg font-semibold">Approved Program Flows</h3>
                          <Badge variant="default">{getProgramFlowsByStatus('approved').length}</Badge>
                        </div>
                        <div className="grid gap-4">
                          {getProgramFlowsByStatus('approved').map((flow) => (
                            <ProgramFlowCard 
                              key={flow.id} 
                              flow={flow} 
                              onSubmit={handleSubmitProgramFlow}
                              onDelete={handleDeleteProgramFlow}
                              onEdit={(flow) => {
                                setProgramFlowForm({
                                  event_id: flow.event_id,
                                  title: flow.title,
                                  description: flow.description || "",
                                  activities: flow.activities
                                });
                                setShowProgramFlowForm(true);
                              }}
                              onViewDetails={(flow) => {
                                setSelectedProgramFlow(flow);
                                setShowProgramFlowDetails(true);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rejected Section */}
                    {getProgramFlowsByStatus('rejected').length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <XCircle className="w-5 h-5 text-red-600" />
                          <h3 className="text-lg font-semibold">Rejected Program Flows</h3>
                          <Badge variant="destructive">{getProgramFlowsByStatus('rejected').length}</Badge>
                        </div>
                        <div className="grid gap-4">
                          {getProgramFlowsByStatus('rejected').map((flow) => (
                            <ProgramFlowCard 
                              key={flow.id} 
                              flow={flow} 
                              onSubmit={handleSubmitProgramFlow}
                              onDelete={handleDeleteProgramFlow}
                              onEdit={(flow) => {
                                setProgramFlowForm({
                                  event_id: flow.event_id,
                                  title: flow.title,
                                  description: flow.description || "",
                                  activities: flow.activities
                                });
                                setShowProgramFlowForm(true);
                              }}
                              onViewDetails={(flow) => {
                                setSelectedProgramFlow(flow);
                                setShowProgramFlowDetails(true);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Draft Section */}
                    {getProgramFlowsByStatus('draft').length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <FileText className="w-5 h-5 text-gray-600" />
                          <h3 className="text-lg font-semibold">Draft Program Flows</h3>
                          <Badge variant="outline">{getProgramFlowsByStatus('draft').length}</Badge>
                        </div>
                        <div className="grid gap-4">
                          {getProgramFlowsByStatus('draft').map((flow) => (
                            <ProgramFlowCard 
                              key={flow.id} 
                              flow={flow} 
                              onSubmit={handleSubmitProgramFlow}
                              onDelete={handleDeleteProgramFlow}
                              onEdit={(flow) => {
                                setProgramFlowForm({
                                  event_id: flow.event_id,
                                  title: flow.title,
                                  description: flow.description || "",
                                  activities: flow.activities
                                });
                                setShowProgramFlowForm(true);
                              }}
                              onViewDetails={(flow) => {
                                setSelectedProgramFlow(flow);
                                setShowProgramFlowDetails(true);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
              {/* Reports List */}
              <div className="lg:col-span-1">
                <Card className="card-elevated h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>My Reports</CardTitle>
                        <CardDescription>Support & Help Center</CardDescription>
                        <p className="text-xs text-muted-foreground mt-1">View and manage your submitted reports</p>
                      </div>
                      <Button 
                        onClick={() => setShowNewReportForm(true)}
                        size="sm"
                        className="gradient-primary"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                <CardContent className="overflow-y-auto h-[calc(100%-120px)]">
                  {/* New Report Form */}
                  {showNewReportForm && (
                    <Card className="mb-4 border-2 border-primary/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">New Report</CardTitle>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setShowNewReportForm(false)}
                          >
                            ✕
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-sm">Type</Label>
                          <select
                            value={newReportType}
                            onChange={(e) => setNewReportType(e.target.value as any)}
                            className="w-full mt-1 p-2 border rounded-md h-9"
                          >
                            <option value="rejection_complaint">Rejection Complaint</option>
                            <option value="technical_issue">Technical Issue</option>
                            <option value="general_inquiry">General Inquiry</option>
                            <option value="event_feedback">Event Feedback</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-sm">Title</Label>
                          <Input
                            value={newReportTitle}
                            onChange={(e) => setNewReportTitle(e.target.value)}
                            placeholder="Brief title"
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Description</Label>
                          <Textarea
                            value={newReportDescription}
                            onChange={(e) => setNewReportDescription(e.target.value)}
                            placeholder="Describe your issue"
                            rows={3}
                            className="text-sm"
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => setShowNewReportForm(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            size="sm"
                            onClick={handleCreateReport}
                            disabled={loading}
                          >
                            {loading ? "Submitting..." : "Submit"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Reports List */}
                  <div className="space-y-3">
                    {reports.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                        <p className="text-sm text-muted-foreground mb-3">No reports yet</p>
                        <Button 
                          size="sm"
                          onClick={() => setShowNewReportForm(true)}
                          className="gradient-primary"
                        >
                          Create Report
                        </Button>
                      </div>
                    ) : (
                      reports.map((report) => (
                        <Card 
                          key={report.id} 
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            selectedReport?.id === report.id ? 'ring-2 ring-primary bg-primary/5' : ''
                          }`}
                          onClick={() => {
                            setSelectedReport(report);
                            loadReportMessages(report.id);
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-sm truncate pr-2">{report.title}</h4>
                              <Badge className={`${getStatusColor(report.status)} text-xs`}>
                                {report.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{report.description}</p>
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-xs">
                                {report.report_type.replace('_', ' ')}
                              </Badge>
                              <span className="text-xs text-black font-medium">
                                {new Date(report.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-2">
              <Card className="card-elevated h-full">
                {selectedReport ? (
                  <>
                    <CardHeader className="bg-gradient-to-r from-blue-500 to-violet-500 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-white text-lg">{selectedReport.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-white/20 text-white border-white/30 text-xs">
                              {selectedReport.status}
                            </Badge>
                            <Badge className="bg-white/10 text-white border-white/20 text-xs">
                              {selectedReport.report_type.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedReport(null)}
                          className="text-white hover:bg-white/20"
                        >
                          ✕
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col h-[calc(100%-120px)] p-0">
                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4 h-96 max-h-96">
                        {reportMessages.length === 0 ? (
                          <div className="text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full flex items-center justify-center">
                              <FileText className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-lg font-medium mb-2">Start the Conversation</h3>
                            <p className="text-muted-foreground">Send a message to get support from admin</p>
                          </div>
                        ) : (
                          reportMessages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${message.sender_role === 'admin' ? 'justify-start' : 'justify-end'} mb-2`}
                            >
                              <div
                                className={`max-w-[70%] p-3 rounded-lg ${
                                  message.sender_role === 'admin'
                                    ? 'bg-muted'
                                    : 'bg-primary text-primary-foreground'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium">
                                    {message.sender_role === 'admin' ? 'Admin' : 'You'}
                                  </span>
                                  <span className="text-xs opacity-70">
                                    {new Date(message.created_at).toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="text-sm">{message.message}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      
                      {/* Message Input */}
                      <div className="p-4 border-t bg-muted/10">
                        <div className="flex space-x-3">
                          <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type your message to admin..."
                            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                            className="flex-1"
                          />
                          <Button 
                            onClick={handleSendMessage} 
                            disabled={!newMessage.trim()}
                            className="gradient-primary"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <CardContent className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full flex items-center justify-center">
                        <FileText className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-xl font-medium mb-2">Select a Report</h3>
                      <p className="text-muted-foreground mb-4">Choose a report from the left to start chatting with admin</p>
                      <Button 
                        onClick={() => setShowNewReportForm(true)}
                        className="gradient-primary"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Report
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
            </div>
          </TabsContent>
        </Tabs>
        </main>
      </div>
      
      {/* Event Details Modal */}
      {showEventDetails && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">{selectedEvent.title}</h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowEventDetails(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(selectedEvent.status)}>
                    {selectedEvent.status}
                  </Badge>
                  {selectedEvent.isMyEvent && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      My Event
                    </Badge>
                  )}
                  <Badge variant="outline">{selectedEvent.event_type}</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium">Date:</span>
                      <span>{formatDate(selectedEvent.date)}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium">Time:</span>
                      <span>{selectedEvent.time}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium">Venue:</span>
                      <span>{selectedEvent.venue}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <User className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium">Organizer:</span>
                      <span>{selectedEvent.organizer_name}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium">Participants:</span>
                      <span>{selectedEvent.current_participants}/{selectedEvent.max_participants}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Registration:</span>
                      {selectedEvent.isRegistered ? (
                        <Badge className="bg-green-100 text-green-800">Registered</Badge>
                      ) : (
                        <Badge variant="outline">Not Registered</Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Description:</h3>
                  <p className="text-muted-foreground bg-muted/50 p-4 rounded-lg">
                    {selectedEvent.description || 'No description available.'}
                  </p>
                </div>
                
                <div className="flex items-center space-x-4 pt-4 border-t">
                  {!selectedEvent.isMyEvent && (
                    <>
                      <Button
                        variant={selectedEvent.isRegistered ? "secondary" : "default"}
                        onClick={() => {
                          handleEventRegister(selectedEvent.id);
                          setShowEventDetails(false);
                        }}
                        disabled={loading || selectedEvent.current_participants >= selectedEvent.max_participants && !selectedEvent.isRegistered}
                      >
                        {selectedEvent.isRegistered ? "Unregister" : "Register"}
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => {
                          handleToggleFavorite(selectedEvent.id);
                          setShowEventDetails(false);
                        }}
                      >
                        <Heart className={`w-4 h-4 mr-2 ${selectedEvent.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                        {selectedEvent.isFavorite ? "Remove Favorite" : "Add to Favorites"}
                      </Button>
                    </>
                  )}
                  
                  {selectedEvent.isMyEvent && (
                    <div className="text-sm text-muted-foreground">
                      This is your event. You are automatically registered as the organizer.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Venue Create/Edit Modal */}
      {showVenueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Building className="w-6 h-6" />
                  {selectedVenue ? `Edit Venue: ${selectedVenue.name}` : 'Add New Venue'}
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowVenueModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-6">
                {/* Event Details Section */}
                {selectedVenue && selectedVenue.event_details && (
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                    <Label className="text-lg font-semibold text-blue-800">Event Information</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Event Name:</span>
                        <p className="text-gray-800">{selectedVenue.event_details.event_name}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Event Date:</span>
                        <p className="text-gray-800">{formatDate(selectedVenue.event_details.event_date)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Participants:</span>
                        <p className="text-gray-800">{selectedVenue.event_details.participants_count} people</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Current Image */}
                <div className="space-y-3">
                  <Label className="text-lg font-semibold">
                    {selectedVenue ? 'Current Venue Image' : 'Venue Image'}
                  </Label>
                  <div className="relative">
                    {selectedVenue && selectedVenue.image_url ? (
                      <img 
                        src={selectedVenue.image_url} 
                        alt={selectedVenue.name}
                        className="w-full h-64 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-64 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <Building className="w-16 h-16 mx-auto mb-2 text-gray-400" />
                          <p className="text-gray-500">No image uploaded</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Image Upload */}
                <div className="space-y-3">
                  <Label htmlFor="venue-image" className="text-lg font-semibold flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Upload New Image
                  </Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      id="venue-image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setVenueImageFile(file);
                          handleVenueImageUpload(file);
                        }
                      }}
                      className="hidden"
                    />
                    <label htmlFor="venue-image" className="cursor-pointer">
                      <Camera className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-gray-600 mb-2">Click to upload venue image</p>
                      <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB</p>
                    </label>
                  </div>
                </div>

                {/* Venue Details Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="venue-name">Venue Name</Label>
                    <Input
                      id="venue-name"
                      value={venueFormData.name}
                      onChange={(e) => setVenueFormData({...venueFormData, name: e.target.value})}
                      placeholder="Enter venue name"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="venue-capacity">Capacity</Label>
                    <Input
                      id="venue-capacity"
                      type="number"
                      value={venueFormData.capacity}
                      onChange={(e) => setVenueFormData({...venueFormData, capacity: e.target.value})}
                      placeholder="Enter maximum capacity"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="venue-location">Location</Label>
                  <Input
                    id="venue-location"
                    value={venueFormData.location}
                    onChange={(e) => setVenueFormData({...venueFormData, location: e.target.value})}
                    placeholder="Enter venue location"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="venue-description">Description</Label>
                  <Textarea
                    id="venue-description"
                    value={venueFormData.description}
                    onChange={(e) => setVenueFormData({...venueFormData, description: e.target.value})}
                    placeholder="Describe the venue..."
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="venue-amenities">Amenities (comma-separated)</Label>
                  <Input
                    id="venue-amenities"
                    value={venueFormData.amenities}
                    onChange={(e) => setVenueFormData({...venueFormData, amenities: e.target.value})}
                    placeholder="e.g., Audio System, Air Conditioning, WiFi, Parking"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={handleVenueSave}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                  >
                    <Building className="w-4 h-4 mr-2" />
                    {selectedVenue ? 'Save Changes' : 'Create Venue'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowVenueModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Program Flow Creation Modal */}
      {showProgramFlowForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <PlayCircle className="w-6 h-6" />
                  {programFlowForm.event_id ? 'Edit Program Flow' : 'Create Program Flow'}
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowProgramFlowForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </Button>
              </div>

              <div className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="event_id">Select Event</Label>
                      <select
                        id="event_id"
                        value={programFlowForm.event_id}
                        onChange={(e) => setProgramFlowForm(prev => ({ ...prev, event_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Choose an approved event...</option>
                        {approvedEvents.map((event) => (
                          <option key={event.id} value={event.id}>
                            {event.title} - {formatDate(event.date)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="title">Program Flow Title</Label>
                      <Input
                        id="title"
                        value={programFlowForm.title}
                        onChange={(e) => setProgramFlowForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Sports Festival Program Flow"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={programFlowForm.description}
                      onChange={(e) => setProgramFlowForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the overall program flow..."
                      rows={3}
                    />
                  </div>
                </div>

                {/* Add Activity Section */}
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-medium flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Activity
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="activity_time">Time</Label>
                      <Input
                        id="activity_time"
                        type="time"
                        value={newActivity.time}
                        onChange={(e) => setNewActivity(prev => ({ ...prev, time: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="activity_title">Activity Title</Label>
                      <Input
                        id="activity_title"
                        value={newActivity.title}
                        onChange={(e) => setNewActivity(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Opening Ceremony"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="activity_duration">Duration (minutes)</Label>
                      <Input
                        id="activity_duration"
                        type="number"
                        value={newActivity.duration}
                        onChange={(e) => setNewActivity(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                        placeholder="60"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="activity_type">Type</Label>
                      <select
                        id="activity_type"
                        value={newActivity.activity_type}
                        onChange={(e) => setNewActivity(prev => ({ ...prev, activity_type: e.target.value as ProgramFlowActivity['activity_type'] }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="opening">Opening</option>
                        <option value="presentation">Presentation</option>
                        <option value="activity">Activity</option>
                        <option value="break">Break</option>
                        <option value="closing">Closing</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="activity_location">Location (Optional)</Label>
                      <Input
                        id="activity_location"
                        value={newActivity.location}
                        onChange={(e) => setNewActivity(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="e.g., Main Stadium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="activity_description">Description</Label>
                      <Input
                        id="activity_description"
                        value={newActivity.description}
                        onChange={(e) => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe the activity..."
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddActivity} className="w-full" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Activity to Program
                  </Button>
                </div>

                {/* Activities List */}
                {programFlowForm.activities.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Program Activities ({programFlowForm.activities.length})
                    </h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {programFlowForm.activities.map((activity, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                          <div className="flex-shrink-0 w-16 text-xs font-mono text-center bg-primary/10 rounded px-2 py-1">
                            {activity.time}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-medium text-sm">{activity.title}</h5>
                              <Badge variant="outline" className="text-xs">
                                {activity.activity_type}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{activity.description}</p>
                            {activity.location && (
                              <div className="flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{activity.location}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0 text-xs text-muted-foreground">
                            {activity.duration}min
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveActivity(index)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 border-t">
                  <Button
                    onClick={handleSaveProgramFlow}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    disabled={!programFlowForm.event_id || !programFlowForm.title}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Save Program Flow
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowProgramFlowForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Program Flow Details Modal */}
      {showProgramFlowDetails && selectedProgramFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <PlayCircle className="w-6 h-6" />
                    {selectedProgramFlow.title}
                  </h2>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{selectedProgramFlow.event_title}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatDate(selectedProgramFlow.event_date)}</span>
                    </div>
                    <Badge 
                      variant={
                        selectedProgramFlow.status === 'approved' ? 'default' :
                        selectedProgramFlow.status === 'submitted' ? 'secondary' :
                        selectedProgramFlow.status === 'rejected' ? 'destructive' : 'outline'
                      }
                    >
                      {selectedProgramFlow.status.charAt(0).toUpperCase() + selectedProgramFlow.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setShowProgramFlowDetails(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </Button>
              </div>

              <div className="space-y-6">
                {/* Description */}
                {selectedProgramFlow.description && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground">{selectedProgramFlow.description}</p>
                  </div>
                )}

                {/* Full Activities Timeline */}
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Complete Activity Timeline ({selectedProgramFlow.activities.length} activities)
                  </h3>
                  <div className="space-y-3">
                    {selectedProgramFlow.activities.map((activity, index) => (
                      <div key={activity.id || index} className="flex items-start gap-4 p-4 bg-background rounded-lg border">
                        <div className="flex-shrink-0 w-20 text-center">
                          <div className="text-lg font-mono font-bold text-primary">
                            {activity.time}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {activity.duration}min
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium">{activity.title}</h4>
                            <Badge variant="outline">
                              {activity.activity_type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{activity.description}</p>
                          {activity.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">{activity.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Admin Comments */}
                {selectedProgramFlow.admin_comments && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h3 className="font-medium text-yellow-800 mb-2">Admin Comments</h3>
                    <p className="text-sm text-yellow-700">{selectedProgramFlow.admin_comments}</p>
                  </div>
                )}

                {/* Close Button */}
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowProgramFlowDetails(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerDashboard;