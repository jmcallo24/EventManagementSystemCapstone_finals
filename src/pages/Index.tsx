import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, CheckCircle, ArrowRight, Star, Shield } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10"></div>
      
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
    

        {/* Hero Section */}
        <section className="py-20 px-6 relative">
          <div className="absolute inset-0 z-0">
            <img 
              src={heroImage} 
              alt="School event management - Students at graduation ceremony with digital interfaces" 
              className="w-full h-full object-cover opacity-20 rounded-3xl mx-6"
            />
          </div>
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              School Event
              <span className="block gradient-primary bg-clip-text text-transparent">
                Management System
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Streamline your school events from planning to execution. 
              Manage participants, approvals, and analytics all in one beautiful platform.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                variant="gradient"
                className="px-8 py-3 shadow-xl"
                onClick={() => navigate("/login")}
              >
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-primary/20 text-primary hover:bg-primary hover:text-white px-8 py-3"
              >
                Learn More
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-foreground mb-4">
                Everything You Need to Manage Events
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                From event creation to post-event analytics, we've got you covered with powerful tools and intuitive design.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-white border shadow-lg card-elevated">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl text-foreground">Event Planning</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground text-center">
                    Create and manage events with detailed scheduling, venue booking, and comprehensive planning tools.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="bg-white border shadow-lg card-elevated">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 gradient-secondary rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl text-foreground">Participant Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground text-center">
                    Handle registrations, track attendance, and manage participant data with ease and efficiency.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="bg-white border shadow-lg card-elevated">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 gradient-secondary rounded-lg flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl text-foreground">Approval Workflow</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground text-center">
                    Streamlined approval process with automated notifications and role-based access control.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

       
        {/* CTA Section */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <Card className="bg-white border shadow-xl p-8 card-elevated">
              <CardHeader>
                <CardTitle className="text-3xl font-bold text-foreground mb-4">
                  Ready to Transform Your Event Management?
                </CardTitle>
                <CardDescription className="text-muted-foreground text-lg">
                  Join thousands of schools already using our platform to create memorable events.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <Button 
                  size="lg" 
                  variant="gradient"
                  className="px-8 py-3"
                  onClick={() => navigate("/login")}
                >
                  Start Your Journey
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-6 border-t border-border">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-muted-foreground">
              © 2025 School Event Management System.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
