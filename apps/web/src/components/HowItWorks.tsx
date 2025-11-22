import { Badge } from "@/components/ui/badge";
import { ArrowRight, Upload, Sparkles, Users } from "lucide-react";

export const HowItWorks = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload resumes, let AI score candidates, and review the best matches for your role.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Upload className="w-7 h-7 text-primary" />
                </div>
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Step 1</Badge>
                <h3 className="text-2xl font-bold mb-3">Upload Resumes</h3>
                <p className="text-muted-foreground mb-4">
                  Drag and drop or upload candidate resumes in any format (PDF, Word, or plain text). Bulk upload dozens of CVs at once.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>Support for all major file formats</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>Bulk upload capability</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>Automatic parsing and extraction</span>
                  </li>
                </ul>
              </div>
              <div className="hidden md:flex absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                <ArrowRight className="w-8 h-8 text-primary" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-accent" />
                </div>
                <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">Step 2</Badge>
                <h3 className="text-2xl font-bold mb-3">AI Analyses & Scores</h3>
                <p className="text-muted-foreground mb-4">
                  Our AI instantly analyses candidates against your job requirements, scoring skills, experience, and cultural fit.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">✓</span>
                    <span>Automated candidate scoring</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">✓</span>
                    <span>Skills and experience matching</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">✓</span>
                    <span>Transparent scoring criteria</span>
                  </li>
                </ul>
              </div>
              <div className="hidden md:flex absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                <ArrowRight className="w-8 h-8 text-accent" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-lg bg-success/10 flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-success" />
              </div>
              <Badge className="mb-4 bg-success/10 text-success border-success/20">Step 3</Badge>
              <h3 className="text-2xl font-bold mb-3">Review & Hire</h3>
              <p className="text-muted-foreground mb-4">
                Review top-ranked candidates with detailed profiles, compare side-by-side, and make confident hiring decisions faster.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <span>Ranked candidate shortlists</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <span>Side-by-side comparisons</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <span>Detailed candidate insights</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
