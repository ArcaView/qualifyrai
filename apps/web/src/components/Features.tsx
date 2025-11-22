import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Brain, Shield, Zap, Users, BarChart3 } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Resume Parsing",
    description: "Extract key information from any resume format with 98.5% accuracy. Works with PDFs, Word documents, and varied layouts.",
  },
  {
    icon: Brain,
    title: "Candidate Scoring",
    description: "Score candidates against your job requirements. Get detailed breakdowns showing skills match, experience fit, and education alignment.",
  },
  {
    icon: Shield,
    title: "Fair & Compliant",
    description: "Transparent scoring with bias prevention built in. GDPR-compliant with audit trails for every decision.",
  },
  {
    icon: Zap,
    title: "Fast Processing",
    description: "Screen hundreds of candidates in seconds. Get results in real-time to identify top talent quickly.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Share candidate profiles, compare shortlists, and collaborate with your hiring team. Keep everyone aligned with centralized data.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "Track hiring pipeline metrics, time-to-hire, and candidate quality. Use data to improve your recruitment process.",
  },
];

export const Features = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Key Features
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tools to help you screen candidates faster and make better hiring decisions.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="border-border hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
