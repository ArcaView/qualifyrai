import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
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
  Plus,
  MapPin,
  DollarSign,
  Users,
  FileText,
  Edit,
  Trash2,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRoles, type Role } from "@/contexts/RolesContext";

const OpenRoles = () => {
  const navigate = useNavigate();
  const { roles, addRole, updateRole, deleteRole: deleteRoleFromContext } = useRoles();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    location: '',
    type: 'full-time',
    salary: '',
    description: '',
  });

  const handleCreateRole = async () => {
    console.log('[handleCreateRole] Called with formData:', formData);
    try {
      await addRole(formData);
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('[handleCreateRole] Error:', error);
      // Error is already handled by addRole with toast notification
    }
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setFormData({
      title: role.title,
      department: role.department,
      location: role.location,
      type: role.type,
      salary: role.salary,
      description: role.description,
    });
    setDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;
    try {
      await updateRole(editingRole.id, formData);
      setDialogOpen(false);
      setEditingRole(null);
      resetForm();
    } catch (error: any) {
      // Error is already handled by updateRole with toast notification
      // TODO: Replace with proper error logging service (e.g., Sentry)
    }
  };

  const handleDeleteRole = (id: string) => {
    setRoleToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteRole = () => {
    if (roleToDelete) {
      deleteRoleFromContext(roleToDelete);
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      department: '',
      location: '',
      type: 'full-time',
      salary: '',
      description: '',
    });
    setEditingRole(null);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const activeRoles = roles.filter(r => r.status === 'active').length;
  const totalCandidates = roles.reduce((sum, r) => sum + r.candidates, 0);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Open Roles</h1>
            <p className="text-muted-foreground">
              Manage your open positions and track candidates
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button data-tour="create-role">
                <Plus className="w-4 h-4 mr-2" />
                New Role
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
                <DialogDescription>
                  {editingRole ? 'Update the role details below.' : 'Add a new open position to your organisation.'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Job Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Senior Software Engineer"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department *</Label>
                    <Input
                      id="department"
                      placeholder="e.g., Engineering"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      placeholder="e.g., Remote or New York, NY"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Employment Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger id="type">
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
                  <Label htmlFor="salary">Salary Range</Label>
                  <Input
                    id="salary"
                    placeholder="e.g., $120k - $160k"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Job Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the role, responsibilities, and requirements..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="min-h-[120px]"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => handleDialogClose(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={editingRole ? handleUpdateRole : handleCreateRole}
                  disabled={!formData.title || !formData.department || !formData.location || !formData.description}
                >
                  {editingRole ? 'Update Role' : 'Create Role'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active Roles</CardDescription>
              <CardTitle className="text-3xl">{activeRoles}</CardTitle>
            </CardHeader>
          </Card>
          <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/dashboard/candidates')}
          >
            <CardHeader className="pb-3">
              <CardDescription>Total Candidates</CardDescription>
              <CardTitle className="text-3xl">{totalCandidates}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Avg. Candidates/Role</CardDescription>
              <CardTitle className="text-3xl">
                {roles.length > 0 ? Math.round(totalCandidates / roles.length) : 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Roles List */}
        <div className="space-y-4">
          {roles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No open roles yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first role to start tracking candidates
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Role
                </Button>
              </CardContent>
            </Card>
          ) : (
            roles.map((role) => (
              <Card
                key={role.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/dashboard/roles/${role.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{role.title}</CardTitle>
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
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditRole(role);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRole(role.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {role.description}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{role.candidates}</span>
                      <span className="text-muted-foreground">candidates</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created {new Date(role.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-destructive/10 rounded-full">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <AlertDialogTitle>Delete Role</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-base">
                Are you sure you want to delete this role? This action cannot be undone.
                {roleToDelete && roles.find(r => r.id === roleToDelete)?.candidates && roles.find(r => r.id === roleToDelete)!.candidates > 0 && (
                  <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-400 font-medium">
                      Warning: This role has {roles.find(r => r.id === roleToDelete)!.candidates} candidate(s) attached.
                      Deleting this role will not delete the candidate data, but they will no longer be associated with this role.
                    </p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRoleToDelete(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteRole}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Role
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default OpenRoles;
