import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Mail,
  Phone,
  Star,
  Users as UsersIcon,
  FileText,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRoles, type Candidate } from "@/contexts/RolesContext";
import { useToast } from "@/hooks/use-toast";

const AllCandidates = () => {
  const navigate = useNavigate();
  const { roles, updateCandidateStatus, removeCandidateFromRole } = useRoles();
  const { toast } = useToast();

  // Flatten all candidates from all roles
  const allCandidates: (Candidate & { roleId: string; roleTitle: string })[] = [];
  roles.forEach(role => {
    if (role.candidatesList && role.candidatesList.length > 0) {
      role.candidatesList.forEach(candidate => {
        allCandidates.push({
          ...candidate,
          roleId: role.id,
          roleTitle: role.title
        });
      });
    }
  });

  const [viewCandidate, setViewCandidate] = useState<(Candidate & { roleId: string; roleTitle: string }) | null>(null);
  const [dialogPage, setDialogPage] = useState(0);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleViewCandidate = (candidate: Candidate & { roleId: string; roleTitle: string }) => {
    navigate(`/dashboard/candidates/${candidate.id}/${candidate.roleId}`);
  };

  const handleCloseViewDialog = () => {
    setViewCandidate(null);
    setDialogPage(0);
  };

  const handleStatusChange = (roleId: string, candidateId: string, status: Candidate['status'], candidateName: string) => {
    updateCandidateStatus(roleId, candidateId, status);
    toast({
      title: "Status Updated",
      description: `${candidateName}'s status changed to ${getStatusLabel(status)}`,
    });
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedCandidates([]);
    }
  };

  const toggleCandidateSelection = (candidateKey: string) => {
    setSelectedCandidates(prev =>
      prev.includes(candidateKey)
        ? prev.filter(id => id !== candidateKey)
        : [...prev, candidateKey]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCandidates.length === sortedCandidates.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(sortedCandidates.map(c => `${c.roleId}|||${c.id}`));
    }
  };

  const handleDeleteSelected = async () => {
    try {
      // Delete each selected candidate
      for (const candidateKey of selectedCandidates) {
        const [roleId, candidateId] = candidateKey.split('|||');
        await removeCandidateFromRole(roleId, candidateId);
      }

      toast({
        title: "Candidates Deleted",
        description: `${selectedCandidates.length} candidate${selectedCandidates.length > 1 ? 's' : ''} deleted successfully`,
      });

      setSelectedCandidates([]);
      setSelectionMode(false);
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete candidates",
        variant: "destructive",
      });
    }
  };

  const getFitColor = (fit?: string) => {
    switch (fit) {
      case 'excellent': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'good': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'fair': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: Candidate['status']) => {
    switch (status) {
      case 'new': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'reviewing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'shortlisted': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'interviewing': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'offered': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'hired': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status: Candidate['status']) => {
    switch (status) {
      case 'new': return 'New';
      case 'reviewing': return 'Reviewing';
      case 'shortlisted': return 'Shortlisted';
      case 'interviewing': return 'Interviewing';
      case 'offered': return 'Offered';
      case 'hired': return 'Hired';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const sortedCandidates = [...allCandidates].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">All Candidates</h1>
            <p className="text-muted-foreground">
              Complete list of candidates across all roles ({allCandidates.length} total)
            </p>
          </div>
          {allCandidates.length > 0 && (
            <div className="flex items-center gap-2">
              {!selectionMode ? (
                <Button variant="outline" size="sm" onClick={toggleSelectionMode}>
                  Select Multiple
                </Button>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground mr-2">
                    {selectedCandidates.length} selected
                  </span>
                  <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                    {selectedCandidates.length === sortedCandidates.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  {selectedCandidates.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={toggleSelectionMode}>
                    Cancel
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Candidates List */}
        {allCandidates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <UsersIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No candidates yet</h3>
              <p className="text-muted-foreground">
                Parse CVs and attach them to roles to see candidates here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3" data-tour="candidates-list">
            {sortedCandidates.map((candidate, index) => (
              <Card key={`${candidate.roleId}|||${candidate.id}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    {/* Checkbox in selection mode */}
                    {selectionMode && (
                      <div className="flex-shrink-0 mt-1">
                        <Checkbox
                          checked={selectedCandidates.includes(`${candidate.roleId}|||${candidate.id}`)}
                          onCheckedChange={() => toggleCandidateSelection(`${candidate.roleId}|||${candidate.id}`)}
                        />
                      </div>
                    )}

                    {/* Rank Badge */}
                    {index === 0 && candidate.score && candidate.score >= 85 ? (
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center">
                          <Star className="w-5 h-5 text-white fill-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </div>
                      </div>
                    )}

                    {/* Candidate Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3
                          className="text-base font-semibold cursor-pointer hover:text-primary transition-colors"
                          onClick={() => handleViewCandidate(candidate)}
                        >
                          {candidate.name}
                        </h3>
                        {candidate.fit && (
                          <Badge className={getFitColor(candidate.fit)} variant="secondary">
                            {candidate.fit}
                          </Badge>
                        )}
                        <Badge className={getStatusColor(candidate.status)} variant="secondary">
                          {getStatusLabel(candidate.status)}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {candidate.roleTitle}
                        </span>
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
                          {candidate.experience_years} years exp
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-xs text-muted-foreground">
                          Applied {new Date(candidate.appliedDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Status:</Label>
                          <Select
                            value={candidate.status}
                            onValueChange={(value) => handleStatusChange(
                              candidate.roleId,
                              candidate.id,
                              value as Candidate['status'],
                              candidate.name
                            )}
                          >
                            <SelectTrigger className="w-[180px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="reviewing">Reviewing</SelectItem>
                              <SelectItem value="shortlisted">Shortlisted</SelectItem>
                              <SelectItem value="interviewing">Interviewing</SelectItem>
                              <SelectItem value="offered">Offered</SelectItem>
                              <SelectItem value="hired">Hired</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Score */}
                    {candidate.score && (
                      <div className="flex-shrink-0 text-right">
                        <div className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
                          {candidate.score}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Match</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

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
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Status</Label>
                        <div>
                          <Badge className={getStatusColor(viewCandidate.status)} variant="secondary">
                            {getStatusLabel(viewCandidate.status)}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Resume</Label>
                        <p className="text-sm font-medium">{viewCandidate.fileName}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Applied For</Label>
                        <p className="text-sm font-medium">{viewCandidate.roleTitle}</p>
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Candidates</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedCandidates.length} candidate{selectedCandidates.length > 1 ? 's' : ''}?
                This action cannot be undone and will remove all associated data including interviews, notes, and status history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete {selectedCandidates.length} Candidate{selectedCandidates.length > 1 ? 's' : ''}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default AllCandidates;
