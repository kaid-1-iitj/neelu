import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAgents, getSocieties, createAgent, terminateAgent, assignAgentToSociety, unassignAgentFromSociety } from "@/lib/api";

export default function AgentsPage() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<any[]>([]);
  const [societies, setSocieties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [creating, setCreating] = useState(false);

  const societiesByAgent = useMemo(() => {
    const map = new Map<string, any | undefined>();
    for (const s of societies) {
      if (s.assignedAgentId) map.set(s.assignedAgentId, s);
    }
    return map;
  }, [societies]);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "Admin") {
      setError("Only Admin can access Agents");
      setLoading(false);
      return;
    }
    Promise.all([getAgents(), getSocieties()])
      .then(([ags, socs]) => {
        setAgents(ags);
        setSocieties(socs);
      })
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user || user.role !== "Admin") {
    return (
      <div className="container py-8">
        <Card className="bg-card/80">
          <CardHeader>
            <CardTitle>Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/70">You do not have access to this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <Card className="bg-card/80">
        <CardHeader>
          <CardTitle>Onboard New Agent</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setCreating(true);
              try {
                const created = await createAgent({ email: form.email, password: form.password, name: form.name || undefined });
                setAgents((list) => [created, ...list]);
                setForm({ name: "", email: "", password: "" });
              } catch (err) {
                setError("Failed to create agent");
              } finally {
                setCreating(false);
              }
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-background/60" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-background/60" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Temp Password</Label>
              <Input id="password" type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="bg-background/60" required />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={creating} className="bg-primary">{creating ? "Creating..." : "Create Agent"}</Button>
            </div>
          </form>
          {error ? <p className="text-sm text-red-400 mt-3">{error}</p> : null}
        </CardContent>
      </Card>

      <Card className="bg-card/80">
        <CardHeader>
          <CardTitle>Agents</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-foreground/70">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Society</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((a) => {
                  const currentSoc = societiesByAgent.get(a.uid);
                  return (
                    <TableRow key={a.uid}>
                      <TableCell className="font-medium">{a.name || "—"}</TableCell>
                      <TableCell>{a.email}</TableCell>
                      <TableCell>
                        {a.isActive ? (
                          <Badge variant="secondary">Active</Badge>
                        ) : (
                          <Badge variant="destructive">Terminated</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={currentSoc?.id || ""}
                          onValueChange={async (socId) => {
                            const prevId = currentSoc?.id;
                            try {
                              if (prevId) await unassignAgentFromSociety(prevId);
                              await assignAgentToSociety(socId, a.uid);
                              const updated = await getSocieties();
                              setSocieties(updated);
                            } catch {
                              setError("Failed to update assignment");
                            }
                          }}
                        >
                          <SelectTrigger className="w-60 bg-background/60">
                            <SelectValue placeholder="Assign society" />
                          </SelectTrigger>
                          <SelectContent>
                            {societies.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          disabled={!a.isActive}
                          onClick={async () => {
                            try {
                              await terminateAgent(a.uid);
                              setAgents((list) => list.map((x) => (x.uid === a.uid ? { ...x, isActive: false } : x)));
                              const updated = await getSocieties();
                              setSocieties(updated);
                            } catch {
                              setError("Failed to terminate agent");
                            }
                          }}
                        >
                          Terminate
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
