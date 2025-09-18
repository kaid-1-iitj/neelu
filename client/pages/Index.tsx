import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getReports, getSocieties } from "@/lib/api";

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && ["Manager", "Treasurer", "Secretary", "President"].includes(user.role)) {
      navigate("/onboarding", { replace: false });
    }
  }, [user, navigate]);
  const [pending, setPending] = useState<number | null>(null);
  const [approved, setApproved] = useState<number | null>(null);
  const [societies, setSocieties] = useState<number | null>(null);

  useEffect(() => {
    getReports()
      .then((data) => {
        setPending(data.pending);
        setApproved(data.approved);
      })
      .catch(() => {
        setPending(0);
        setApproved(0);
      });

    getSocieties()
      .then((list) => setSocieties(list.length))
      .catch(() => setSocieties(0));
  }, []);

  return (
    <div className="bg-gradient-to-br from-background to-[#171717]">
      <section className="container py-16 md:py-24">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-foreground/70">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Real-time, auditable finances for housing societies
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Society Ledgers
              <span className="block text-xl md:text-2xl font-semibold text-foreground/80 mt-2">
                Secure, scalable, and transparent bill management.
              </span>
            </h1>
            <p className="text-foreground/80 max-w-xl">
              Centralize invoices, streamline approvals, and keep members, admins, and agents in sync—powered by Express and MongoDB.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a href="/bills" className="inline-flex">
                <button className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground shadow-[0_0_24px_rgba(138,43,226,0.35)] hover:bg-primary/90 transition">
                  Explore Bills
                </button>
              </a>
              <a href="/dashboard" className="inline-flex">
                <button className="inline-flex items-center justify-center rounded-md bg-secondary px-5 py-3 font-medium text-secondary-foreground hover:bg-secondary/90 transition">
                  View Dashboard
                </button>
              </a>
            </div>
            <div className="flex items-center gap-6 pt-4 text-sm text-foreground/70">
              <div>
                <div className="text-2xl font-bold text-accent">99.9%</div>
                Uptime
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">4</div>
                Roles onboarded
              </div>
              <div>
                <div className="text-2xl font-bold">Audit</div>
                Ready logs
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 rounded-2xl bg-primary/20 blur-3xl" />
            <div className="relative rounded-2xl border border-border/60 bg-card/80 p-6 shadow-2xl">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg bg-background/60 p-4">
                  <div className="text-foreground/70">Pending Bills</div>
                  <div className="mt-1 text-2xl font-bold">{pending ?? "—"}</div>
                </div>
                <div className="rounded-lg bg-background/60 p-4">
                  <div className="text-foreground/70">Avg Resolution</div>
                  <div className="mt-1 text-2xl font-bold text-accent">2.3d</div>
                </div>
                <div className="rounded-lg bg-background/60 p-4">
                  <div className="text-foreground/70">Active Societies</div>
                  <div className="mt-1 text-2xl font-bold">{societies ?? "—"}</div>
                </div>
                <div className="rounded-lg bg-background/60 p-4">
                  <div className="text-foreground/70">Approved</div>
                  <div className="mt-1 text-2xl font-bold text-primary">{approved ?? "—"}</div>
                </div>
              </div>
              <div className="mt-6 rounded-lg border border-border/60 bg-background/60 p-4 text-sm">
                <div className="font-semibold">Approval Workflow</div>
                <ol className="mt-2 list-decimal pl-5 space-y-1 text-foreground/80">
                  <li>Members submit bills with attachments.</li>
                  <li>Agents review, request clarifications, or approve.</li>
                  <li>All changes logged with remarks and status history.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-12 md:py-16">
        <h2 className="text-2xl font-bold tracking-tight">Built for every role</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <FeatureCard title="Admin" desc="Create societies, onboard members, assign agents, and monitor activity across the platform." />
          <FeatureCard title="Society Members" desc="Submit bills, track statuses, and stay updated with notifications and remarks." />
          <FeatureCard title="Agents" desc="Review bills, change statuses, add remarks, and ensure timely processing." />
        </div>
      </section>

      <section className="container py-12 md:py-16">
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-background/80 to-background/40 p-8 md:p-10 text-center">
          <h3 className="text-2xl font-bold">Transparent. Auditable. Real-time.</h3>
          <p className="mt-2 text-foreground/80">MongoDB-backed data, role-based approvals, and Express APIs.</p>
          <div className="mt-6 inline-flex gap-3">
            <a href="/bills" className="inline-flex">
              <button className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground shadow-[0_0_24px_rgba(138,43,226,0.35)] hover:bg-primary/90 transition">
                Get Started
              </button>
            </a>
            <a href="/reports" className="inline-flex">
              <button className="inline-flex items-center justify-center rounded-md bg-secondary px-5 py-3 font-medium text-secondary-foreground hover:bg-secondary/90 transition">
                Generate Reports
              </button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/70 p-6">
      <div className="h-10 w-10 rounded-lg bg-primary/20 mb-3" />
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-foreground/80 mt-1">{desc}</p>
    </div>
  );
}
