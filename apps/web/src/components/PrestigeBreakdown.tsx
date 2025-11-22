import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, GraduationCap, Briefcase, Award } from "lucide-react";
import { PrestigeDetails } from "@/contexts/RolesContext";

interface PrestigeBreakdownProps {
  prestigeScore: number;
  prestigeContribution: number;
  prestigeDetails: PrestigeDetails;
}

const getTierColor = (tier: string) => {
  if (tier.includes("Tier 1")) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300";
  if (tier.includes("Tier 2")) return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300";
  if (tier.includes("Tier 3")) return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-300";
  if (tier.includes("Tier 4")) return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-300";
  return "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400 border-slate-300";
};

const getTierBadge = (tier: string) => {
  if (tier.includes("Tier 1")) return { icon: "🏆", label: "Tier 1" };
  if (tier.includes("Tier 2")) return { icon: "⭐", label: "Tier 2" };
  if (tier.includes("Tier 3")) return { icon: "✨", label: "Tier 3" };
  if (tier.includes("Tier 4")) return { icon: "📌", label: "Tier 4" };
  return { icon: "•", label: "Tier 5" };
};

export const PrestigeBreakdown = ({ prestigeScore, prestigeContribution, prestigeDetails }: PrestigeBreakdownProps) => {
  const { company_prestige, university_prestige, role_level_prestige, top_companies, top_universities, top_roles } = prestigeDetails;

  return (
    <Card className="border-amber-200/50 bg-gradient-to-br from-amber-50/30 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <CardTitle>Prestige Analysis</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{prestigeScore.toFixed(0)}/100</div>
              <div className="text-xs text-muted-foreground">+{prestigeContribution.toFixed(1)} pts to total</div>
            </div>
          </div>
        </div>
        <CardDescription>
          Evaluation of company, university, and role level prestige (7.5% of total score)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Prestige Components */}
        <div className="space-y-4">
          {/* Company Prestige */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span>Company Prestige (50%)</span>
              </div>
              <span className="text-sm font-semibold">{company_prestige}/100</span>
            </div>
            <Progress value={company_prestige} className="h-2" />
            {top_companies && top_companies.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {top_companies.slice(0, 3).map((company, idx) => {
                  const badge = getTierBadge(company.tier);
                  return (
                    <div key={idx} className="flex items-center gap-1 text-xs">
                      <span className={`px-2 py-1 rounded-md border ${getTierColor(company.tier)}`}>
                        {badge.icon} {company.company}
                      </span>
                      <span className="text-muted-foreground">({company.score})</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* University Prestige */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <GraduationCap className="w-4 h-4 text-muted-foreground" />
                <span>University Prestige (30%)</span>
              </div>
              <span className="text-sm font-semibold">{university_prestige}/100</span>
            </div>
            <Progress value={university_prestige} className="h-2" />
            {top_universities && top_universities.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {top_universities.slice(0, 3).map((university, idx) => {
                  const badge = getTierBadge(university.tier);
                  return (
                    <div key={idx} className="flex items-center gap-1 text-xs">
                      <span className={`px-2 py-1 rounded-md border ${getTierColor(university.tier)}`}>
                        {badge.icon} {university.university}
                      </span>
                      <span className="text-muted-foreground">({university.score})</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Role Level Prestige */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <span>Role Level Prestige (20%)</span>
              </div>
              <span className="text-sm font-semibold">{role_level_prestige}/100</span>
            </div>
            <Progress value={role_level_prestige} className="h-2" />
            {top_roles && top_roles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {top_roles.slice(0, 3).map((role, idx) => (
                  <div key={idx} className="flex items-center gap-1 text-xs">
                    <Badge variant="outline" className="text-xs">
                      {role.role} - {role.level}
                    </Badge>
                    <span className="text-muted-foreground">({role.score})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tier Legend */}
        <div className="pt-4 border-t">
          <p className="text-xs font-medium text-muted-foreground mb-2">Tier Rankings:</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300">
              🏆 Tier 1: Top Global (100 pts)
            </Badge>
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300">
              ⭐ Tier 2: Major Tech (85 pts)
            </Badge>
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-300">
              ✨ Tier 3: Established (70 pts)
            </Badge>
            <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-300">
              📌 Tier 4: Growing (55 pts)
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
