import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  Eye,
  Copy,
  Target,
  Plus,
  Briefcase,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRoles } from "@/contexts/RolesContext";
import { useToast } from "@/hooks/use-toast";
import { parseScoreAPI } from "@/lib/api";
import { validateFile, formatFileSize } from "@/lib/file-validation";
import { useUsage } from "@/hooks/useUsage";
import { useUser } from "@/contexts/UserContext";
import { trackEvent } from "@/lib/analytics";

const ParseCV = () => {
  const { roles, addCandidateToRole, addRole } = useRoles();
  const { toast } = useToast();
  const { user } = useUser();
  const {
    usage,
    limits,
    loading: usageLoading,
    loadUsageData,
    incrementParseUsage,
    incrementScoreUsage,
    canParse,
    canScore,
    remainingParses,
    remainingScores
  } = useUsage();

  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [scoring, setScoring] = useState(false);
  const [scoreResult, setScoreResult] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [newRoleDialogOpen, setNewRoleDialogOpen] = useState(false);
  const [newRoleTitle, setNewRoleTitle] = useState("");
  const [showProcessing, setShowProcessing] = useState(false);
  const [parsingDialogOpen, setParsingDialogOpen] = useState(false);

  // Track background parsing promise to avoid duplicate API calls
  const backgroundParsePromise = useRef<Promise<any> | null>(null);

  // Define handleParsingDialogClose before useEffects that use it
  const handleParsingDialogClose = useCallback(() => {
    setParsingDialogOpen(false);
    // Don't reset results - let them stay visible for the user
  }, []);

  // Load usage data on mount
  useEffect(() => {
    loadUsageData();
  }, [loadUsageData]);

  // Auto-close dialog when results are ready
  useEffect(() => {
    if (parsingDialogOpen && result && !showProcessing) {
      // Results are displayed, close the dialog
      const timer = setTimeout(() => {
        handleParsingDialogClose();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [parsingDialogOpen, result, showProcessing, handleParsingDialogClose]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // Validate file before accepting
      const validation = validateFile(selectedFile);

      if (!validation.valid) {
        toast({
          title: "Invalid File",
          description: validation.error,
          variant: "destructive",
        });
        e.target.value = ''; // Clear input
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setResult(null);
      setScoreResult(null);
      setShowProcessing(false);

      // Silently start parsing in background - no user indication
      // Store promise to avoid duplicate parsing if user clicks button quickly
      backgroundParsePromise.current = (async () => {
        try {
          const parseResult = await parseScoreAPI.parseCV(selectedFile, true);
          setResult(parseResult);
          return parseResult;
        } catch (error: any) {
          // Silently fail - will retry when user clicks Parse button
          console.error('Background parse failed:', error);
          setResult(null);
          return null;
        }
      })();
    }
  };

  const handleParse = async () => {
    if (!file || !selectedRole) return;

    // Check quota before parsing
    if (!canParse(1)) {
      toast({
        title: "Quota Exceeded",
        description: `You've used all ${limits?.max_parses || 0} parses this month. Upgrade your plan to continue.`,
        variant: "destructive",
      });
      return;
    }

    // Show dialog immediately for user engagement
    setParsingDialogOpen(true);
    setShowProcessing(true);

    try {
      let parseResult = result;

      // If we don't have a result yet, check if background parsing is in progress
      if (!parseResult) {
        if (backgroundParsePromise.current) {
          // Wait for background parsing to complete (avoids duplicate API call)
          parseResult = await backgroundParsePromise.current;
        } else {
          // No background parse started, parse now
          parseResult = await parseScoreAPI.parseCV(file, true);
          setResult(parseResult);
        }
      }

      // Increment usage after successful parse
      await incrementParseUsage(1);

      // Track analytics event
      await trackEvent('cv_parsed', {
        filename: file.name,
        filesize: file.size,
        role_id: selectedRole
      });

      // Adapt to actual API structure
      const parsedCandidate = parseResult.candidate || {};
      const contact = parsedCandidate.contact || {};
      const workExperience = parsedCandidate.work_experience || [];
      const education = parsedCandidate.education || [];
      const rawSkills = parsedCandidate.skills || [];
      const certifications = parsedCandidate.certifications || [];
      const languages = parsedCandidate.languages || [];
      const emails = contact.emails || [];
      const phones = contact.phones || [];

      // Normalize skills to string array (handle both string and object formats)
      const skills = rawSkills.map((skill: any) => {
        if (typeof skill === 'string') return skill;
        if (skill && typeof skill === 'object' && skill.name) return skill.name;
        return String(skill);
      }).filter(Boolean);

      // Calculate experience
      const totalExperienceMonths = workExperience.reduce(
        (sum: number, exp: any) => sum + (exp?.duration_months || 0), 0
      );
      const experienceYears = Math.floor(totalExperienceMonths / 12);

      const candidateData = {
        // id will be auto-generated by database as UUID
        name: contact.full_name || 'Unknown',
        email: emails[0] || '',
        phone: phones[0] || '',
        fileName: file.name,
        skills: skills,
        experience_years: experienceYears,
        appliedDate: new Date().toISOString().split('T')[0],
        status: 'reviewing' as const,
        statusHistory: [
          {
            status: 'reviewing' as const,
            changedAt: new Date().toISOString(),
            note: 'Candidate added to role'
          }
        ],
        interviews: [],
        summary: parsedCandidate.summary || '',
        // Include all parsed CV data
        experience: workExperience,
        education: education,
        certifications: certifications,
        languages: languages,
        location: contact.location,
        linkedin_url: contact.linkedin_url || parsedCandidate.linkedin_url,
        portfolio_url: contact.portfolio_url || parsedCandidate.website_url,
        // Store the entire parsed candidate object for reference
        cv_parsed_data: parsedCandidate,
        // Include scoring data if available
        ...(scoreResult && {
          score: scoreResult.overall_score,
          score_breakdown: scoreResult.breakdown,
          fit: scoreResult.fit
        })
      };

      addCandidateToRole(selectedRole, candidateData);

      // Parsing complete - enable the Continue button in dialog
      setShowProcessing(false);

      // Don't show toast or reset form yet - let user close dialog first
      // They'll see results when they click Continue

    } catch (error: any) {
      // TODO: Replace with proper error logging service (e.g., Sentry)
      toast({
        title: "Parse Failed",
        description: error.message || "Failed to parse CV. Please try again.",
        variant: "destructive",
      });
      setShowProcessing(false);
      setParsingDialogOpen(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "JSON copied to clipboard",
    });
  };

  const handleCreateRole = async () => {
    if (!newRoleTitle.trim()) return;

    const newRoleData = {
      title: newRoleTitle,
      department: "New",
      location: "TBD",
      type: "full-time",
      salary: "TBD",
      description: "Role description to be added",
    };

    try {
      // Await role creation and get the new role ID
      const newRoleId = await addRole(newRoleData);

      // Select the newly created role
      setSelectedRole(newRoleId);

      setNewRoleTitle("");
      setNewRoleDialogOpen(false);
    } catch (error) {
      // Error is already handled by addRole with toast
    }
  };

  const handleScore = async () => {
    if (!result || !jobDescription.trim()) return;

    // Check quota before scoring
    if (!canScore(1)) {
      toast({
        title: "Quota Exceeded",
        description: `You've used all ${limits?.max_scores || 0} scores this month. Upgrade your plan to continue.`,
        variant: "destructive",
      });
      return;
    }

    setScoring(true);

    try {
      const aiScoringEnabled = user?.planLimits?.ai_scoring_enabled || false;

      const scoreResponse = await parseScoreAPI.scoreCV(
        result.request_id,
        jobDescription,
        aiScoringEnabled
      );

      setScoreResult(scoreResponse);

      // Increment usage after successful score
      await incrementScoreUsage(1);

      // Track analytics event
      await trackEvent('candidate_scored', {
        score: scoreResponse.overall_score,
        fit: scoreResponse.fit,
        mode: aiScoringEnabled ? 'llm' : 'baseline',
        request_id: result.request_id
      });

      toast({
        title: "Scoring Complete",
        description: `Match score: ${scoreResponse.overall_score}/100${aiScoringEnabled ? ' (AI-powered)' : ''}`,
      });

    } catch (error: any) {
      // TODO: Replace with proper error logging service (e.g., Sentry)
      toast({
        title: "Scoring Failed",
        description: error.message || "Failed to score candidate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setScoring(false);
    }
  };

  // Safe accessors for API response
  const parsedCandidateView = result?.candidate || {};
  const contactView = parsedCandidateView.contact || {};
  const emails = contactView.emails || [];
  const phones = contactView.phones || [];
  const rawSkillsView = parsedCandidateView.skills || [];
  // Normalize skills for display
  const skills = rawSkillsView.map((skill: any) => {
    if (typeof skill === 'string') return skill;
    if (skill && typeof skill === 'object' && skill.name) return skill.name;
    return String(skill);
  }).filter(Boolean);
  const workExperience = parsedCandidateView.work_experience || [];
  const education = parsedCandidateView.education || [];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Parse CV</h1>
          <p className="text-muted-foreground">
            Upload a single CV to extract structured data
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card data-tour="upload-cv">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload CV
              </CardTitle>
              <CardDescription>
                Supported formats: PDF, DOCX, DOC, TXT (max 10MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <input
                  type="file"
                  id="cv-upload"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="cv-upload" className="cursor-pointer flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Click to upload or drag and drop</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      PDF, DOCX, DOC, or TXT up to 10MB
                    </p>
                  </div>
                </label>
              </div>

              {file && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                    Remove
                  </Button>
                </div>
              )}

              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="role-select">Attach to Role *</Label>
                <div className="flex gap-2">
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger id="role-select" className="flex-1">
                      <SelectValue placeholder="Select a role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-3 h-3" />
                            {role.title}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Dialog open={newRoleDialogOpen} onOpenChange={setNewRoleDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Role</DialogTitle>
                        <DialogDescription>
                          Quickly create a new role to attach this CV to.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="new-role-title">Role Title</Label>
                          <Input
                            id="new-role-title"
                            placeholder="e.g., Senior Software Engineer"
                            value={newRoleTitle}
                            onChange={(e) => setNewRoleTitle(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setNewRoleDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateRole} disabled={!newRoleTitle.trim()}>
                          Create Role
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <p className="text-xs text-muted-foreground">
                  Required - Select an existing role or create a new one
                </p>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label htmlFor="job-description" className="flex items-center gap-2">
                    Job Description
                    <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                  </Label>
                  {user?.planLimits?.ai_scoring_enabled ? (
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI Scoring
                      {user?.planLimits?.max_ai_scores && user.planLimits.max_ai_scores < 999999 ? (
                        <span className="ml-1 opacity-75">
                          ({user.planLimits.max_ai_scores}/mo)
                        </span>
                      ) : user?.planLimits?.max_ai_scores === 999999 ? (
                        <span className="ml-1 opacity-75">(Unlimited)</span>
                      ) : null}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Basic scoring
                    </Badge>
                  )}
                </div>
                <Textarea
                  id="job-description"
                  placeholder="Paste the job description here to enable AI-powered candidate scoring..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Add a job description to score how well the candidate matches the role
                </p>
              </div>

              {/* Parsing Dialog */}
              <Dialog open={parsingDialogOpen} onOpenChange={(open) => !open && handleParsingDialogClose()}>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Processing CV</DialogTitle>
                    <DialogDescription className="text-base">
                      Please wait while we extract candidate information
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-2">
                    <div className="flex items-center justify-center py-4">
                      <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                onClick={handleParse}
                disabled={!file || !selectedRole || showProcessing}
                className="w-full"
                size="lg"
              >
                {showProcessing ? "Parsing..." : "Parse CV"}
              </Button>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold">{usage?.parses_used || 0}</p>
                  <p className="text-xs text-muted-foreground">parses used</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className="text-2xl font-bold">{remainingParses()}</p>
                  <p className="text-xs text-muted-foreground">in your plan</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Parse Results
              </CardTitle>
              <CardDescription>
                Extracted structured data from the CV
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!result && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Upload and parse a CV to see results here</p>
                </div>
              )}

              {result && (
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="score">Score</TabsTrigger>
                    <TabsTrigger value="json">Raw JSON</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4 mt-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{contactView.full_name || 'N/A'}</p>
                      </div>
                      {emails.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{emails[0]}</p>
                        </div>
                      )}
                      {phones.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-medium">{phones[0]}</p>
                        </div>
                      )}
                      {contactView.location && (
                        <div>
                          <p className="text-sm text-muted-foreground">Location</p>
                          <p className="font-medium">{contactView.location}</p>
                        </div>
                      )}
                    </div>

                    {skills.length > 0 && (
                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-2">Skills ({skills.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {skills.map((skill: string, idx: number) => (
                            <Badge key={idx} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {workExperience.length > 0 && (
                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-3">
                          Experience ({workExperience.length})
                        </p>
                        <div className="space-y-4">
                          {workExperience.map((exp: any, idx: number) => {
                            const description = exp.description || exp.summary || exp.details || '';
                            const bullets = exp.bullets || exp.bullet_points || exp.highlights || [];

                            return (
                              <div key={idx} className="text-sm border-l-2 border-muted pl-3">
                                <p className="font-medium">{exp.title || 'N/A'}</p>
                                <p className="text-muted-foreground">{exp.company || 'N/A'}</p>
                                {exp.duration_months && (
                                  <p className="text-xs text-muted-foreground">
                                    {exp.duration_months} months
                                  </p>
                                )}
                                {/* Show description if available */}
                                {description && (
                                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                    {description.length > 150 ? `${description.substring(0, 150)}...` : description}
                                  </p>
                                )}
                                {/* Show first few bullets if available and no description */}
                                {!description && bullets.length > 0 && (
                                  <ul className="list-disc list-inside text-xs text-muted-foreground mt-2 space-y-0.5">
                                    {bullets.slice(0, 2).map((bullet: string, bidx: number) => (
                                      <li key={bidx}>{bullet.length > 80 ? `${bullet.substring(0, 80)}...` : bullet}</li>
                                    ))}
                                    {bullets.length > 2 && (
                                      <li className="text-xs italic">+{bullets.length - 2} more...</li>
                                    )}
                                  </ul>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {education.length > 0 && (
                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-3">Education</p>
                        {education.map((edu: any, idx: number) => {
                          // Format education title properly
                          const formatEducationTitle = (degree: string, field?: string) => {
                            const degreeMap: { [key: string]: string } = {
                              'bachelors': "Bachelor's Degree",
                              'masters': "Master's Degree",
                              'phd': 'Ph.D.',
                              'doctorate': 'Doctorate',
                              'high_school': 'High School',
                              'associates': "Associate's Degree",
                              'mba': 'MBA',
                            };

                            const baseDegree = degreeMap[degree?.toLowerCase()] || degree;

                            // Special handling for secondary education
                            const isSecondary = degree?.toLowerCase() === 'high_school' ||
                                              field?.match(/a-level|gcse|secondary|high school/i);

                            if (isSecondary && field) {
                              return field; // Show just "A-Level" or "GCSE"
                            }

                            return field && !isSecondary ? `${baseDegree} in ${field}` : baseDegree;
                          };

                          const educationTitle = formatEducationTitle(
                            edu.degree || edu.qualification || '',
                            edu.field
                          );

                          return (
                            <div key={idx} className="text-sm mb-2">
                              <p className="font-medium">
                                {educationTitle}
                              </p>
                              <p className="text-muted-foreground">{edu.institution || 'N/A'}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="space-y-2 pt-4">
                      {jobDescription ? (
                        <Button
                          className="w-full"
                          size="lg"
                          onClick={handleScore}
                          disabled={scoring}
                        >
                          {scoring ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2 animate-spin" />
                              Scoring Candidate...
                            </>
                          ) : (
                            <>
                              {user?.planLimits?.ai_scoring_enabled ? (
                                <>
                                  <Sparkles className="w-4 h-4 mr-2" />
                                  AI Score This Candidate
                                </>
                              ) : (
                                <>
                                  <Target className="w-4 h-4 mr-2" />
                                  Score This Candidate
                                </>
                              )}
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="lg"
                          className="w-full"
                          onClick={() => {
                            document.getElementById('job-description')?.focus();
                          }}
                        >
                          <Target className="w-4 h-4 mr-2" />
                          Add Job Description to Score
                        </Button>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${contactView.full_name?.replace(/\s+/g, '_') || 'parsed'}_cv.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download JSON
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            const scoreTab = document.querySelector('[value="score"]') as HTMLButtonElement;
                            if (scoreTab) scoreTab.click();
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Score Tab
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="score" className="space-y-4 mt-4">
                    {!jobDescription && (
                      <div className="space-y-4">
                        <Card className="border-muted">
                          <CardHeader className="text-center pb-3">
                            <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                            <CardTitle>Score This Candidate</CardTitle>
                            <CardDescription>
                              Add a job description above to get an AI-powered match score
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 mt-0.5 text-success" />
                                <span>Skills Match Analysis</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 mt-0.5 text-success" />
                                <span>Experience Relevance</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 mt-0.5 text-success" />
                                <span>Education Quality</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 mt-0.5 text-success" />
                                <span>Career Progression</span>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => {
                                document.getElementById('job-description')?.focus();
                              }}
                            >
                              <ArrowRight className="w-4 h-4 mr-2" />
                              Add Job Description
                            </Button>
                          </CardContent>
                        </Card>

                        {!user?.planLimits?.ai_scoring_enabled && (
                          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                            <CardHeader>
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary" />
                                <CardTitle>Unlock AI-Powered Scoring</CardTitle>
                              </div>
                              <CardDescription>
                                Get detailed insights with our advanced AI scoring engine
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="space-y-2 text-sm">
                                <div className="flex items-start gap-2">
                                  <Sparkles className="w-4 h-4 mt-0.5 text-primary" />
                                  <span><strong>Deep skills analysis</strong> with AI-generated rationale</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <Sparkles className="w-4 h-4 mt-0.5 text-primary" />
                                  <span><strong>Contextual experience matching</strong> beyond keywords</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <Sparkles className="w-4 h-4 mt-0.5 text-primary" />
                                  <span><strong>Intelligent recommendations</strong> for interview focus areas</span>
                                </div>
                              </div>
                              <Button className="w-full" onClick={() => window.location.href = '/pricing'}>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Upgrade to Professional
                              </Button>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}

                    {jobDescription && !scoreResult && (
                      <div className="space-y-4">
                        <Card className="border-muted">
                          <CardContent className="pt-6 text-center">
                            <div className="flex items-center justify-center gap-2 mb-4">
                              <Badge variant={user?.planLimits?.ai_scoring_enabled ? "default" : "secondary"}>
                                {user?.planLimits?.ai_scoring_enabled ? (
                                  <>
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    AI-Powered Scoring
                                  </>
                                ) : (
                                  'Basic Scoring'
                                )}
                              </Badge>
                            </div>
                            <Button onClick={handleScore} disabled={scoring} size="lg">
                              {scoring ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 mr-2 animate-spin" />
                                  Scoring...
                                </>
                              ) : (
                                <>
                                  <Target className="w-4 h-4 mr-2" />
                                  Score Candidate
                                </>
                              )}
                            </Button>
                            {user?.planLimits?.ai_scoring_enabled && (
                              <p className="text-xs text-muted-foreground mt-3">
                                Using AI to analyze skills, experience, and role fit
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {scoreResult && (
                      <div className="space-y-4">
                        <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg border">
                          <p className="text-sm text-muted-foreground mb-2">Overall Match Score</p>
                          <p className="text-5xl font-bold text-primary mb-2">{scoreResult.overall_score}</p>
                          <Badge className={
                            scoreResult.fit === 'excellent' ? 'bg-success/10 text-success border-success/20' :
                            scoreResult.fit === 'good' ? 'bg-primary/10 text-primary border-primary/20' :
                            'bg-warning/10 text-warning border-warning/20'
                          }>
                            {scoreResult.fit?.toUpperCase() || 'N/A'} FIT
                          </Badge>
                        </div>

                        {scoreResult.breakdown && (
                          <div className="space-y-3">
                            <p className="font-medium">Score Breakdown</p>
                            {Object.entries(scoreResult.breakdown).map(([key, value]: [string, any]) => (
                              <div key={key}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="capitalize">{key}</span>
                                  <span className="font-medium">{value}/100</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      value >= 85 ? 'bg-success' : value >= 70 ? 'bg-primary' : 'bg-warning'
                                    }`}
                                    style={{ width: `${value}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {scoreResult.rationale && (
                          <div className="pt-4 border-t">
                            <p className="font-medium mb-3">AI Analysis</p>
                            <div className="space-y-4 text-sm">
                              {scoreResult.rationale.split('\n\n').map((section: string, idx: number) => {
                                const lines = section.split('\n');
                                const heading = lines[0];
                                const content = lines.slice(1);

                                // Check if this is a heading (starts with **)
                                const isHeading = heading.startsWith('**');
                                const headingText = isHeading ? heading.replace(/\*\*/g, '') : heading;

                                return (
                                  <div key={idx} className="space-y-1.5">
                                    {isHeading && (
                                      <h4 className="font-semibold text-foreground text-xs uppercase tracking-wide">
                                        {headingText}
                                      </h4>
                                    )}
                                    {content.map((line: string, lineIdx: number) => {
                                      // Check if bullet point
                                      const isBullet = line.trim().startsWith('•');

                                      if (isBullet) {
                                        return (
                                          <div key={lineIdx} className="flex gap-2 items-start ml-1">
                                            <span className="text-primary mt-0.5">•</span>
                                            <span className="text-muted-foreground flex-1">
                                              {line.trim().substring(1).trim()}
                                            </span>
                                          </div>
                                        );
                                      }

                                      // Regular paragraph
                                      return line.trim() ? (
                                        <p key={lineIdx} className="text-muted-foreground leading-relaxed">
                                          {line.trim()}
                                        </p>
                                      ) : null;
                                    })}
                                    {!isHeading && (
                                      <p className="text-muted-foreground leading-relaxed">{heading}</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {scoreResult.matched_skills && scoreResult.matched_skills.length > 0 && (
                          <div className="pt-4 border-t">
                            <p className="font-medium mb-2">Matched Skills</p>
                            <div className="flex flex-wrap gap-2">
                              {scoreResult.matched_skills.map((skill: string, idx: number) => (
                                <Badge key={idx} className="bg-success/10 text-success border-success/20">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {scoreResult.missing_skills && scoreResult.missing_skills.length > 0 && (
                          <div className="pt-4 border-t">
                            <p className="font-medium mb-2">Missing Skills</p>
                            <div className="flex flex-wrap gap-2">
                              {scoreResult.missing_skills.map((skill: string, idx: number) => (
                                <Badge key={idx} variant="secondary">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 pt-4">
                          <Button variant="outline" className="flex-1" onClick={() => setScoreResult(null)}>
                            Score Again
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => {
                              const blob = new Blob([JSON.stringify(scoreResult, null, 2)], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${contactView.full_name?.replace(/\s+/g, '_') || 'score'}_score.json`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Export Score
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="json" className="mt-4">
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <pre className="bg-code rounded-lg p-4 text-xs overflow-auto max-h-96 text-code-foreground">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ParseCV;
