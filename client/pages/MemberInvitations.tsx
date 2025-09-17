import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, Clock, CheckCircle, UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Invitation {
  id: string;
  email: string;
  role: string;
  societyId: string;
  invitedBy: string;
  token: string;
  isAccepted: boolean;
  expiresAt: number;
  createdAt: number;
}

interface Society {
  id: string;
  name: string;
}

export default function MemberInvitations() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [society, setSociety] = useState<Society | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    role: "Manager" as const,
  });

  useEffect(() => {
    if (user && ["Manager", "Treasurer", "Secretary", "President"].includes(user.role)) {
      fetchInvitations();
      fetchSociety();
    }
  }, [user]);

  const fetchInvitations = async () => {
    try {
      const response = await fetch("/api/invitations/pending", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sl_token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setInvitations(data);
      }
    } catch (error) {
      toast.error("Failed to fetch invitations");
    } finally {
      setLoading(false);
    }
  };

  const fetchSociety = async () => {
    try {
      const response = await fetch("/api/societies", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sl_token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Find the society this user belongs to
        const userSociety = data.find((s: any) => s.id === (user as any)?.associatedSocietyId);
        setSociety(userSociety);
      }
    } catch (error) {
      toast.error("Failed to fetch society information");
    }
  };

  const handleInviteMember = async () => {
    if (!society) return;

    try {
      const response = await fetch(`/api/societies/${society.id}/invite-member`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("sl_token")}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Invitation sent successfully");
        setIsInviteDialogOpen(false);
        setFormData({ email: "", role: "Manager" });
        fetchInvitations();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to send invitation");
      }
    } catch (error) {
      toast.error("Failed to send invitation");
    }
  };

  const getStatusBadge = (invitation: Invitation) => {
    if (invitation.isAccepted) {
      return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />Accepted</Badge>;
    }
    if (invitation.expiresAt < Date.now()) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
  };

  const getDaysUntilExpiry = (expiresAt: number) => {
    const days = Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} days` : "Expired";
  };

  if (!user || !["Manager", "Treasurer", "Secretary", "President"].includes(user.role)) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
              <p className="text-gray-600">Only society members can access the Member Invitations page.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading invitations...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Member Invitations</h1>
          <p className="text-gray-600">
            Invite new members to {society?.name || "your society"}
          </p>
        </div>
        
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New Member</DialogTitle>
              <DialogDescription>
                Send an invitation to a new member to join {society?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="member@example.com"
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: any) => setFormData({ ...formData, role: value })}
                >
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInviteMember}>Send Invitation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {invitations.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Invitations Yet</h3>
              <p className="text-gray-600 mb-4">
                Start building your society by inviting members to join.
              </p>
              <Button onClick={() => setIsInviteDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Invite Your First Member
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {invitations.map((invitation) => (
            <Card key={invitation.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      {invitation.email}
                    </CardTitle>
                    <CardDescription>
                      Invited as {invitation.role} • {new Date(invitation.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(invitation)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Expires in:</span>
                    <span className={invitation.expiresAt < Date.now() ? "text-red-600" : "text-gray-900"}>
                      {getDaysUntilExpiry(invitation.expiresAt)}
                    </span>
                  </div>
                  {invitation.expiresAt < Date.now() && !invitation.isAccepted && (
                    <div className="text-sm text-red-600">
                      This invitation has expired. You may need to send a new invitation.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
