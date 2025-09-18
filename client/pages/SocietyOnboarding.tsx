import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { onboardSociety } from "@/lib/api";

export default function SocietyOnboarding() {
  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<null | { id: string; approvalStatus: string }>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="container py-10 max-w-2xl">
      <Card className="bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Society Onboarding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {submitted ? (
            <div className="text-sm">
              <div className="mb-2">Your society has been submitted for approval.</div>
              <div>ID: {submitted.id}</div>
              <div>Status: {submitted.approvalStatus}</div>
              <div className="mt-3 text-muted-foreground">An admin will review and approve. You can continue once approved.</div>
            </div>
          ) : (
            <form
              className="grid gap-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setSubmitting(true);
                setError(null);
                try {
                  const res = await onboardSociety({
                    name,
                    address: { street, city, state, zip },
                    contactInfo: { email: email || undefined, phone: phone || undefined },
                  });
                  setSubmitted(res);
                } catch (err: any) {
                  setError(err?.message || "Failed to submit");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {error ? <div className="text-sm text-red-500">{error}</div> : null}
              <div className="grid gap-2">
                <Label>Society Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required className="bg-background/60" />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Street</Label>
                  <Input value={street} onChange={(e) => setStreet(e.target.value)} required className="bg-background/60" />
                </div>
                <div className="grid gap-2">
                  <Label>City</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} required className="bg-background/60" />
                </div>
                <div className="grid gap-2">
                  <Label>State</Label>
                  <Input value={state} onChange={(e) => setState(e.target.value)} required className="bg-background/60" />
                </div>
                <div className="grid gap-2">
                  <Label>Zip</Label>
                  <Input value={zip} onChange={(e) => setZip(e.target.value)} required className="bg-background/60" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Contact Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-background/60" />
                </div>
                <div className="grid gap-2">
                  <Label>Contact Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-background/60" />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" className="bg-primary" disabled={submitting}>{submitting ? "Submitting..." : "Submit for Approval"}</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
