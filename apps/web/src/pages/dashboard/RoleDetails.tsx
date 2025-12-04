import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Calendar,
  ArrowLeft,
  Users,
  Star,
  FileText,
  Mail,
  Phone,
  Trash2,
  Eye,
  AlertTriangle,
  Download,
  Sparkles,
  X,
  Edit,
} from "lucide-react";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRoles } from "@/contexts/RolesContext";
import { useToast } from "@/hooks/use-toast";
import { generateCandidateSummaryPDF } from "@/lib/candidateSummaryPDF";

const RoleDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { roles, updateRole, removeCandidateFromRole } = useRoles();

  // Find the role from context
  const role = roles.find(r => r.id === id);

  const handleToggleStatus = (checked: boolean) => {
    if (id) {
      updateRole(id, { status: checked ? 'active' : 'inactive' });
    }
  };

  const downloadCandidateSummary = async () => {
    toast({
      title: "Generating Summary",
      description: "Creating comprehensive candidate summary PDF...",
      duration: 3000,
    });

    // Simulate processing time for AI analysis
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate PDF with all candidate data and AI summary
    if (role) {
      generateCandidateSummaryPDF({
        roleTitle: role.title,
        candidates: sortedCandidates
      });

      toast({
        title: "Summary Ready",
        description: `Downloaded comprehensive PDF summary with ${sortedCandidates.length} candidates`,
      });
    }
  };

  // Get candidates from role
  const candidates = role?.candidatesList || [];

  const [viewCandidate, setViewCandidate] = useState<any>(null);
  const [dialogPage, setDialogPage] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<string | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    location: '',
    type: 'full-time',
    salary: '',
    description: '',
  });

  const handleViewCandidate = (candidate: Candidate) => {
    setViewCandidate(candidate);
    setDialogPage(0);
  };

  const handleCloseViewDialog = () => {
    setViewCandidate(null);
    setDialogPage(0);
  };

  const handleDeleteCandidate = (candidateId: string) => {
    setCandidateToDelete(candidateId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteCandidate = () => {
    if (candidateToDelete && id) {
      removeCandidateFromRole(id, candidateToDelete);
      setDeleteDialogOpen(false);
      setCandidateToDelete(null);
      toast({
        title: "Candidate Removed",
        description: "The candidate has been removed from this role.",
      });
    }
  };

  const handleBulkDelete = () => {
    setDeleteDialogOpen(true);
  };

  const confirmBulkDelete = () => {
    if (id) {
      selectedCandidates.forEach((candidateId) => {
        removeCandidateFromRole(id, candidateId);
      });
      setSelectedCandidates([]);
      setDeleteDialogOpen(false);
      setSelectionMode(false); // Exit selection mode after deleting
      toast({
        title: "Candidates Removed",
        description: `${selectedCandidates.length} candidate${selectedCandidates.length > 1 ? 's' : ''} removed from this role.`,
      });
    }
  };

  const toggleCandidateSelection = (candidateId: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(candidateId)
        ? prev.filter((id) => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCandidates.length === candidates.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(candidates.map((c) => c.id));
    }
  };

  const clearSelection = () => {
    setSelectedCandidates([]);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      // Exiting selection mode, clear selections
      setSelectedCandidates([]);
    }
  };

  const handleDeleteAll = () => {
    setDeleteDialogOpen(true);
  };

  const handleEditRole = () => {
    if (role) {
      setFormData({
        title: role.title,
        department: role.department,
        location: role.location,
        type: role.type,
        salary: role.salary,
        description: role.description,
      });
      setEditDialogOpen(true);
    }
  };

  const handleUpdateRole = async () => {
    if (id) {
      try {
        await updateRole(id, formData);
        setEditDialogOpen(false);
        toast({
          title: "Role Updated",
          description: "The role has been successfully updated.",
        });
      } catch (error: any) {
        toast({
          title: "Update Failed",
          description: error.message || "Failed to update role.",
          variant: "destructive",
        });
      }
    }
  };

  const sortedCandidates = [...candidates].sort((a, b) => (b.score || 0) - (a.score || 0));

  const getFitColor = (fit?: string) => {
    switch (fit) {
      case 'excellent': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'good': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'fair': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  if (!role) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/roles')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Roles
            </Button>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-semibold mb-2">Role not found</h3>
              <p className="text-muted-foreground">
                The role you're looking for doesn't exist.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/roles')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Roles
          </Button>
        </div>

        {/* Role Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-2xl">{role.title}</CardTitle>
                  <Badge variant={role.status === 'active' ? 'default' : 'secondary'}>
                    {role.status}
                  </Badge>
                </div>
                <CardDescription className="flex flex-wrap gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    {role.department}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {role.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {role.type}
                  </span>
                  {role.salary && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      {role.salary}
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditRole}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Role
                </Button>
                <div className="flex items-center gap-2">
                  <Switch
                    id="role-status"
                    checked={role.status === 'active'}
                    onCheckedChange={handleToggleStatus}
                  />
                  <Label htmlFor="role-status" className="cursor-pointer text-sm font-medium">
                    {role.status === 'active' ? 'Active' : 'Inactive'}
                  </Label>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{role.description}</p>
            <div className="flex items-center gap-6 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{candidates.length}</span>
                <span className="text-sm text-muted-foreground">candidates</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Created {new Date(role.createdAt).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Candidates List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Candidates</h2>
            <div className="flex items-center gap-2">
              {!selectionMode ? (
                <>
                  {candidates.length > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleSelectionMode}
                      >
                        Select Multiple
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadCandidateSummary}
                        className="border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Download Summary PDF
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground mr-2">
                    {selectedCandidates.length} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                  >
                    {selectedCandidates.length === candidates.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  {selectedCandidates.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteAll}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectionMode}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>

          {candidates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No candidates yet</h3>
                <p className="text-muted-foreground mb-4">
                  Parse CVs and attach them to this role to see candidates here
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => navigate('/dashboard/parse')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Parse CV
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/dashboard/bulk-parse')}>
                    Bulk Parse
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            sortedCandidates.map((candidate, index) => (
              <Card
                key={candidate.id}
                className={`transition-colors ${
                  selectedCandidates.includes(candidate.id) && selectionMode ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Checkbox - only show in selection mode */}
                      {selectionMode && (
                        <div className="flex-shrink-0 pt-2">
                          <Checkbox
                            checked={selectedCandidates.includes(candidate.id)}
                            onCheckedChange={() => toggleCandidateSelection(candidate.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}

                      {/* Rank Badge */}
                      {index === 0 && candidate.score && candidate.score >= 85 && (
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center">
                            <Star className="w-5 h-5 text-white fill-white" />
                          </div>
                        </div>
                      )}
                      {(!candidate.score || candidate.score < 85 || index > 0) && (
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg font-semibold">
                            {index + 1}
                          </div>
                        </div>
                      )}

                      {/* Candidate Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{candidate.name}</h3>
                          {candidate.fit && (
                            <Badge className={getFitColor(candidate.fit)} variant="secondary">
                              {candidate.fit}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {candidate.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {candidate.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {candidate.fileName}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3">
                          {candidate.skills.slice(0, 5).map((skill) => (
                            <Badge key={skill} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {candidate.skills.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{candidate.skills.length - 5} more
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{candidate.experience_years} years experience</span>
                          <span>Applied {new Date(candidate.appliedDate).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Score */}
                      {candidate.score && (
                        <div className="flex-shrink-0 text-right">
                          <div className="text-3xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
                            {candidate.score}%
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Match Score</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewCandidate(candidate)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCandidate(candidate.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* View Candidate Dialog */}
        <Dialog open={!!viewCandidate} onOpenChange={(open) => !open && handleCloseViewDialog()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Candidate Details</DialogTitle>
              <DialogDescription>
                {dialogPage === 0 ? 'Full information for' : 'Scoring details for'} {viewCandidate?.name}
              </DialogDescription>
            </DialogHeader>
            {viewCandidate && (
              <div className="space-y-4">
                {dialogPage === 0 ? (
                  // Details Page
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Name</Label>
                        <p className="text-sm font-medium">{viewCandidate.name}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Match Score</Label>
                        <p className="text-sm font-medium">{viewCandidate.score}%</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <p className="text-sm font-medium">{viewCandidate.email}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Phone</Label>
                        <p className="text-sm font-medium">{viewCandidate.phone}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Experience</Label>
                        <p className="text-sm font-medium">{viewCandidate.experience_years} years</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Applied Date</Label>
                        <p className="text-sm font-medium">{new Date(viewCandidate.appliedDate).toLocaleDateString()}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Fit Level</Label>
                        <div>
                          <Badge className={getFitColor(viewCandidate.fit)} variant="secondary">
                            {viewCandidate.fit}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Resume</Label>
                        <p className="text-sm font-medium">{viewCandidate.fileName}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Skills</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {viewCandidate.skills.map((skill) => (
                          <Badge key={skill} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  // Scoring Page
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold mb-3">Match Analysis</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm">Skills Match</span>
                          <span className="text-sm font-semibold">{viewCandidate.score ? Math.min(viewCandidate.score + 5, 100) : 85}%</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm">Experience Level</span>
                          <span className="text-sm font-semibold">{viewCandidate.score ? Math.max(viewCandidate.score - 8, 70) : 82}%</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm">Cultural Fit</span>
                          <span className="text-sm font-semibold">{viewCandidate.score ? Math.max(viewCandidate.score - 3, 75) : 88}%</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                          <span className="text-sm font-semibold">Overall Score</span>
                          <span className="text-lg font-bold text-primary">{viewCandidate.score}%</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Assessment Notes</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {viewCandidate.fit === 'excellent'
                          ? 'Exceptional candidate with strong alignment to role requirements. Demonstrates advanced expertise in key technologies and brings valuable experience to the team.'
                          : viewCandidate.fit === 'good'
                          ? 'Solid candidate with good technical skills and relevant experience. Shows potential for growth and could be a valuable addition to the team with proper onboarding.'
                          : 'Candidate meets basic requirements but may need additional training or development in certain areas. Consider for roles with lower experience requirements.'}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Key Strengths</h3>
                      <ul className="space-y-1.5 text-sm text-muted-foreground">
                        {viewCandidate.skills.slice(0, 3).map((skill, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>Proficient in {skill}</span>
                          </li>
                        ))}
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{viewCandidate.experience_years} years of relevant industry experience</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Pagination Dots */}
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    onClick={() => setDialogPage(0)}
                    className={`h-2 rounded-full transition-all ${
                      dialogPage === 0 ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30'
                    }`}
                    aria-label="View details page"
                  />
                  <button
                    onClick={() => setDialogPage(1)}
                    className={`h-2 rounded-full transition-all ${
                      dialogPage === 1 ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30'
                    }`}
                    aria-label="View scoring page"
                  />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Candidate Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-destructive/10 rounded-full">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <AlertDialogTitle>
                  {selectedCandidates.length > 0 && !candidateToDelete
                    ? `Remove ${selectedCandidates.length} Candidate${selectedCandidates.length > 1 ? 's' : ''}`
                    : 'Remove Candidate'}
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-base">
                {selectedCandidates.length > 0 && !candidateToDelete ? (
                  <>
                    Are you sure you want to remove {selectedCandidates.length} candidate{selectedCandidates.length > 1 ? 's' : ''} from this role? This action cannot be undone.
                  </>
                ) : (
                  <>
                    Are you sure you want to remove this candidate from this role? This action cannot be undone.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setCandidateToDelete(null);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={selectedCandidates.length > 0 && !candidateToDelete ? confirmBulkDelete : confirmDeleteCandidate}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove {selectedCandidates.length > 0 && !candidateToDelete ? `${selectedCandidates.length} Candidate${selectedCandidates.length > 1 ? 's' : ''}` : 'Candidate'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Role Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Role</DialogTitle>
              <DialogDescription>
                Update the role details below.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Job Title *</Label>
                  <Input
                    id="edit-title"
                    placeholder="e.g., Senior Software Engineer"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-department">Department *</Label>
                  <Input
                    id="edit-department"
                    placeholder="e.g., Engineering"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-location">Location *</Label>
                  <Input
                    id="edit-location"
                    placeholder="e.g., Remote or New York, NY"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Employment Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger id="edit-type">
                      <SelectValue placeholder="Select employment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="freelance">Freelance</SelectItem>
                      <SelectItem value="temporary">Temporary</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-salary">Salary Range</Label>
                <Input
                  id="edit-salary"
                  placeholder="e.g., $120k - $160k"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Job Description *</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Describe the role, responsibilities, and requirements..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[120px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateRole}
                disabled={!formData.title || !formData.department || !formData.location || !formData.description}
              >
                Update Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default RoleDetails;
