import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Reports() {
  return (
    <div className="container py-10 space-y-6">
      <Card className="bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Generate Reports</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="grid gap-2">
            <Label>Society</Label>
            <Input placeholder="All" className="bg-background/60" />
          </div>
          <div className="grid gap-2">
            <Label>Agent</Label>
            <Input placeholder="All" className="bg-background/60" />
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select>
              <SelectTrigger className="bg-background/60">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                {["Pending", "Under Review", "Clarification Required", "Approved", "Rejected"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Date Range</Label>
            <Input type="text" placeholder="This month" className="bg-background/60" />
          </div>
          <div className="md:col-span-4 flex gap-3 justify-end">
            <Button className="bg-primary">Run</Button>
            <Button variant="secondary" className="bg-secondary">Export CSV</Button>
            <Button variant="secondary" className="bg-secondary">Export PDF</Button>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Results will appear here. Connect Firebase and backend APIs to power this page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
