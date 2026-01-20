import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { CalendarIcon, Plus, Trash2, Upload } from "lucide-react";
import { format } from "date-fns";
import Sidebar from "@/components/Sidebar";
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { autoCreateNotifications } from "@/lib/notificationService";


interface Committee {
  id: string;
  name: string;
  role: string;
  email: string;
}

const EventRequest = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [formData, setFormData] = useState({
    eventTitle: "",
    eventType: "",
    description: "",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    venue: "",
    expectedParticipants: "",
    budget: "",
    objectives: "",
    targetAudience: "",
    requirements: "",
  });
  
  const [committees, setCommittees] = useState<Committee[]>([
    { id: "1", name: "", role: "", email: "" }
  ]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addCommittee = () => {
    setCommittees(prev => [...prev, { 
      id: Date.now().toString(), 
      name: "", 
      role: "", 
      email: "" 
    }]);
  };

  const removeCommittee = (id: string) => {
    setCommittees(prev => prev.filter(committee => committee.id !== id));
  };

  const updateCommittee = (id: string, field: keyof Committee, value: string) => {
    setCommittees(prev => prev.map(committee => 
      committee.id === id ? { ...committee, [field]: value } : committee
    ));
  };

  const supabase = useSupabaseClient();
const user = useUser();

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!user) {
    toast({
      title: "Not logged in",
      description: "Please log in first.",
      variant: "destructive"
    });
    return;
  }
  
  const { data, error } = await supabase.from('event_requests').insert([{
    user_id: user.id,
    event_title: formData.eventTitle,
    event_type: formData.eventType,
    description: formData.description,
    start_date: formData.startDate ? formData.startDate.toISOString().split('T')[0] : null,
    end_date: formData.endDate ? formData.endDate.toISOString().split('T')[0] : null,
    venue: formData.venue,
    expected_participants: formData.expectedParticipants ? Number(formData.expectedParticipants) : null,
    budget: formData.budget ? Number(formData.budget) : null,
    objectives: formData.objectives,
    target_audience: formData.targetAudience,
    requirements: formData.requirements,
    committees: JSON.stringify(committees),
    status: 'pending'
  }]).select().single();
  
  if (error) {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive"
    });
  } else {
    // Create notification for admins about new event request
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single();
      
      await autoCreateNotifications.newEventRequest(
        data.id,
        userData?.name || 'Unknown User',
        formData.eventTitle
      );
    } catch (notifError) {
      console.log('Admin notification failed (non-critical):', notifError);
    }
    
    toast({
      title: "Event Request Submitted! 🎉",
      description: "Your event request has been submitted for approval. Admins have been notified.",
    });
    
    // Reset form
    setFormData({
      eventTitle: "",
      eventType: "",
      description: "",
      startDate: undefined,
      endDate: undefined,
      venue: "",
      expectedParticipants: "",
      budget: "",
      objectives: "",
      targetAudience: "",
      requirements: "",
    });
    setCommittees([{ id: "1", name: "", role: "", email: "" }]);
  }
};

  return (
    <div className="flex h-screen bg-white">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-border p-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Event Request Form</h1>
            <p className="text-muted-foreground mt-1">
              Submit a new event request for approval
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
            
            {/* Basic Information */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Provide the fundamental details about your event
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eventTitle">Event Title *</Label>
                    <Input 
                      id="eventTitle"
                      placeholder="Enter event title"
                      value={formData.eventTitle}
                      onChange={(e) => handleInputChange("eventTitle", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eventType">Event Type *</Label>
                    <Select 
                      value={formData.eventType} 
                      onValueChange={(value) => handleInputChange("eventType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="academic">Academic</SelectItem>
                        <SelectItem value="sports">Sports</SelectItem>
                        <SelectItem value="cultural">Cultural</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="conference">Conference</SelectItem>
                        <SelectItem value="social">Social</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Event Description *</Label>
                  <Textarea 
                    id="description"
                    placeholder="Provide a detailed description of the event"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className="min-h-[100px]"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.startDate ? format(formData.startDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.startDate}
                          onSelect={(date) => setFormData(prev => ({ ...prev, startDate: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>End Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.endDate ? format(formData.endDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.endDate}
                          onSelect={(date) => setFormData(prev => ({ ...prev, endDate: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="venue">Venue *</Label>
                    <Input 
                      id="venue"
                      placeholder="Event venue"
                      value={formData.venue}
                      onChange={(e) => handleInputChange("venue", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expectedParticipants">Expected Participants</Label>
                    <Input 
                      id="expectedParticipants"
                      type="number"
                      placeholder="Number of participants"
                      value={formData.expectedParticipants}
                      onChange={(e) => handleInputChange("expectedParticipants", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budget">Estimated Budget</Label>
                    <Input 
                      id="budget"
                      placeholder="Budget in USD"
                      value={formData.budget}
                      onChange={(e) => handleInputChange("budget", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Event Details */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
                <CardDescription>
                  Additional information about your event
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="objectives">Event Objectives</Label>
                  <Textarea 
                    id="objectives"
                    placeholder="What are the main objectives of this event?"
                    value={formData.objectives}
                    onChange={(e) => handleInputChange("objectives", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetAudience">Target Audience</Label>
                  <Input 
                    id="targetAudience"
                    placeholder="Who is this event for?"
                    value={formData.targetAudience}
                    onChange={(e) => handleInputChange("targetAudience", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requirements">Special Requirements</Label>
                  <Textarea 
                    id="requirements"
                    placeholder="Any special equipment, catering, or other requirements?"
                    value={formData.requirements}
                    onChange={(e) => handleInputChange("requirements", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Committee Members */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Committee Members
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={addCommittee}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Member
                  </Button>
                </CardTitle>
                <CardDescription>
                  Add the organizing committee members for this event
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {committees.map((committee, index) => (
                  <div key={committee.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-border rounded-lg">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input 
                        placeholder="Full name"
                        value={committee.name}
                        onChange={(e) => updateCommittee(committee.id, "name", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Input 
                        placeholder="Committee role"
                        value={committee.role}
                        onChange={(e) => updateCommittee(committee.id, "role", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input 
                        type="email"
                        placeholder="Email address"
                        value={committee.email}
                        onChange={(e) => updateCommittee(committee.id, "email", e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      {committees.length > 1 && (
                        <Button 
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeCommittee(committee.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* File Uploads */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Supporting Documents</CardTitle>
                <CardDescription>
                  Upload any relevant documents for your event
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <div className="mt-4">
                    <Button variant="outline">
                      Choose Files
                    </Button>
                    <p className="mt-2 text-sm text-muted-foreground">
                      PDF, DOC, XLS files up to 10MB each
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline">
                Save as Draft
              </Button>
              <Button type="submit" variant="gradient">
                Submit for Approval
              </Button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default EventRequest;