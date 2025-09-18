import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getSocieties, getSocietyAgent, proposeSocietyUpdate } from "@/lib/api";

export default function MySociety() {
  const { user } = useAuth();
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [society, setSociety] = useState<any | null>(null);
  const [agent, setAgent] = useState<{ uid: string; name: string; email: string } | null>(null);
  const [form, setForm] = useState({ name: "", street: "", city: "", state: "", zip: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    // Fetch accessible societies and pick the one associated to the member
    getSocieties().then((list) => {
      // For member roles, get the first (their associatedSocietyId is enforced server-side)
      const first = list[0];
      if (first?.id) {
        setSocietyId(first.id);
      }
    });
  }, [user]);

  useEffect(() => {
    if (!societyId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/societies/${societyId}`).then((r) => r.json()),
      getSocietyAgent(societyId),
    ])
      .then(([soc, ag]) => {
        setSociety(soc);
        setAgent(ag);
        setForm({
          name: soc.name || "",
          street: soc.address?.street || "",
          city: soc.address?.city || "",
          state: soc.address?.state || "",
          zip: soc.address?.zip || "",
          email: soc.contactInfo?.email || "",
          phone: soc.contactInfo?.phone || "",
        });
      })
      .finally(() => setLoading(false));
  }, [societyId]);

  const pending = society?.pendingUpdate;

  return (
    <div className="container py-10 max-w-3xl">
      <Card className="bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle>My Society</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? <div className="text-sm text-muted-foreground">Loading...</div> : null}
          {society ? (
            <>
              {society.approvalStatus !== "Approved" ? (
                <div className="rounded-md border border-yellow-600/40 bg-yellow-600/10 p-3 text-sm">
                  Society status: {society.approvalStatus || "Pending"}. You will gain full access after admin approval.
                </div>
              ) : null}
              {pending ? (
                <div className="rounded-md border border-blue-600/40 bg-blue-600/10 p-3 text-sm">
                  Pending edit awaiting admin approval. Submitted at {new Date(pending.updatedAt).toLocaleString()}.
                </div>
              ) : null}

              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label>Assigned Agent</Label>
                  <div className="text-sm text-muted-foreground">
                    {agent ? (
                      <span>{agent.name} ({agent.email})</span>
                    ) : (
                      <span>No agent assigned</span>
                    )}
                  </div>
                </div>

                <form
                  className="grid gap-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!societyId) return;
                    setError(null);
                    setMessage(null);
                    try {
                      await proposeSocietyUpdate(societyId, {
                        name: form.name,
                        address: { street: form.street, city: form.city, state: form.state, zip: form.zip },
                        contactInfo: { email: form.email || undefined, phone: form.phone || undefined },
                      });
                      setMessage("Update submitted for admin approval. Society data remains unchanged until approved.");
                      // Refresh to reflect pending banner
                      const updated = await fetch(`/api/societies/${societyId}`).then((r) => r.json());
                      setSociety(updated);
                    } catch (err: any) {
                      setError(err?.message || "Failed to submit update");
                    }
                  }}
                >
                  <div className="grid gap-2">
                    <Label>Society Name</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-background/60" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>Street</Label>
                      <Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className="bg-background/60" />
                    </div>
                    <div className="grid gap-2">
                      <Label>City</Label>
                      <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="bg-background/60" />
                    </div>
                    <div className="grid gap-2">
                      <Label>State</Label>
                      <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="bg-background/60" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Zip</Label>
                      <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} className="bg-background/60" />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>Contact Email</Label>
                      <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-background/60" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Contact Phone</Label>
                      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-background/60" />
                    </div>
                  </div>
                  {error ? <div className="text-sm text-red-500">{error}</div> : null}
                  {message ? <div className="text-sm text-green-600">{message}</div> : null}
                  <div className="flex justify-end pt-2">
                    <Button type="submit" className="bg-primary">Submit Edit for Approval</Button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No society found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


