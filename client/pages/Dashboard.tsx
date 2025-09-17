import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { getBills, getReports, getSocieties } from "@/lib/api";

type TrendPoint = { month: string; pending: number; approved: number };

export default function Dashboard() {
  const [pending, setPending] = useState<number | null>(null);
  const [approved, setApproved] = useState<number | null>(null);
  const [societies, setSocieties] = useState<number | null>(null);
  const [bills, setBills] = useState<any[]>([]);

  useEffect(() => {
    getReports().then((r) => { setPending(r.pending); setApproved(r.approved); }).catch(() => { setPending(0); setApproved(0); });
    getSocieties().then((s) => setSocieties(s.length)).catch(() => setSocieties(0));
    getBills().then(setBills).catch(() => setBills([]));
  }, []);

  const data: TrendPoint[] = useMemo(() => {
    const byMonth = new Map<string, { pending: number; approved: number }>();
    for (const b of bills) {
      const d = new Date(b.createdAt || Date.now());
      const key = d.toLocaleString(undefined, { month: "short" });
      const bucket = byMonth.get(key) || { pending: 0, approved: 0 };
      if (b.status === "Approved") bucket.approved += 1; else bucket.pending += 1;
      byMonth.set(key, bucket);
    }
    const months = Array.from(byMonth.entries());
    return months.map(([m, v]) => ({ month: m, pending: v.pending, approved: v.approved }));
  }, [bills]);

  return (
    <div className="container py-10 space-y-8">
      <section className="grid gap-6 md:grid-cols-3">
        <Card className="bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle>Total Societies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{societies ?? "—"}</div>
            <p className="text-sm text-muted-foreground">Live</p>
          </CardContent>
        </Card>
        <Card className="bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle>Pending Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-300">{pending ?? "—"}</div>
            <p className="text-sm text-muted-foreground">Needs review</p>
          </CardContent>
        </Card>
        <Card className="bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle>Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">{approved ?? "—"}</div>
            <p className="text-sm text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </section>

      <Card className="bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Processing Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              pending: { label: "Pending", color: "hsl(var(--primary))" },
              approved: { label: "Approved", color: "hsl(var(--accent))" },
            }}
            className="h-[320px]"
          >
            <AreaChart data={data}>
              <defs>
                <linearGradient id="fillPrimary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillAccent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeOpacity={0.2} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area dataKey="pending" type="monotone" stroke="hsl(var(--primary))" fill="url(#fillPrimary)" fillOpacity={0.4} />
              <Area dataKey="approved" type="monotone" stroke="hsl(var(--accent))" fill="url(#fillAccent)" fillOpacity={0.4} />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
