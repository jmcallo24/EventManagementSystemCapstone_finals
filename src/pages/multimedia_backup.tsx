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
  Camera,
  Plus
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

const MultimediaPage = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
  const [comments, setComments] = useState<{ [postId: string]: MultimediaComment[] }>({});
  const [newComment, setNewComment] = useState<{ [postId: string]: string }>({});
  const { toast } = useToast();

  // Add event
  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.date) return;
    setEvents([
      {
        id: events.length > 0 ? events[events.length - 1].id + 1 : 1,
        title: form.title,
        description: form.description,
        date: form.date,
        image: form.image,
      },
      ...events,
    ]);
    setForm({ title: "", description: "", date: "", image: "" });
    setShowForm(false);
  };

  // Delete event
  const handleDelete = (id: number) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const filtered = events.filter(
    e =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen w-screen bg-white overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 flex flex-col h-screen w-full p-0 m-0">
        <header className="bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-4 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">MULTIMEDIA EVENTS</h1>
          <Button
            variant="gradient"
            className="bg-gradient-to-r from-blue-500 to-violet-500 text-white flex items-center gap-2"
            onClick={() => setShowForm(true)}
          >
            <Plus className="w-5 h-5" /> Add Event
          </Button>
        </header>
        <section className="flex-1 flex flex-col items-center justify-start bg-white p-4 overflow-auto">
          <div className="w-full max-w-5xl">
            <div className="flex items-center justify-between mb-4">
              <Input
                placeholder="Search events..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-80"
              />
            </div>
            {/* Add Event Modal */}
            {showForm && (
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
                  <button
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
                    onClick={() => setShowForm(false)}
                  >
                    ×
                  </button>
                  <h2 className="text-xl font-bold mb-4">Add Event</h2>
                  <form onSubmit={handleAddEvent} className="space-y-3">
                    <div>
                      <Label htmlFor="event-title">Title</Label>
                      <Input
                        id="event-title"
                        value={form.title}
                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="event-description">Description</Label>
                      <Input
                        id="event-description"
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="event-date">Date</Label>
                      <Input
                        id="event-date"
                        type="date"
                        value={form.date}
                        onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="event-image">Image</Label>
                      <Input
                        id="event-image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                      {form.image && (
                        <img src={form.image} alt="Event" className="mt-2 h-24 rounded object-cover" />
                      )}
                    </div>
                    <Button type="submit" variant="gradient" className="w-full mt-2">
                      Add Event
                    </Button>
                  </form>
                </div>
              </div>
            )}
            {/* Event Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
              {filtered.length === 0 && (
                <div className="text-center py-6 text-gray-400 col-span-3">
                  No events found.
                </div>
              )}
              {filtered.map(event => (
                <div key={event.id} className="bg-white rounded-lg shadow border p-4 flex flex-col">
                  <div className="relative h-40 mb-3">
                    {event.image ? (
                      <img src={event.image} alt={event.title} className="h-full w-full object-cover rounded" />
                    ) : (
                      <div className="flex items-center justify-center h-full w-full bg-gray-100 rounded">
                        <ImageIcon className="w-10 h-10 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-lg mb-1">{event.title}</h3>
                  <p className="text-gray-600 mb-2">{event.description}</p>
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <CalendarDays className="w-4 h-4 mr-1" />
                    {event.date}
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    className="self-end text-destructive"
                    aria-label="Delete"
                    onClick={() => handleDelete(event.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default MultimediaPage;