import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Image as ImageIcon, 
  Video, 
  Smile,
  Send,
  Plus,
  Trash2,
  CalendarDays
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

// Extended interface to include comments
interface ExtendedMultimediaPost extends MultimediaPost {
  comments?: MultimediaComment[];
}

const MultimediaPage = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [posts, setPosts] = useState<ExtendedMultimediaPost[]>([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [postForm, setPostForm] = useState({
    title: "",
    content: "",
    media_type: "text" as "image" | "video" | "text" | "meme",
    tags: ""
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newComment, setNewComment] = useState<{ [postId: string]: string }>({});
  const [showComments, setShowComments] = useState<{ [postId: string]: boolean }>({});
  const { toast } = useToast();

  // Load user data
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      console.log('🔑 ADMIN MULTIMEDIA: User loaded:', parsedUser);
    }
  }, []);

  // Load posts from database
  const loadPosts = async () => {
    try {
      console.log('📱 Loading multimedia posts...');
      const allPosts = await getAllMultimediaPosts();
      
      // Load comments for each post
      const postsWithComments = await Promise.all(
        allPosts.map(async (post) => {
          const comments = await getPostComments(post.id);
          return { ...post, comments };
        })
      );
      
      setPosts(postsWithComments);
      console.log('✅ Loaded posts with comments:', postsWithComments.length);
    } catch (error) {
      console.error("Error loading posts:", error);
    }
  };

  useEffect(() => {
    loadPosts();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(loadPosts, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-detect media type
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

      // Upload file if selected
      if (selectedFile) {
        console.log('📸 Uploading media file...');
        mediaUrl = await uploadMultimediaFile(selectedFile);
        if (!mediaUrl) {
          throw new Error("Failed to upload media");
        }
        console.log('✅ Media uploaded:', mediaUrl);
      }

      // Create post
      console.log('🎬 Creating post...');
      const newPost = await createMultimediaPost({
        user_name: "Event Organizer", // You can get this from auth context
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
        
        // Reset form
        setPostForm({ title: "", content: "", media_type: "text", tags: "" });
        setSelectedFile(null);
        setShowCreatePost(false);
        
        // Reload posts
        await loadPosts();
      } else {
        throw new Error("Failed to create post");
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
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Please log in to like posts",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('👍 ADMIN: Liking post with user ID:', user.id, 'Post:', postId);
      const success = await likePost(postId, user.id);
      
      if (success) {
        await loadPosts(); // Reload to update like count
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
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Please log in to comment",
        variant: "destructive"
      });
      return;
    }

    const commentText = newComment[postId];
    if (!commentText?.trim()) return;

    try {
      console.log('💬 ADMIN: Adding comment with user ID:', user.id, 'Post:', postId, 'Comment:', commentText);
      const comment = await addComment(postId, user.id, user.name || "Administrator", commentText);
      
      if (comment) {
        // Clear comment input
        setNewComment(prev => ({ ...prev, [postId]: "" }));
        
        // Show comments for this post
        setShowComments(prev => ({ ...prev, [postId]: true }));
        
        // Reload posts
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

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex h-screen w-screen bg-white overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 flex flex-col h-screen w-full p-0 m-0">
        <header className="bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">📱 Multimedia Feed</h1>
            <p className="text-blue-100 text-sm">Share your event moments, memes, and updates!</p>
          </div>
          <div className="text-white text-sm">
            {posts.length} posts
          </div>
        </header>
        
        <section className="flex-1 flex flex-col items-center justify-start bg-gray-50 p-4 overflow-auto">
          <div className="w-full max-w-4xl">
            
            {/* Create Post Button */}
            <div className="mb-6">
              <Button
                onClick={() => setShowCreatePost(true)}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center gap-2 py-4"
                size="lg"
              >
                <Plus className="w-5 h-5" />
                What's happening at your event? Share a moment! 🎉
              </Button>
            </div>

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
                      <textarea
                        id="post-content"
                        className="w-full p-3 border rounded-lg resize-none"
                        rows={4}
                        placeholder="What's on your mind? Share your event updates, funny moments, memes, or anything!"
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
                      <Label htmlFor="post-media">Media Type</Label>
                      <div className="flex gap-2 mt-2">
                        {[
                          { type: 'text', icon: MessageCircle, label: 'Text' },
                          { type: 'image', icon: ImageIcon, label: 'Image' },
                          { type: 'video', icon: Video, label: 'Video' },
                          { type: 'meme', icon: Smile, label: 'Meme' }
                        ].map(({ type, icon: Icon, label }) => (
                          <Button
                            key={type}
                            variant={postForm.media_type === type ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPostForm(prev => ({ ...prev, media_type: type as any }))}
                            className="flex items-center gap-1"
                          >
                            <Icon className="w-4 h-4" />
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
                <div className="text-center py-12 bg-white rounded-lg shadow-md">
                  <Smile className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No posts yet!</h3>
                  <p className="text-gray-500 mb-4">Be the first to share something awesome!</p>
                  <Button
                    onClick={() => setShowCreatePost(true)}
                    className="bg-gradient-to-r from-blue-500 to-purple-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Post
                  </Button>
                </div>
              ) : (
                posts.map((post) => (
                  <div key={post.id} className="bg-white rounded-lg shadow-md border p-6 hover:shadow-lg transition-shadow">
                    {/* Post Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {post.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{post.user_name}</h4>
                        <p className="text-sm text-gray-500">{formatDate(post.created_at)} • {post.user_role}</p>
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
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full hover:bg-blue-200 cursor-pointer">
                              #{tag}
                            </span>
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
                        className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors"
                      >
                        <Heart className="w-4 h-4" />
                        {post.likes_count} Likes
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                        className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        {post.comments_count} Comments
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2 text-gray-600 hover:text-green-500 transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                        Share
                      </Button>
                    </div>

                    {/* Comments Display */}
                    {showComments[post.id] && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-semibold text-gray-800 mb-3">💬 Comments ({post.comments?.length || 0})</h4>
                        {post.comments && post.comments.length > 0 ? (
                          <div className="space-y-3 max-h-60 overflow-y-auto">
                            {post.comments.map((comment: any) => (
                              <div key={comment.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                  {comment.user_name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-gray-900 text-sm">{comment.user_name}</span>
                                    <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                                  </div>
                                  <p className="text-gray-800 text-sm">{comment.comment_text}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p>No comments yet. Be the first to comment!</p>
                          </div>
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
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
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

export default MultimediaPage;