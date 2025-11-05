import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getSocieties, createSociety, updateSociety, getSocietyMembers, addSocietyMember, removeSocietyMember, approveSociety } from "../lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Building2, Edit, Users, Plus, Trash2, Save, X } from "lucide-react";
import type { SocietyMemberInfo, UserRole } from "../../shared/api";

export default function Societies() {
  const { user } = useAuth();
  const [societies, setSocieties] = useState<any[]>([]);
  const [selectedSociety, setSelectedSociety] = useState<any>(null);
  const [membersBySociety, setMembersBySociety] = useState<Record<string, SocietyMemberInfo[]>>({});
  const [loadingMembers, setLoadingMembers] = useState<Record<string, boolean>>({});
  const [loadedSocieties, setLoadedSocieties] = useState<Set<string>>(new Set());
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isAddSocietyDialogOpen, setIsAddSocietyDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
    isActive: true,
  });

  // Add member form state
  const [memberForm, setMemberForm] = useState({
    email: "",
    name: "",
    role: "Manager" as UserRole,
  });

  // Add society form state
  const [societyForm, setSocietyForm] = useState({
    name: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    loadSocieties();
  }, []);

  useEffect(() => {
    // Load members for all societies when component mounts or societies change
    if (societies.length > 0) {
      societies.forEach(society => {
        if (!loadedSocieties.has(society.id)) {
          loadMembers(society.id);
          setLoadedSocieties(prev => new Set(prev).add(society.id));
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [societies]);

  const loadSocieties = async () => {
    try {
      const data = await getSocieties();
      setSocieties(data);
    } catch (error) {
      console.error("Failed to load societies:", error);
    }
  };

  const loadMembers = async (societyId: string) => {
    setLoadingMembers(prev => ({ ...prev, [societyId]: true }));
    try {
      const data = await getSocietyMembers(societyId);
      setMembersBySociety(prev => ({ ...prev, [societyId]: data }));
    } catch (error) {
      console.error("Failed to load members:", error);
    } finally {
      setLoadingMembers(prev => ({ ...prev, [societyId]: false }));
    }
  };

  const handleEditSociety = (society: any) => {
    setSelectedSociety(society);
    setEditForm({
      name: society.name,
      street: society.address.street,
      city: society.address.city,
      state: society.address.state,
      zip: society.address.zip,
      phone: society.contactInfo.phone || "",
      email: society.contactInfo.email || "",
      isActive: society.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveSociety = async () => {
    if (!selectedSociety) return;

    setLoading(true);
    try {
      await updateSociety(selectedSociety.id, {
        name: editForm.name,
        address: {
          street: editForm.street,
          city: editForm.city,
          state: editForm.state,
          zip: editForm.zip,
        },
        contactInfo: {
          phone: editForm.phone || undefined,
          email: editForm.email || undefined,
        },
        isActive: editForm.isActive,
      });

      await loadSocieties();
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Failed to update society:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedSociety) return;

    setLoading(true);
    try {
      await addSocietyMember(selectedSociety.id, {
        email: memberForm.email,
        name: memberForm.name,
        role: memberForm.role,
      });

      await loadMembers(selectedSociety.id);
      setMemberForm({ email: "", name: "", role: "Manager" });
      setIsAddMemberDialogOpen(false);
      // Also reload societies to ensure consistency
      await loadSocieties();
    } catch (error) {
      console.error("Failed to add member:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string, societyId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    setLoading(true);
    try {
      await removeSocietyMember(societyId, userId);
      await loadMembers(societyId);
    } catch (error) {
      console.error("Failed to remove member:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSociety = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await createSociety({
        name: societyForm.name,
        address: {
          street: societyForm.street,
          city: societyForm.city,
          state: societyForm.state,
          zip: societyForm.zip,
        },
        contactInfo: {
          phone: societyForm.phone || undefined,
          email: societyForm.email || undefined,
        },
        members: [],
      });

      await loadSocieties();
      setSocietyForm({ name: "", street: "", city: "", state: "", zip: "", phone: "", email: "" });
      setIsAddSocietyDialogOpen(false);
      // Clear loaded societies set to reload members for new society
      setLoadedSocieties(new Set());
      
      // Society is auto-approved when created by admin (handled in backend)
    } catch (error: any) {
      console.error("Failed to create society:", error);
      setError(error.message || "Failed to create society. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== "Admin") {
    return (
      <div className="container py-10">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Access denied. Admin privileges required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-10 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Societies Management
              </CardTitle>
              <CardDescription>
                Manage all societies in the system. Edit details, add/remove members, and control society status.
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddSocietyDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Society
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {societies.map((society) => (
              <Card key={society.id} className="border">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{society.name}</h3>
                        <Badge variant={society.isActive ? "default" : "secondary"}>
                          {society.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {society.approvalStatus && (
                          <Badge 
                            variant={
                              society.approvalStatus === "Approved" ? "default" : 
                              society.approvalStatus === "Rejected" ? "destructive" : 
                              "secondary"
                            }
                          >
                            {society.approvalStatus}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {society.address.street}, {society.address.city}, {society.address.state} {society.address.zip}
                      </p>
                      {society.contactInfo.email && (
                        <p className="text-sm text-muted-foreground">Email: {society.contactInfo.email}</p>
                      )}
                      {society.contactInfo.phone && (
                        <p className="text-sm text-muted-foreground">Phone: {society.contactInfo.phone}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {(society.approvalStatus !== "Approved" && society.approvalStatus !== undefined) && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={async () => {
                            if (!confirm(`Are you sure you want to approve ${society.name}?`)) return;
                            setLoading(true);
                            try {
                              await approveSociety(society.id);
                              await loadSocieties();
                            } catch (error) {
                              console.error("Failed to approve society:", error);
                              alert("Failed to approve society. Please try again.");
                            } finally {
                              setLoading(false);
                            }
                          }}
                          disabled={loading}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Approve Society
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSociety(society);
                          setIsAddMemberDialogOpen(true);
                        }}
                        disabled={society.approvalStatus !== "Approved"}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Member
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditSociety(society)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>

                  {/* Members Table */}
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">Members</span>
                    </div>
                    {loadingMembers[society.id] ? (
                      <div className="text-sm text-muted-foreground py-4">Loading members...</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {membersBySociety[society.id] && membersBySociety[society.id].length > 0 ? (
                            membersBySociety[society.id]
                              .filter(member => member.userId !== user?.uid) // Don't show current user
                              .map((member) => (
                                <TableRow key={member.userId}>
                                  <TableCell className="font-medium">{member.name}</TableCell>
                                  <TableCell>{member.email}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{member.role}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={member.isActive ? "default" : "secondary"}>
                                      {member.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveMember(member.userId, society.id)}
                                      disabled={loading}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-4">
                                No members yet
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Society Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Society</DialogTitle>
            <DialogDescription>
              Update society details and status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Society Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                value={editForm.street}
                onChange={(e) => setEditForm({ ...editForm, street: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={editForm.state}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="zip">ZIP</Label>
                <Input
                  id="zip"
                  value={editForm.zip}
                  onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={editForm.isActive}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
              />
              <Label htmlFor="isActive">Active Society</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveSociety} disabled={loading}>
                <Save className="h-4 w-4 mr-1" />
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Add a new member to {selectedSociety?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="memberEmail">Email</Label>
              <Input
                id="memberEmail"
                type="email"
                value={memberForm.email}
                onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                placeholder="member@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="memberName">Name</Label>
              <Input
                id="memberName"
                value={memberForm.name}
                onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                placeholder="Member Name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="memberRole">Role</Label>
              <Select value={memberForm.role} onValueChange={(value: UserRole) => setMemberForm({ ...memberForm, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Treasurer">Treasurer</SelectItem>
                  <SelectItem value="Secretary">Secretary</SelectItem>
                  <SelectItem value="President">President</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddMemberDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddMember} disabled={loading || !memberForm.email}>
                <Plus className="h-4 w-4 mr-1" />
                Add Member
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Society Dialog */}
      <Dialog open={isAddSocietyDialogOpen} onOpenChange={(open) => {
        setIsAddSocietyDialogOpen(open);
        if (!open) setError(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Society</DialogTitle>
            <DialogDescription>
              Create a new society in the system.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="societyName">Society Name</Label>
              <Input
                id="societyName"
                value={societyForm.name}
                onChange={(e) => setSocietyForm({ ...societyForm, name: e.target.value })}
                placeholder="Enter society name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="societyStreet">Street Address</Label>
              <Input
                id="societyStreet"
                value={societyForm.street}
                onChange={(e) => setSocietyForm({ ...societyForm, street: e.target.value })}
                placeholder="Enter street address"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="grid gap-2">
                <Label htmlFor="societyCity">City</Label>
                <Input
                  id="societyCity"
                  value={societyForm.city}
                  onChange={(e) => setSocietyForm({ ...societyForm, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="societyState">State</Label>
                <Input
                  id="societyState"
                  value={societyForm.state}
                  onChange={(e) => setSocietyForm({ ...societyForm, state: e.target.value })}
                  placeholder="State"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="societyZip">ZIP</Label>
                <Input
                  id="societyZip"
                  value={societyForm.zip}
                  onChange={(e) => setSocietyForm({ ...societyForm, zip: e.target.value })}
                  placeholder="ZIP"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label htmlFor="societyPhone">Phone</Label>
                <Input
                  id="societyPhone"
                  value={societyForm.phone}
                  onChange={(e) => setSocietyForm({ ...societyForm, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="societyEmail">Email</Label>
                <Input
                  id="societyEmail"
                  type="email"
                  value={societyForm.email}
                  onChange={(e) => setSocietyForm({ ...societyForm, email: e.target.value })}
                  placeholder="Email address"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddSocietyDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddSociety} disabled={loading || !societyForm.name || !societyForm.street || !societyForm.city || !societyForm.state || !societyForm.zip}>
                <Plus className="h-4 w-4 mr-1" />
                Create Society
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
