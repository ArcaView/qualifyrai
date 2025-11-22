import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Brain,
  Shield,
  Zap,
  Users,
  BarChart3,
  CheckCircle2,
  Globe,
  Lock,
  TrendingUp
} from "lucide-react";

const detailedFeatures = [
  {
    icon: FileText,
    title: "Resume Parsing",
    description: "Extract details from candidate resumes automatically, regardless of format or layout.",
    features: [
      "Support for PDF, Word (DOCX/DOC), and text files",
      "98.5% accuracy on contact information extraction",
      "Automatic identification of skills and competencies",
      "Work history with dates, roles, and companies",
      "Education details including degrees and institutions",
      "Handles multi-page resumes and varied layouts",
    ],
  },
  {
    icon: Brain,
    title: "Candidate Scoring",
    description: "Match candidates to your job requirements with AI scoring.",
    features: [
      "Automatic scoring against job requirements",
      "Detailed breakdown by skills, experience, and education",
      "AI-generated fit rationale and recommendations",
      "Identify top candidates at a glance",
      "Customizable scoring weights",
      "Transparent scoring explanations",
    ],
  },
  {
    icon: Shield,
    title: "Compliance & Fair Hiring",
    description: "Transparent rules, audit trails, and bias-free processes.",
    features: [
      "Complete score breakdown and transparency",
      "Audit trails for every hiring decision",
      "GDPR-compliant data handling",
      "Privacy-first design with data minimization",
      "Regional data storage options (UK/EU)",
      "Bias-free candidate evaluation",
    ],
  },
  {
    icon: Zap,
    title: "Fast Processing",
    description: "Screen hundreds of candidates in seconds.",
    features: [
      "Resume parsing in under 3 seconds",
      "Candidate scoring in under 2 seconds",
      "Bulk upload and process multiple candidates",
      "Smart caching for faster repeat analyses",
      "Handles high-volume recruitment drives",
      "99.9% uptime",
    ],
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Work with your hiring team from anywhere.",
    features: [
      "Share candidate profiles and shortlists",
      "Side-by-side candidate comparison",
      "Comment and rate candidates collaboratively",
      "Track candidate status through hiring stages",
      "Email notifications for team updates",
      "Role-based access control for security",
    ],
  },
  {
    icon: BarChart3,
    title: "Recruitment Analytics",
    description: "Insights to improve your hiring process.",
    features: [
      "Track time-to-hire and pipeline metrics",
      "Monitor candidate quality and scoring trends",
      "Team performance and productivity stats",
      "Hiring funnel conversion analytics",
      "Export detailed reports for stakeholders",
      "Historical data for planning",
    ],
  },
];

const securityFeatures = [
  {
    icon: Lock,
    title: "Enterprise Security",
    items: [
      "Bank-level encryption for all data",
      "Secure API key authentication",
      "Regular security audits and updates",
      "Rate limiting and abuse prevention",
      "File size validation and safety checks",
      "Industry-standard security protocols",
    ],
  },
  {
    icon: Globe,
    title: "Privacy & Data Protection",
    items: [
      "GDPR and privacy law compliance",
      "Data anonymization options available",
      "Encrypted storage for sensitive information",
      "Automatic data retention policies",
      "Regional data storage compliance",
      "Easy data deletion and export tools",
    ],
  },
];

const FeaturesPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 text-center">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Features</Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Recruitment Tools for Hiring Teams
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              AI-powered screening, team collaboration, and analytics to help you hire better candidates faster.
            </p>
          </div>
        </section>

        {/* Detailed Features */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {detailedFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index} className="border-border">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-2xl">{feature.title}</CardTitle>
                      <CardDescription className="text-base">{feature.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {feature.features.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-muted-foreground">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                Security & Privacy
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Your candidate data is protected with bank-level security. GDPR-compliant and audit-ready.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {securityFeatures.map((section, index) => {
                const Icon = section.icon;
                return (
                  <Card key={index} className="border-border">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-accent" />
                      </div>
                      <CardTitle className="text-xl">{section.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {section.items.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-muted-foreground">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Start screening candidates with AI today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/auth"
                className="inline-flex items-center justify-center h-11 px-8 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors"
              >
                Start Free Trial
              </a>
              <a
                href="/pricing"
                className="inline-flex items-center justify-center h-11 px-8 rounded-md border-2 border-primary bg-background text-primary hover:bg-primary/5 font-medium transition-colors"
              >
                View Pricing
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FeaturesPage;
