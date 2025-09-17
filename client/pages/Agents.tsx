import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Users, Building2, Trash2, Edit } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Agent {
  id: string;
  uid: string;
  email: string;
  name: string;
  role: string;
  assignedSocieties: string[];
  isActive: boolean;
  createdAt: number;
  terminatedAt?: number;
}

interface Society {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}

export default function Agents() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    assignedSocieties: [] as string[],
  });

  useEffect(() => {
    if (user?.role === "Admin") {
      fetchAgents();
      fetchSocieties();
    }
  }, [user]);

  const fetchAgents = async () => {
    try {
      const response = await fetch("/api/agents", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sl_token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      }
    } catch (error) {
      toast.error("Failed to fetch agents");
    } finally {
      setLoading(false);
    }
  };

  const fetchSocieties = async () => {
    try {
      const response = await fetch("/api/societies", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sl_token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSocieties(data);
      }
    } catch (error) {
      toast.error("Failed to fetch societies");
    }
  };

  const handleCreateAgent = async () => {
    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("sl_token")}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Agent created successfully");
        setIsCreateDialogOpen(false);
        setFormData({ email: "", name: "", assignedSocieties: [] });
        fetchAgents();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create agent");
      }
    } catch (error) {
      toast.error("Failed to create agent");
    }
  };

  const handleUpdateSocieties = async (agentId: string, assignedSocieties: string[]) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/societies`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("sl_token")}`,
        },
        body: JSON.stringify({ assignedSocieties }),
      });

      if (response.ok) {
        toast.success("Agent societies updated successfully");
        fetchAgents();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update agent societies");
      }
    } catch (error) {
      toast.error("Failed to update agent societies");
    }
  };

  const handleTerminateAgent = async (agentId: string) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/terminate`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("sl_token")}`,
        },
        body: JSON.stringify({ reason: "Terminated by admin" }),
      });

      if (response.ok) {
        toast.success("Agent terminated successfully");
        fetchAgents();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to terminate agent");
      }
    } catch (error) {
      toast.error("Failed to terminate agent");
    }
  };

  const getSocietyName = (societyId: string) => {
    const society = societies.find(s => s.id === societyId);
    return society ? society.name : "Unknown Society";
  };

  if (user?.role !== "Admin") {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
              <p className="text-gray-600">Only administrators can access the Agents management page.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading agents...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Agent Management</h1>
          <p className="text-gray-600">Manage agents and their society assignments</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Agent</DialogTitle>
              <DialogDescription>
                Add a new agent to the system. They will receive an email to set their password.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="agent@example.com"
                />
              </div>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Agent Name"
                />
              </div>
              <div>
                <Label>Assigned Societies</Label>
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (value && !formData.assignedSocieties.includes(value)) {
                      setFormData({
                        ...formData,
                        assignedSocieties: [...formData.assignedSocieties, value],
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select societies to assign" />
                  </SelectTrigger>
                  <SelectContent>
                    {societies.map((society) => (
                      <SelectItem key={society.id} value={society.id}>
                        {society.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.assignedSocieties.map((societyId) => (
                    <Badge key={societyId} variant="secondary" className="flex items-center gap-1">
                      {getSocietyName(societyId)}
                      <button
                        onClick={() =>
                          setFormData({
                            ...formData,
                            assignedSocieties: formData.assignedSocieties.filter(id => id !== societyId),
                          })
                        }
                        className="ml-1 hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAgent}>Create Agent</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {agents.map((agent) => (
          <Card key={agent.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {agent.name}
                  </CardTitle>
                  <CardDescription>{agent.email}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={agent.isActive ? "default" : "destructive"}>
                    {agent.isActive ? "Active" : "Terminated"}
                  </Badge>
                  {agent.isActive && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAgent(agent);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Terminate Agent</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to terminate this agent? This action will remove them from all society assignments and cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleTerminateAgent(agent.uid)}>
                              Terminate Agent
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">Assigned Societies:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {agent.assignedSocieties.length > 0 ? (
                    agent.assignedSocieties.map((societyId) => (
                      <Badge key={societyId} variant="outline">
                        {getSocietyName(societyId)}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">No societies assigned</span>
                  )}
                </div>
                {agent.terminatedAt && (
                  <div className="text-sm text-gray-500">
                    Terminated on: {new Date(agent.terminatedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Agent Societies Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Agent Societies</DialogTitle>
            <DialogDescription>
              Update the societies assigned to {selectedAgent?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Assigned Societies</Label>
              <Select
                value=""
                onValueChange={(value) => {
                  if (value && selectedAgent && !selectedAgent.assignedSocieties.includes(value)) {
                    setSelectedAgent({
                      ...selectedAgent,
                      assignedSocieties: [...selectedAgent.assignedSocieties, value],
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select societies to assign" />
                </SelectTrigger>
                <SelectContent>
                  {societies.map((society) => (
                    <SelectItem key={society.id} value={society.id}>
                      {society.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedAgent?.assignedSocieties.map((societyId) => (
                  <Badge key={societyId} variant="secondary" className="flex items-center gap-1">
                    {getSocietyName(societyId)}
                    <button
                      onClick={() =>
                        setSelectedAgent({
                          ...selectedAgent!,
                          assignedSocieties: selectedAgent.assignedSocieties.filter(id => id !== societyId),
                        })
                      }
                      className="ml-1 hover:text-red-500"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedAgent) {
                  handleUpdateSocieties(selectedAgent.uid, selectedAgent.assignedSocieties);
                  setIsEditDialogOpen(false);
                }
              }}
            >
              Update Societies
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
