import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { Input } from "@/components/ui/input";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Plus,
  Briefcase,
  User,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRoles } from "@/contexts/RolesContext";
import { useToast } from "@/hooks/use-toast";
import { parseScoreAPI } from "@/lib/api/parsescore-client";
import { validateFiles, formatFileSize } from "@/lib/file-validation";
import { useUsage } from "@/hooks/useUsage";
import { trackEvent } from "@/lib/analytics";

interface FileWithStatus {
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: any;
  error?: string;
}

const BulkParse = () => {
  const { roles, addCandidateToRole, addRole } = useRoles();
  const { toast } = useToast();
  const {
    usage,
    limits,
    loadUsageData,
    incrementParseUsage,
    canParse,
    remainingParses
  } = useUsage();

  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [processing, setProcessing] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [jobDescription, setJobDescription] = useState("");
  const [newRoleDialogOpen, setNewRoleDialogOpen] = useState(false);
  const [newRoleTitle, setNewRoleTitle] = useState("");

  // Load usage data on mount
  useEffect(() => {
    loadUsageData();
  }, [loadUsageData]);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      // Validate all files
      const validation = validateFiles(selectedFiles);
      
      if (!validation.valid && validation.validFiles.length === 0) {
        // All files are invalid
        toast({
          title: "Invalid Files",
          description: validation.errors[0] || "All selected files are invalid",
          variant: "destructive",
        });
        e.target.value = ''; // Clear input
        return;
      }
      
      // Add only valid files
      const newFiles = validation.validFiles.map(file => ({
        file,
        status: 'pending' as const
      }));
      
      setFiles(prev => [...prev, ...newFiles]);
      
      // Show warning if some files were rejected
      if (validation.invalidFiles.length > 0) {
        toast({
          title: "Some Files Rejected",
          description: `${validation.validFiles.length} files accepted, ${validation.invalidFiles.length} files rejected due to validation errors.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Files Added",
          description: `${validation.validFiles.length} files ready for parsing.`,
        });
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateRole = () => {
    if (!newRoleTitle.trim()) return;

    const newRoleData = {
      title: newRoleTitle,
      department: "New",
      location: "TBD",
      type: "Full-time",
      salary: "TBD",
      description: jobDescription || "Role description to be added",
    };

    addRole(newRoleData);

    // Find the newly added role (it will be the last one)
    setTimeout(() => {
      const latestRole = roles[roles.length - 1];
      if (latestRole) {
        setSelectedRole(latestRole.id);
      }
    }, 100);

    setNewRoleTitle("");
    setNewRoleDialogOpen(false);

    toast({
      title: "Role Created",
      description: `${newRoleTitle} has been created successfully.`,
    });
  };

  const handleBulkParse = async () => {
    if (!selectedRole) {
      toast({
        title: "Role Required",
        description: "Please select a role to attach these CVs to.",
        variant: "destructive",
      });
      return;
    }

    // Check quota before bulk parsing
    const fileCount = files.length;
    if (!canParse(fileCount)) {
      const remaining = remainingParses();
      toast({
        title: "Quota Exceeded",
        description: `You can only parse ${remaining} more CV${remaining !== 1 ? 's' : ''} this month. You're trying to parse ${fileCount}. Upgrade your plan to continue.`,
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    // Mark all files as processing
    setFiles(prev => prev.map(f => ({ ...f, status: 'processing' as const })));

    // Track bulk parse started
    await trackEvent('bulk_parse_started', {
      file_count: fileCount,
      role_id: selectedRole
    });

    try {
      // Call the batch parse API (no scoring)
      const response = await parseScoreAPI.batchParse(files.map(f => f.file), true);

      let successCount = 0;

      // Update file statuses and add candidates to role
      const updatedFiles = files.map((fileItem, index) => {
        const parseResult = response.results[index];
        
        if (!parseResult) {
          return {
            ...fileItem,
            status: 'error' as const,
            error: 'No response from API'
          };
        }

        if (parseResult.parsing_errors) {
          return {
            ...fileItem,
            status: 'error' as const,
            error: parseResult.parsing_errors
          };
        }

        if (!parseResult.candidate) {
          return {
            ...fileItem,
            status: 'error' as const,
            error: 'No candidate data returned'
          };
        }

        successCount++;

        const candidateData = parseResult.candidate;

        // Parse education data
        const education = candidateData.education?.map((edu: any) => ({
          degree: edu.degree,
          field: edu.field_of_study,
          school: edu.institution,
          year: edu.end_date,
          gpa: edu.gpa
        })).filter(Boolean) || [];

        // Parse work experience
        const workExperience = candidateData.work_experience?.map((exp: any) => ({
          title: exp.job_title,
          company: exp.company,
          duration: `${exp.start_date || 'N/A'} - ${exp.end_date || 'Present'}`,
          duration_months: exp.duration_months || 0,
          description: exp.description
        })).filter(Boolean) || [];

        // Parse certifications
        const certifications = candidateData.certifications?.map((cert: any) => ({
          name: cert.name || cert,
          issuer: cert.issuer,
          date: cert.issue_date
        })).filter(Boolean) || [];

        // Parse languages
        const languages = candidateData.languages?.map((lang: any) => ({
          language: typeof lang === 'string' ? lang : lang.language,
          proficiency: typeof lang === 'object' ? lang.proficiency : undefined
        })).filter(Boolean) || [];

        // Extract contact info
        const emails = candidateData.contact?.emails || [];
        const phones = candidateData.contact?.phones || [];
        const skills = candidateData.skills?.map((s: any) => s.name || s) || [];

        // Calculate total experience
        const totalExperienceMonths = workExperience.reduce(
          (sum: number, exp: any) => sum + (exp?.duration_months || 0), 0
        );
        const experienceYears = Math.floor(totalExperienceMonths / 12);

        // Add candidate to the selected role with ALL parsed data
        const candidate = {
          // id will be auto-generated by database as UUID
          name: candidateData.contact?.full_name || 'Unknown',
          email: emails[0] || '',
          phone: phones[0] || '',
          fileName: parseResult.filename,
          skills: skills,
          experience_years: experienceYears,
          appliedDate: new Date().toISOString().split('T')[0],
          score: undefined, // No scoring yet
          fit: undefined, // No scoring yet
          status: 'reviewing' as const,
          statusHistory: [
            {
              status: 'reviewing' as const,
              changedAt: new Date().toISOString(),
              note: 'Candidate added via bulk parse'
            }
          ],
          interviews: [],
          summary: candidateData.summary || '',
          // Include all parsed CV data
          experience: workExperience,
          education: education,
          certifications: certifications,
          languages: languages,
          location: candidateData.contact?.location,
          linkedin_url: candidateData.contact?.linkedin_url || candidateData.linkedin_url,
          portfolio_url: candidateData.contact?.portfolio_url || candidateData.website_url,
          // Store the entire parsed candidate object for reference
          cv_parsed_data: candidateData,
        };

        addCandidateToRole(selectedRole, candidate);

        return {
          ...fileItem,
          status: 'completed' as const,
          result: candidateData,
        };
      });

      setFiles(updatedFiles);

      // Increment usage for successful parses
      if (successCount > 0) {
        await incrementParseUsage(successCount);
      }

      // Track bulk parse completed
      await trackEvent('bulk_parse_completed', {
        total_files: files.length,
        successful: successCount,
        failed: files.length - successCount,
        role_id: selectedRole,
        processing_time_ms: response.processing_time_ms
      });

      toast({
        title: "Bulk Parse Complete",
        description: `Successfully parsed ${successCount} of ${files.length} CVs (${response.processing_time_ms.toFixed(0)}ms total)`,
      });

    } catch (error: any) {
      // TODO: Replace with proper error logging service (e.g., Sentry)

      // Mark all files as error
      setFiles(prev => prev.map(f => ({
        ...f,
        status: 'error' as const,
        error: error.message || 'Failed to parse CVs'
      })));

      toast({
        title: "Batch Parse Failed",
        description: error.message || "An error occurred while parsing CVs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const completedCount = files.filter(f => f.status === 'completed').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const pendingCount = files.filter(f => f.status === 'pending').length;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Bulk Parse CVs</h1>
            <p className="text-muted-foreground">
              Upload and parse multiple CVs to extract candidate information
            </p>
          </div>
          {files.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setFiles([])}
              disabled={processing}
            >
              Clear All
            </Button>
          )}
        </div>

        {/* Stats */}
        {files.length > 0 && (
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Files</CardDescription>
                <CardTitle className="text-3xl">{files.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Completed</CardDescription>
                <CardTitle className="text-3xl text-success">{completedCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Pending</CardDescription>
                <CardTitle className="text-3xl text-muted-foreground">{pendingCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Errors</CardDescription>
                <CardTitle className="text-3xl text-destructive">{errorCount}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload CVs
              </CardTitle>
              <CardDescription>
                Supported formats: PDF, DOCX, DOC, TXT (max 10MB each)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <input
                  type="file"
                  id="bulk-upload"
                  accept=".pdf,.docx,.doc,.txt"
                  multiple
                  onChange={handleFilesChange}
                  className="hidden"
                  disabled={processing}
                />
                <label
                  htmlFor="bulk-upload"
                  className={`cursor-pointer flex flex-col items-center gap-3 ${processing ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Click to upload or drag and drop</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      PDF, DOCX, DOC, or TXT up to 10MB (max 50 files)
                    </p>
                  </div>
                </label>
              </div>

              {files.length > 0 && (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {files.slice(0, 3).map((fileItem, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="truncate">{fileItem.file.name}</span>
                      </div>
                      {!processing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {files.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{files.length - 3} more files
                    </p>
                  )}
                </div>
              )}

              {/* Role Selection */}
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
                          Quickly create a new role to attach these CVs to.
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

              {/* Job Description (Optional) */}
              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="job-description">Job Description (Optional)</Label>
                <Textarea
                  id="job-description"
                  placeholder="Paste the job description here to score candidates later..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={4}
                  className="resize-none"
                  disabled={processing}
                />
                <p className="text-xs text-muted-foreground">
                  Add a job description to enable scoring candidates against the role later
                </p>
              </div>

              <Button
                onClick={handleBulkParse}
                disabled={files.length === 0 || processing || pendingCount === 0 || !selectedRole}
                className="w-full"
                size="lg"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing {completedCount}/{files.length}
                  </>
                ) : (
                  `Parse ${pendingCount} ${pendingCount === 1 ? 'CV' : 'CVs'}`
                )}
              </Button>

              {/* TODO: Replace with real usage data from API/database
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold">{usageData.parsesUsed}</p>
                  <p className="text-xs text-muted-foreground">parses used</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className="text-2xl font-bold">{usageData.parsesRemaining}</p>
                  <p className="text-xs text-muted-foreground">in your plan</p>
                </div>
              </div>
              */}
            </CardContent>
          </Card>

          {/* Files List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Files Queue</CardTitle>
              <CardDescription>
                Track the status of each uploaded file
              </CardDescription>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Upload className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No files uploaded yet</p>
                  <p className="text-sm mt-1">Upload CVs to start bulk parsing</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {files.map((fileItem, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 mt-0.5">
                          {fileItem.status === 'pending' && (
                            <FileText className="w-5 h-5 text-muted-foreground" />
                          )}
                          {fileItem.status === 'processing' && (
                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                          )}
                          {fileItem.status === 'completed' && (
                            <CheckCircle2 className="w-5 h-5 text-success" />
                          )}
                          {fileItem.status === 'error' && (
                            <AlertCircle className="w-5 h-5 text-destructive" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate mb-1">
                            {fileItem.file.name}
                          </p>
                          
                          {fileItem.status === 'completed' && fileItem.result && (
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <User className="w-3 h-3" />
                                <span className="font-medium">{fileItem.result.contact?.full_name || 'Unknown'}</span>
                              </div>
                              {fileItem.result.contact?.emails?.[0] && (
                                <div className="flex items-center gap-1.5">
                                  <Mail className="w-3 h-3" />
                                  <span>{fileItem.result.contact.emails[0]}</span>
                                </div>
                              )}
                              {fileItem.result.contact?.phones?.[0] && (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="w-3 h-3" />
                                  <span>{fileItem.result.contact.phones[0]}</span>
                                </div>
                              )}
                              {fileItem.result.contact?.location && (
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="w-3 h-3" />
                                  <span>{fileItem.result.contact.location}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {fileItem.result.skills?.length || 0} skills
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {fileItem.result.work_experience?.length || 0} jobs
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {(() => {
                                    // Only count university degrees, not secondary school qualifications
                                    const universityDegrees = fileItem.result.education?.filter((edu: any) => {
                                      const degreeLevel = edu.degree?.toLowerCase();
                                      return degreeLevel === 'bachelors' || 
                                            degreeLevel === 'masters' || 
                                            degreeLevel === 'doctorate';
                                    }) || [];
                                    const count = universityDegrees.length;
                                    return `${count} ${count === 1 ? 'degree' : 'degrees'}`;
                                  })()}
                                </Badge>
                              </div>
                            </div>
                          )}

                          {fileItem.status === 'error' && (
                            <p className="text-xs text-destructive">{fileItem.error}</p>
                          )}

                          {fileItem.status === 'pending' && (
                            <p className="text-xs text-muted-foreground">
                              {(fileItem.file.size / 1024).toFixed(1)} KB
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              fileItem.status === 'completed' ? 'default' :
                              fileItem.status === 'error' ? 'destructive' :
                              'secondary'
                            }
                            className={
                              fileItem.status === 'completed'
                                ? 'bg-success/10 text-success border-success/20'
                                : ''
                            }
                          >
                            {fileItem.status === 'pending' && 'Pending'}
                            {fileItem.status === 'processing' && 'Processing'}
                            {fileItem.status === 'completed' && 'Completed'}
                            {fileItem.status === 'error' && 'Error'}
                          </Badge>

                          {(fileItem.status === 'pending' || fileItem.status === 'error') && !processing && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default BulkParse;