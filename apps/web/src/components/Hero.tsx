import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, FileText, Brain } from "lucide-react";
import { Link } from "react-router-dom";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-primary/5 to-background py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-accent/10 border border-accent/20">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-foreground">AI-Powered Recruitment Platform</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Find the Best Candidates.
            <span className="block text-primary mt-2">Hire Faster.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl">
            AI-powered candidate screening that analyses CVs, scores candidate fit, and helps you find top talent in seconds.
          </p>
          
          <Button asChild size="lg" variant="hero" className="mb-12">
            <Link to="/auth">
              Get Started <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>

          <div className="w-full bg-card rounded-xl shadow-xl border border-border p-6 md:p-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-muted/50 rounded-lg p-5 text-left border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="text-sm font-semibold">Candidate Profile</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-lg font-semibold">Jane Doe</p>
                    <p className="text-sm text-muted-foreground">jane@example.com</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Key Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">Project Management</span>
                      <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">Leadership</span>
                      <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">Strategy</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Experience</p>
                    <p className="text-sm">Senior Manager at TechCorp</p>
                    <p className="text-xs text-muted-foreground">3 years</p>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-5 text-left border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-5 h-5 text-accent" />
                  <span className="text-sm font-semibold">Match Score</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-3xl font-bold text-success">87%</span>
                      <span className="px-3 py-1 bg-success/10 text-success text-sm font-medium rounded-full">Excellent Fit</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Skills Match</span>
                        <span className="font-medium">92%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{width: '92%'}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Experience</span>
                        <span className="font-medium">85%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{width: '85%'}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Education</span>
                        <span className="font-medium">78%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{width: '78%'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-8 mt-12 text-sm text-muted-foreground">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-foreground">90%</span>
              <span>Faster Screening</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-foreground">50%</span>
              <span>Reduced Time-to-Hire</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-foreground">98.5%</span>
              <span>Accuracy Rate</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
