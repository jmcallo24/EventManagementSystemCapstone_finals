import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { CalendarIcon, Plus, Trash2, Upload, Download, FileText, Send, Heart, Sparkles } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabaseClient";
import { autoCreateNotifications } from "@/lib/notificationService";

interface EventRequestForm {
  // Request Details
  eventRequestedBy: string;
  position: string;
  organization: string;
  contactNumber: string;
  email: string;
  dateOfSubmission: string;
  
  // Event Information
  eventName: string;
  purpose: string;
  participants: string;
  modality: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  overallInCharge: string;
  
  // Committee Assignments
  invitation: string;
  program: string;
  soundSystem: string;
  stageDecoration: string;
  demolitionCleanup: string;
  foodRefreshments: string;
  safetySecurity: string;
  documentation: string;
  registration: string;
  evaluation: string;
  
  // Pre-event Requirements
  letterOfRequest: boolean;
  studentBoardResolution: boolean;
  eventProgram: boolean;
  listOfPermits: boolean;
  certificateCopy: boolean;
  
  // Status
  status: "draft" | "submitted" | "pending" | "approved" | "rejected";
}

const EventRequestFormComponent = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formData, setFormData] = useState<EventRequestForm>({
    eventRequestedBy: "",
    position: "",
    organization: "",
    contactNumber: "",
    email: "",
    dateOfSubmission: new Date().toISOString().split('T')[0],
    eventName: "",
    purpose: "",
    participants: "",
    modality: "",
    eventDate: "",
    eventTime: "",
    venue: "",
    overallInCharge: "",
    invitation: "",
    program: "",
    soundSystem: "",
    stageDecoration: "",
    demolitionCleanup: "",
    foodRefreshments: "",
    safetySecurity: "",
    documentation: "",
    registration: "",
    evaluation: "",
    letterOfRequest: false,
    studentBoardResolution: false,
    eventProgram: false,
    listOfPermits: false,
    certificateCopy: false,
    status: "draft"
  });

  const handleInputChange = (field: keyof EventRequestForm, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Generate PDF function
  const generatePDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Event Request Form</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .section { margin-bottom: 20px; }
          .section-title { font-weight: bold; background: #f0f0f0; padding: 5px; margin-bottom: 10px; }
          .form-row { margin-bottom: 8px; }
          .label { font-weight: bold; display: inline-block; width: 200px; }
          .value { border-bottom: 1px solid #000; display: inline-block; min-width: 300px; padding-bottom: 2px; }
          .checkbox { margin-right: 10px; }
          .committee-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .committee-table th, .committee-table td { border: 1px solid #000; padding: 8px; text-align: left; }
          .committee-table th { background: #f0f0f0; }
          .footer { margin-top: 30px; border-top: 1px solid #000; padding-top: 15px; font-size: 12px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>EVENT REQUEST FORM</h1>
        </div>
        
        <div class="section">
          <div class="section-title">REQUEST DETAILS</div>
          <div class="form-row">
            <span class="label">Event Requested By:</span>
            <span class="value">${formData.eventRequestedBy}</span>
          </div>
          <div class="form-row">
            <span class="label">Position / Designation:</span>
            <span class="value">${formData.position}</span>
          </div>
          <div class="form-row">
            <span class="label">Organization / Department:</span>
            <span class="value">${formData.organization}</span>
          </div>
          <div class="form-row">
            <span class="label">Contact Number / Email:</span>
            <span class="value">${formData.contactNumber} / ${formData.email}</span>
          </div>
          <div class="form-row">
            <span class="label">Date of Submission:</span>
            <span class="value">${formData.dateOfSubmission}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">EVENT INFORMATION</div>
          <div class="form-row">
            <span class="label">Event Name:</span>
            <span class="value">${formData.eventName}</span>
          </div>
          <div class="form-row">
            <span class="label">Purpose:</span>
            <span class="value">${formData.purpose}</span>
          </div>
          <div class="form-row">
            <span class="label">Participants:</span>
            <span class="value">${formData.participants}</span>
          </div>
          <div class="form-row">
            <span class="label">Modality:</span>
            <span class="value">${formData.modality}</span>
          </div>
          <div class="form-row">
            <span class="label">Event Date:</span>
            <span class="value">${formData.eventDate}</span>
            <span class="label" style="margin-left: 50px;">Time:</span>
            <span class="value">${formData.eventTime}</span>
          </div>
          <div class="form-row">
            <span class="label">Venue:</span>
            <span class="value">${formData.venue}</span>
          </div>
          <div class="form-row">
            <span class="label">Overall In-Charge:</span>
            <span class="value">${formData.overallInCharge}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">EVENT COMMITTEE ASSIGNMENTS</div>
          <table class="committee-table">
            <tr><td>1. Invitation:</td><td>${formData.invitation}</td></tr>
            <tr><td>2. Program:</td><td>${formData.program}</td></tr>
            <tr><td>3. Sound System:</td><td>${formData.soundSystem}</td></tr>
            <tr><td>4. Stage Decoration:</td><td>${formData.stageDecoration}</td></tr>
            <tr><td>5. Demolition / Clean-Up:</td><td>${formData.demolitionCleanup}</td></tr>
            <tr><td>6. Food / Refreshments:</td><td>${formData.foodRefreshments}</td></tr>
            <tr><td>7. Safety & Security:</td><td>${formData.safetySecurity}</td></tr>
            <tr><td>8. Documentation:</td><td>${formData.documentation}</td></tr>
            <tr><td>9. Registration:</td><td>${formData.registration}</td></tr>
            <tr><td>10. Evaluation:</td><td>${formData.evaluation}</td></tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">PRE-EVENT REQUIREMENTS</div>
          <div class="form-row">
            <input type="checkbox" ${formData.letterOfRequest ? 'checked' : ''} disabled> Letter of Request (signed by Program Head or Dean)
          </div>
          <div class="form-row">
            <input type="checkbox" ${formData.studentBoardResolution ? 'checked' : ''} disabled> Student Board Resolution (if applicable)
          </div>
          <div class="form-row">
            <input type="checkbox" ${formData.eventProgram ? 'checked' : ''} disabled> Event Program / Invitation
          </div>
          <div class="form-row">
            <input type="checkbox" ${formData.listOfPermits ? 'checked' : ''} disabled> List of Permits Needed (if applicable)
          </div>
          <div class="form-row">
            <input type="checkbox" ${formData.certificateCopy ? 'checked' : ''} disabled> Copy of Certificate (if applicable)
          </div>
        </div>

        <div class="footer">
          <p><strong>IMPORTANT REMINDERS:</strong></p>
          <ul>
            <li>Requests must be submitted to the Office of the School Activities 8 days or more before the event date to comply with the VPAA's 7-day requirement.</li>
            <li>The Office of the School Activities is open Monday to Friday, 8:00 a.m. to 5:00 p.m. only.</li>
            <li>Incomplete requirements will not be accepted.</li>
          </ul>
          <p style="margin-top: 20px;">Generated on: ${new Date().toLocaleDateString()} | Status: ${formData.status.toUpperCase()}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      
      if (!user?.id) {
        toast({
          title: "Authentication Required",
          description: "Please log in to submit an event request.",
          variant: "destructive"
        });
        return;
      }

      // Update status to submitted
      const submissionData = {
        ...formData,
        status: "submitted",
        dateOfSubmission: new Date().toISOString().split('T')[0]
      };

      const { data, error } = await supabase
        .from('event_requests')
        .insert([{
          requester_id: user.id,
          title: formData.eventName,
          event_type: formData.modality || 'Other',
          description: formData.purpose,
          date: formData.eventDate,
          time: formData.eventTime,
          venue: formData.venue,
          expected_participants: parseInt(formData.participants) || 0,
          request_reason: formData.purpose,
          form_data: JSON.stringify(submissionData),
          status: 'pending',
          requester_name: formData.eventRequestedBy
        }])
        .select()
        .single();

      if (error) {
        console.error('Error submitting request:', error);
        throw error;
      }

      // Create notification for admins
      try {
        await autoCreateNotifications.newEventRequest(
          data.id,
          formData.eventRequestedBy,
          formData.eventName
        );
      } catch (notifError) {
        console.log('Admin notification failed (non-critical):', notifError);
      }

      setShowSuccessModal(true);
      
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit event request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-white">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-gradient-to-r from-green-500 to-blue-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                <FileText className="w-8 h-8" />
                Event Request Form
              </h1>
              <p className="text-green-100 text-sm mt-1">
                Submit your official event request for approval
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                onClick={generatePDF}
                disabled={!formData.eventName}
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </header>

        <main className="p-6 max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Request Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📋 REQUEST DETAILS</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="eventRequestedBy">Event Requested By *</Label>
                  <Input
                    id="eventRequestedBy"
                    value={formData.eventRequestedBy}
                    onChange={(e) => handleInputChange('eventRequestedBy', e.target.value)}
                    required
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="position">Position / Designation *</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    required
                    placeholder="e.g., Student President, Department Head"
                  />
                </div>
                <div>
                  <Label htmlFor="organization">Organization / Department *</Label>
                  <Input
                    id="organization"
                    value={formData.organization}
                    onChange={(e) => handleInputChange('organization', e.target.value)}
                    required
                    placeholder="e.g., Student Council, BSIT Department"
                  />
                </div>
                <div>
                  <Label htmlFor="contactNumber">Contact Number *</Label>
                  <Input
                    id="contactNumber"
                    value={formData.contactNumber}
                    onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                    required
                    placeholder="+63 9XX XXX XXXX"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                    placeholder="your.email@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="dateOfSubmission">Date of Submission</Label>
                  <Input
                    id="dateOfSubmission"
                    type="date"
                    value={formData.dateOfSubmission}
                    onChange={(e) => handleInputChange('dateOfSubmission', e.target.value)}
                    readOnly
                  />
                </div>
              </CardContent>
            </Card>

            {/* Event Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🎉 EVENT INFORMATION</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="eventName">Event Name *</Label>
                  <Input
                    id="eventName"
                    value={formData.eventName}
                    onChange={(e) => handleInputChange('eventName', e.target.value)}
                    required
                    placeholder="Annual Science Fair 2025"
                  />
                </div>
                <div>
                  <Label htmlFor="purpose">Purpose *</Label>
                  <Textarea
                    id="purpose"
                    value={formData.purpose}
                    onChange={(e) => handleInputChange('purpose', e.target.value)}
                    required
                    placeholder="Describe the purpose and objectives of the event"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="participants">Expected Participants *</Label>
                    <Input
                      id="participants"
                      value={formData.participants}
                      onChange={(e) => handleInputChange('participants', e.target.value)}
                      required
                      placeholder="e.g., 200 students"
                    />
                  </div>
                  <div>
                    <Label htmlFor="modality">Modality (Face-to-Face / Online / Hybrid) *</Label>
                    <select
                      value={formData.modality}
                      onChange={(e) => handleInputChange('modality', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                      required
                    >
                      <option value="">Select modality</option>
                      <option value="Face-to-Face">Face-to-Face</option>
                      <option value="Online">Online</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="eventDate">Event Date *</Label>
                    <Input
                      id="eventDate"
                      type="date"
                      value={formData.eventDate}
                      onChange={(e) => handleInputChange('eventDate', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="eventTime">Event Time *</Label>
                    <Input
                      id="eventTime"
                      type="time"
                      value={formData.eventTime}
                      onChange={(e) => handleInputChange('eventTime', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="venue">Venue *</Label>
                    <Select 
                      value={formData.venue} 
                      onValueChange={(value) => handleInputChange('venue', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select venue" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Main Campus – Quirino Highway, Brgy. Kaligayahan, Novaliches, Quezon City">Main Campus – Quirino Highway, Brgy. Kaligayahan, Novaliches, Quezon City</SelectItem>
                        <SelectItem value="Millionaire's Village Campus – Lot 762, Topaz and Sapphire Streets, Millionaire's Village, Novaliches, Quezon City">Millionaire's Village Campus – Lot 762, Topaz and Sapphire Streets, Millionaire's Village, Novaliches, Quezon City</SelectItem>
                        <SelectItem value="San Agustin Campus – 109 Susano Street, Brgy. San Agustin, Novaliches, Quezon City">San Agustin Campus – 109 Susano Street, Brgy. San Agustin, Novaliches, Quezon City</SelectItem>
                        <SelectItem value="Heavenly Drive Campus – Heavenly Drive, Susano Road, Brgy. San Agustin, Quezon City">Heavenly Drive Campus – Heavenly Drive, Susano Road, Brgy. San Agustin, Quezon City</SelectItem>
                        <SelectItem value="Le Palm Street Annex – Le Palm Street, Greenfields I, Brgy. Kaligayahan, Novaliches, Quezon City">Le Palm Street Annex – Le Palm Street, Greenfields I, Brgy. Kaligayahan, Novaliches, Quezon City</SelectItem>
                        <SelectItem value="Bulacan Campus – Lot 1 Ipo Road, Brgy. Minuyan, San Jose del Monte, Bulacan">Bulacan Campus – Lot 1 Ipo Road, Brgy. Minuyan, San Jose del Monte, Bulacan</SelectItem>
                        <SelectItem value="Others">Others (Please specify in requirements)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="overallInCharge">Overall In-Charge *</Label>
                  <Input
                    id="overallInCharge"
                    value={formData.overallInCharge}
                    onChange={(e) => handleInputChange('overallInCharge', e.target.value)}
                    required
                    placeholder="Name of the person in charge"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Committee Assignments */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">👥 EVENT COMMITTEE ASSIGNMENTS</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'invitation', label: '1. Invitation' },
                  { key: 'program', label: '2. Program' },
                  { key: 'soundSystem', label: '3. Sound System' },
                  { key: 'stageDecoration', label: '4. Stage Decoration' },
                  { key: 'demolitionCleanup', label: '5. Demolition / Clean-Up' },
                  { key: 'foodRefreshments', label: '6. Food / Refreshments' },
                  { key: 'safetySecurity', label: '7. Safety & Security' },
                  { key: 'documentation', label: '8. Documentation' },
                  { key: 'registration', label: '9. Registration' },
                  { key: 'evaluation', label: '10. Evaluation' }
                ].map(({ key, label }) => (
                  <div key={key}>
                    <Label htmlFor={key}>{label}</Label>
                    <Input
                      id={key}
                      value={formData[key as keyof EventRequestForm] as string}
                      onChange={(e) => handleInputChange(key as keyof EventRequestForm, e.target.value)}
                      placeholder="Assigned person/team"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Pre-event Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📄 PRE-EVENT REQUIREMENTS</CardTitle>
                <CardDescription>Check all documents that will be attached upon submission</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: 'letterOfRequest', label: 'Letter of Request (signed by Program Head or Dean)' },
                  { key: 'studentBoardResolution', label: 'Student Board Resolution (if the event will be held outside the school or involves a proposal for collections)' },
                  { key: 'eventProgram', label: 'Event Program / Invitation' },
                  { key: 'listOfPermits', label: 'List of Permits Needed (if applicable)' },
                  { key: 'certificateCopy', label: 'Copy of Certificate (if applicable)' }
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={key}
                      checked={formData[key as keyof EventRequestForm] as boolean}
                      onChange={(e) => handleInputChange(key as keyof EventRequestForm, e.target.checked)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <Label htmlFor={key} className="text-sm font-normal">{label}</Label>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Important Reminders */}
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-lg text-orange-800">⚠️ IMPORTANT REMINDERS</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-orange-700 space-y-2">
                <ul className="list-disc list-inside space-y-1">
                  <li>Requests must be submitted to the Office of the School Activities <strong>8 days or more before the event date</strong> to comply with the VPAA's 7-day requirement.</li>
                  <li>The Office of the School Activities is open <strong>Monday to Friday, 8:00 a.m. to 5:00 p.m. only</strong>.</li>
                  <li>Incomplete requirements will not be accepted.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={loading}
              >
                {loading ? (
                  "Submitting..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Event Request
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={generatePDF}
                disabled={!formData.eventName}
                className="px-8"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </form>
        </main>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
            <div className="mb-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Heart className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted Successfully! 💝</h2>
              <p className="text-gray-600 mb-4">
                Your event request has been submitted and is now pending admin approval. 
                You'll receive a notification once it's reviewed.
              </p>
              <div className="flex items-center justify-center text-pink-600 text-sm">
                <Sparkles className="w-4 h-4 mr-1" />
                Thank you for using our event management system!
                <Sparkles className="w-4 h-4 ml-1" />
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={generatePDF}
                variant="outline"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button
                onClick={() => {
                  setShowSuccessModal(false);
                  // Reset form
                  window.location.reload();
                }}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Create Another Request
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventRequestFormComponent;