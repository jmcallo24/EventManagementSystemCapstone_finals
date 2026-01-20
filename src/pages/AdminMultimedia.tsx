import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Image as ImageIcon, 
  Video, 
  Smile,
  Search,
  Filter,
  Eye,
  Calendar,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { 
  MultimediaPost, 
  getAllMultimediaPosts,
  getPostComments,
  MultimediaComment
} from "@/lib/multimediaService";

const AdminMultimediaView = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [posts, setPosts] = useState<MultimediaPost[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [loading, setLoading] = useState(false);
  const [postComments, setPostComments] = useState<{ [postId: string]: MultimediaComment[] }>({});
  const [showComments, setShowComments] = useState<{ [postId: string]: boolean }>({});

  // Load posts from database (READ-ONLY)
  const loadPosts = async () => {
    try {
      setLoading(true);
      console.log('👁️ ADMIN: Viewing organizer posts...');
      const allPosts = await getAllMultimediaPosts();
      setPosts(allPosts);
      console.log('✅ ADMIN: Loaded posts:', allPosts.length);
    } catch (error) {
      console.error("Admin error loading posts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
    
    // Auto-refresh every 30 seconds (admin doesn't need real-time)
    const interval = setInterval(loadPosts, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load comments for a specific post (ADMIN READ-ONLY)
  const loadCommentsForPost = async (postId: string) => {
    try {
      console.log('👁️ ADMIN: Loading comments for post:', postId);
      const comments = await getPostComments(postId);
      setPostComments(prev => ({ ...prev, [postId]: comments }));
      console.log('✅ ADMIN: Loaded comments:', comments.length);
    } catch (error) {
      console.error("Admin error loading comments:", error);
    }
  };

  // Toggle comments visibility (ADMIN READ-ONLY)
  const toggleComments = async (postId: string) => {
    console.log('🔄 ADMIN: Toggling comments for post:', postId);
    const isCurrentlyShowing = showComments[postId];
    console.log('📊 Current state - showing:', isCurrentlyShowing);
    
    setShowComments(prev => ({ ...prev, [postId]: !isCurrentlyShowing }));
    
    // If showing comments and we don't have them loaded, load them
    if (!isCurrentlyShowing && !postComments[postId]) {
      console.log('📥 ADMIN: Loading comments...');
      await loadCommentsForPost(postId);
    } else if (!isCurrentlyShowing && postComments[postId]) {
      console.log('✅ ADMIN: Comments already loaded, just showing them');
    } else {
      console.log('📤 ADMIN: Hiding comments');
    }
  };

  // Filter posts
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.content.toLowerCase().includes(search.toLowerCase()) ||
                         post.user_name.toLowerCase().includes(search.toLowerCase()) ||
                         (post.title && post.title.toLowerCase().includes(search.toLowerCase()));
    
    const matchesFilter = filterType === "all" || post.media_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get post stats
  const postStats = {
    total: posts.length,
    text: posts.filter(p => p.media_type === 'text').length,
    image: posts.filter(p => p.media_type === 'image').length,
    video: posts.filter(p => p.media_type === 'video').length,
    meme: posts.filter(p => p.media_type === 'meme').length,
    totalLikes: posts.reduce((sum, p) => sum + p.likes_count, 0),
    totalComments: posts.reduce((sum, p) => sum + p.comments_count, 0)
  };

  return (
    <div className="flex h-screen w-screen bg-white overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 flex flex-col h-screen w-full p-0 m-0">
        <header className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white"> Admin Multimedia Monitor</h1>
            <p className="text-purple-100 text-sm">View organizer posts and activity</p>
          </div>
        </header>
        
        <section className="flex-1 flex flex-col items-center justify-start bg-gray-50 p-4 overflow-auto">
          <div className="w-full max-w-6xl">
            
            {/* Stats Cards */}
           

            {/* Search and Filter */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search posts, users, or content..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="border rounded px-3 py-2 text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="text">Text Only</option>
                    <option value="image">Images</option>
                    <option value="video">Videos</option>
                    <option value="meme">Memes</option>
                  </select>
                </div>

                <Button
                  onClick={loadPosts}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  {loading ? "Loading..." : "Refresh"}
                </Button>
              </div>
              
              <div className="flex gap-2 mt-3 text-xs text-gray-600">
                <span>Showing {filteredPosts.length} of {posts.length} posts</span>
                <span>•</span>
                <span>Text: {postStats.text}</span>
                <span>•</span>
                <span>Images: {postStats.image}</span>
                <span>•</span>
                <span>Videos: {postStats.video}</span>
                <span>•</span>
                <span>Memes: {postStats.meme}</span>
              </div>
            </div>

            {/* Posts Feed (READ-ONLY) */}
            <div className="space-y-6">
              {filteredPosts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-md">
                  <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">
                    {search || filterType !== "all" ? "No posts match your search" : "No posts yet!"}
                  </h3>
                  <p className="text-gray-500">
                    {search || filterType !== "all" 
                      ? "Try adjusting your search or filter criteria"
                      : "Organizers haven't posted anything yet. They can share content from their dashboard."
                    }
                  </p>
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <div key={post.id} className="bg-white rounded-lg shadow-md border p-6">
                    {/* Post Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {post.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{post.user_name}</h4>
                        <p className="text-sm text-gray-500">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {formatDate(post.created_at)} • {post.user_role}
                        </p>
                      </div>
                      <div className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 flex items-center gap-1">
                        {post.media_type === 'image' && <ImageIcon className="w-3 h-3" />}
                        {post.media_type === 'video' && <Video className="w-3 h-3" />}
                        {post.media_type === 'meme' && <Smile className="w-3 h-3" />}
                        {post.media_type === 'text' && <MessageCircle className="w-3 h-3" />}
                        {post.media_type}
                      </div>
                    </div>

                    {/* Post Title */}
                    {post.title && (
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{post.title}</h3>
                    )}

                    {/* Post Content */}
                    <div className="mb-4">
                      <p className="text-gray-800 whitespace-pre-wrap text-base leading-relaxed">{post.content}</p>
                    </div>

                    {/* Post Media */}
                    {post.media_url && (
                      <div className="mb-4">
                        {post.media_type === 'image' || post.media_type === 'meme' ? (
                          <img 
                            src={post.media_url} 
                            alt="Post media" 
                            className="w-full max-h-96 object-cover rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
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
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Post Engagement Stats (READ-ONLY) */}
                    <div className="flex items-center gap-6 pt-4 border-t bg-gray-50 -m-6 mt-4 p-4 rounded-b-lg">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Heart className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium">{post.likes_count} Likes</span>
                      </div>
                      
                      <button
                        onClick={() => toggleComments(post.id)}
                        className="flex items-center gap-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium">{post.comments_count} Comments</span>
                        {showComments[post.id] ? 
                          <ChevronUp className="w-3 h-3" /> : 
                          <ChevronDown className="w-3 h-3" />
                        }
                      </button>
                      
                      <div className="flex items-center gap-2 text-gray-600">
                        <Share2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium">Shared</span>
                      </div>

                      <div className="ml-auto text-xs text-gray-500 bg-white px-2 py-1 rounded">
                        👁️ Admin View Only
                      </div>
                    </div>

                    {/* Comments Section (ADMIN READ-ONLY) */}
                    {showComments[post.id] && (
                      <div className="bg-gray-50 -m-6 mx-0 p-4 border-t">
                        <div className="flex items-center gap-2 mb-3">
                          <MessageCircle className="w-4 h-4 text-blue-500" />
                          <span className="font-medium text-gray-700">Comments ({post.comments_count})</span>
                          <span className="text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded">Admin View</span>
                        </div>
                        
                        {postComments[post.id] && postComments[post.id].length > 0 ? (
                          <div className="space-y-3 max-h-60 overflow-y-auto">
                            {postComments[post.id].map((comment) => (
                              <div key={comment.id} className="bg-white p-3 rounded-lg shadow-sm border">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                    {comment.user_name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-medium text-gray-900 text-sm">{comment.user_name}</span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(comment.created_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                <p className="text-gray-800 text-sm leading-relaxed">{comment.comment_text}</p>
                              </div>
                            ))}
                          </div>
                        ) : postComments[post.id] ? (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            No comments yet
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            <div className="animate-pulse">Loading comments...</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminMultimediaView;