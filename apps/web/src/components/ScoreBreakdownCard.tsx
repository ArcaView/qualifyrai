import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Award, BookOpen, Briefcase, BadgeCheck, TrendingUp, Code, ChevronDown, ChevronUp } from "lucide-react";
import { ScoreBreakdown } from "@/contexts/RolesContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface ScoreBreakdownCardProps {
  scoreBreakdown?: ScoreBreakdown;
  totalScore?: number;
  rationale?: string;
}

export const ScoreBreakdownCard = ({ scoreBreakdown, totalScore, rationale }: ScoreBreakdownCardProps) => {
  const [isRationaleOpen, setIsRationaleOpen] = useState(false);
  
  if (!scoreBreakdown) return null;

  const components = [
    {
      name: "Skills",
      score: scoreBreakdown.skills || 0,
      icon: Code,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30"
    },
    {
      name: "Experience",
      score: scoreBreakdown.experience || 0,
      icon: Briefcase,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30"
    },
    {
      name: "Prestige",
      score: scoreBreakdown.prestige || 0,
      icon: Award,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/30"
    },
    {
      name: "Education",
      score: scoreBreakdown.education || 0,
      icon: BookOpen,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/30"
    },
    {
      name: "Certifications",
      score: scoreBreakdown.certifications || 0,
      icon: BadgeCheck,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/30"
    },
    {
      name: "Stability",
      score: scoreBreakdown.stability || 0,
      icon: TrendingUp,
      color: "text-teal-600 dark:text-teal-400",
      bgColor: "bg-teal-100 dark:bg-teal-900/30"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Score Breakdown</CardTitle>
        {totalScore !== undefined && (
          <CardDescription>
            Overall Match Score: {totalScore.toFixed(1)}/100
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category scores as compact badges */}
        <div className="flex flex-wrap gap-2">
          {components.map((component) => {
            const Icon = component.icon;
            return (
              <div 
                key={component.name} 
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border ${component.bgColor} ${component.color}`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{component.name}</span>
                <span className="text-sm font-semibold">{component.score.toFixed(1)}</span>
              </div>
            );
          })}
        </div>

        {/* Rationale section */}
        {rationale && (
          <div className="pt-4 border-t space-y-3">
            <Collapsible open={isRationaleOpen} onOpenChange={setIsRationaleOpen}>
              <div>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-primary"></div>
                      <span className="text-sm font-medium text-foreground">Suitability Analysis</span>
                    </div>
                    {isRationaleOpen ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pt-4 pl-3">
                    <div className="pl-4 border-l-2 border-muted space-y-4">
                      {rationale.split('\n\n').map((section, idx) => {
                        // Check if section starts with ** (markdown bold header)
                        const lines = section.trim().split('\n');
                        const firstLine = lines[0];
                        const isHeader = firstLine.startsWith('**') && firstLine.endsWith('**');
                        
                        if (isHeader) {
                          const headerText = firstLine.replace(/\*\*/g, '').trim();
                          const content = lines.slice(1).join('\n').trim();
                          
                          return (
                            <div key={idx} className="space-y-2">
                              <h5 className="text-sm font-semibold text-foreground">{headerText}</h5>
                              {content && (
                                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                  {content}
                                </p>
                              )}
                            </div>
                          );
                        }
                        
                        // Regular paragraph
                        return (
                          <p key={idx} className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {section.trim()}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
