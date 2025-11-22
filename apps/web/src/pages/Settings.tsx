import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, Key, Shield, Eye, EyeOff, Copy, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabase";
import { generateApiKey, fetchApiKeys, deleteApiKey, type ApiKey } from "@/lib/api/api-keys";

const Settings = () => {
  const { toast } = useToast();
  const { user, updateProfile } = useUser();

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
  const [showGeneratedKeyDialog, setShowGeneratedKeyDialog] = useState(false);

  // Password change state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Fetch API keys from database on mount
  useEffect(() => {
    const loadApiKeys = async () => {
      setIsLoadingKeys(true);
      const keys = await fetchApiKeys();
      setApiKeys(keys);
      setIsLoadingKeys(false);
    };

    if (user) {
      loadApiKeys();
    }
  }, [user]);

  // Profile state - initialize from user context
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
  });

  // Load user data when component mounts or user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        company: user.company,
      });
    }
  }, [user]);

  const [isProfileLoading, setIsProfileLoading] = useState(false);

  const handleProfileChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProfileLoading(true);

    try {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        throw new Error("User not authenticated");
      }

      // Update email in auth.users if changed
      if (profileData.email !== user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: profileData.email,
        });

        if (emailError) {
          throw emailError;
        }

        toast({
          title: "Email Verification Required",
          description: "A verification email has been sent to your new email address.",
        });
      }

      // Combine first and last name
      const fullName = `${profileData.firstName} ${profileData.lastName}`.trim();

      // Update or insert user_profiles table
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: currentUser.id,
          full_name: fullName,
          company_name: profileData.company,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        throw profileError;
      }

      // Update auth.users metadata for quick access
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          company: profileData.company,
        }
      });

      if (metadataError) {
        throw metadataError;
      }

      // Update user profile in context
      updateProfile(profileData);

      toast({
        title: "Profile updated",
        description: "Your profile information has been successfully updated.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update profile";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProfileLoading(false);
    }
  };

  // API Key functions
  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${keyName} copied to clipboard`,
    });
  };

  const generateNewApiKey = async (keyName: string) => {
    setIsGeneratingKey(true);

    try {
      const result = await generateApiKey(keyName);

      if (!result.success || !result.apiKey || !result.keyData) {
        throw new Error(result.error || "Failed to generate API key");
      }

      // Add new key to list
      setApiKeys(prev => [...prev, result.keyData!]);

      // Store the plain key to show it once
      setGeneratedApiKey(result.apiKey);
      setShowGeneratedKeyDialog(true);

      toast({
        title: "API Key Generated",
        description: "Your new API key has been created. Make sure to copy it now - it will not be shown again.",
      });

      setShowKeyDialog(false);
      setNewKeyName("");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate API key. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleGenerateKeyClick = () => {
    setNewKeyName(`API Key ${apiKeys.length + 1}`);
    setShowKeyDialog(true);
  };

  const handleConfirmGenerateKey = () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the API key.",
        variant: "destructive",
      });
      return;
    }
    generateNewApiKey(newKeyName);
  };

  const handleDeleteKeyClick = (key: ApiKey) => {
    setKeyToDelete(key);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!keyToDelete) return;

    try {
      const success = await deleteApiKey(keyToDelete.id);

      if (!success) {
        throw new Error("Failed to delete API key");
      }

      // Remove from local state
      setApiKeys(prev => prev.filter(key => key.id !== keyToDelete.id));

      toast({
        title: "API Key Deleted",
        description: `${keyToDelete.name} has been permanently deleted.`,
      });

      setShowDeleteDialog(false);
      setKeyToDelete(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete API key",
        variant: "destructive",
      });
    }
  };

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push("Password must contain at least one special character");
    }

    return errors;
  };

  const handleChangePasswordClick = () => {
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordErrors([]);
    setShowPasswordDialog(true);
  };

  const handleConfirmPasswordChange = async () => {
    const errors: string[] = [];

    // Validate current password exists
    if (!passwordData.currentPassword) {
      errors.push("Current password is required");
    }

    // Validate new password
    const passwordValidationErrors = validatePassword(passwordData.newPassword);
    errors.push(...passwordValidationErrors);

    // Check if passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.push("New passwords do not match");
    }

    if (errors.length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setIsChangingPassword(true);

    try {
      // Step 1: Verify current password by re-authenticating
      if (!user?.email) {
        throw new Error("User email not found");
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword,
      });

      if (signInError) {
        setPasswordErrors(["Current password is incorrect"]);
        setIsChangingPassword(false);
        return;
      }

      // Step 2: Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed.",
      });

      setShowPasswordDialog(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordErrors([]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update password";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const maskApiKey = (keyPrefix: string) => {
    // keyPrefix is like "qfy_live_abc", show it with dots
    return `${keyPrefix}••••••••••••••••••••`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleCloseGeneratedKeyDialog = () => {
    setShowGeneratedKeyDialog(false);
    setGeneratedApiKey(null);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="api" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                <span className="hidden sm:inline">API Keys</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your account profile information and email address
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          placeholder="John"
                          value={profileData.firstName}
                          onChange={(e) => handleProfileChange('firstName', e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          placeholder="Doe"
                          value={profileData.lastName}
                          onChange={(e) => handleProfileChange('lastName', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={profileData.email}
                        onChange={(e) => handleProfileChange('email', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        placeholder="Acme Inc."
                        value={profileData.company}
                        onChange={(e) => handleProfileChange('company', e.target.value)}
                      />
                    </div>
                    <Button type="submit" disabled={isProfileLoading}>
                      {isProfileLoading ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="api" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>
                    Manage your API keys for accessing the Qualifyr.AI API
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingKeys ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading API keys...
                    </div>
                  ) : apiKeys.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No API keys yet. Generate one to get started.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {apiKeys.map((apiKey) => {
                        return (
                          <div key={apiKey.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1 min-w-0 mr-4">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold">{apiKey.name}</p>
                                <span className="text-xs text-muted-foreground">
                                  Created {formatDate(apiKey.created_at)}
                                </span>
                                {!apiKey.is_active && (
                                  <span className="text-xs px-2 py-1 bg-destructive/10 text-destructive rounded">
                                    Inactive
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-muted-foreground font-mono truncate">
                                  {maskApiKey(apiKey.key_prefix)}
                                </p>
                                <span className="text-xs text-muted-foreground">
                                  (Only prefix shown)
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteKeyClick(apiKey)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <Separator />
                  <Button
                    variant="outline"
                    onClick={handleGenerateKeyClick}
                    disabled={isGeneratingKey || isLoadingKeys}
                  >
                    Generate New API Key
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Manage your password and security preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Password</Label>
                      <p className="text-sm text-muted-foreground">
                        Change your password to keep your account secure
                      </p>
                    </div>
                    <Button variant="outline" onClick={handleChangePasswordClick}>
                      Change Password
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Button variant="outline" disabled>Enable (Coming Soon)</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
        </Tabs>

        {/* Dialog for naming new API key */}
        <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Enter a name for your new API key. This will help you identify it later.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="keyName">API Key Name</Label>
                <Input
                  id="keyName"
                  placeholder="e.g., Production Key, Test Key"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleConfirmGenerateKey();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowKeyDialog(false)}
                disabled={isGeneratingKey}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmGenerateKey}
                disabled={isGeneratingKey}
              >
                {isGeneratingKey ? "Generating..." : "Generate Key"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog for deleting API key with warning */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">Delete API Key</DialogTitle>
              <DialogDescription>
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <p className="text-sm font-semibold text-destructive mb-2">
                  ⚠️ Warning: This action is permanent
                </p>
                <p className="text-sm text-muted-foreground">
                  Deleting <span className="font-semibold">{keyToDelete?.name}</span> will immediately revoke access for any applications using this API key. This cannot be undone.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-semibold">Key:</span> <span className="font-mono text-muted-foreground">{keyToDelete && maskApiKey(keyToDelete.key_prefix)}</span>
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Created:</span> <span className="text-muted-foreground">{keyToDelete && formatDate(keyToDelete.created_at)}</span>
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setKeyToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
              >
                Delete API Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog for changing password */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Update your password. Make sure it meets all security requirements.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {passwordErrors.length > 0 && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                  <p className="text-sm font-semibold text-destructive mb-1">
                    Please fix the following errors:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                    {passwordErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="currentPasswordDialog">Current Password</Label>
                <Input
                  id="currentPasswordDialog"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="newPasswordDialog">New Password</Label>
                <Input
                  id="newPasswordDialog"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirmPasswordDialog">Confirm New Password</Label>
                <Input
                  id="confirmPasswordDialog"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleConfirmPasswordChange();
                    }
                  }}
                />
              </div>

              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-sm font-semibold mb-1">Password Requirements:</p>
                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                  <li>At least 8 characters long</li>
                  <li>One uppercase letter</li>
                  <li>One lowercase letter</li>
                  <li>One number</li>
                  <li>One special character (!@#$%^&*, etc.)</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordDialog(false);
                  setPasswordData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                  setPasswordErrors([]);
                }}
                disabled={isChangingPassword}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmPasswordChange}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? "Updating..." : "Update Password"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog for showing the generated API key (shown only once) */}
        <Dialog open={showGeneratedKeyDialog} onOpenChange={setShowGeneratedKeyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>🎉 API Key Generated Successfully</DialogTitle>
              <DialogDescription>
                Make sure to copy your API key now. You won't be able to see it again!
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="rounded-lg border-2 border-primary bg-primary/5 p-4">
                <p className="text-sm font-semibold mb-2">Your API Key:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono bg-background p-3 rounded border break-all">
                    {generatedApiKey}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (generatedApiKey) {
                        copyToClipboard(generatedApiKey, "API Key");
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
                <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-500 mb-1">
                  ⚠️ Important Security Notice
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>This key will only be shown once</li>
                  <li>Store it securely (e.g., password manager, environment variables)</li>
                  <li>Never commit it to version control</li>
                  <li>If you lose it, you'll need to generate a new key</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCloseGeneratedKeyDialog}
                variant="default"
              >
                I've Saved My API Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
