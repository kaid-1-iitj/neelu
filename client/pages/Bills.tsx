import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { createBill, getBills, getSocieties, updateBillStatus, createSociety, uploadFiles } from "@/lib/api";

const statuses = ["Pending", "Under Review", "Clarification Required", "Approved", "Rejected"] as const;
type BillStatus = typeof statuses[number];

const reviewerRoles = ["Admin", "Agent", "Manager", "Treasurer", "Secretary", "President"] as const;

export default function Bills() {
  const { user } = useAuth();
  const [societies, setSocieties] = useState<any[]>([]);
  const [societyId, setSocietyId] = useState<string>("");
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BillStatus | undefined>(undefined);
  const [reviewBill, setReviewBill] = useState<any | null>(null);
  const [addBillOpen, setAddBillOpen] = useState(false);

  const canReview = !!user && (reviewerRoles as readonly string[]).includes(user.role);

  useEffect(() => {
    getSocieties().then((list) => { setSocieties(list); if (list[0]?.id) setSocietyId(list[0].id); });
  }, []);

  useEffect(() => {
    if (!societyId) return;
    setLoading(true);
    getBills({ societyId })
      .then((list) => setBills(list))
      .finally(() => setLoading(false));
  }, [societyId, addBillOpen]); // Add addBillOpen to dependencies to re-fetch bills when dialog closes

  const filtered = useMemo(() => {
    return bills.filter((b) => (status ? b.status === status : true) && (search ? b.vendorName.toLowerCase().includes(search.toLowerCase()) : true));
  }, [bills, search, status]);

  return (
    <div className="container py-10 space-y-6">
      <Card className="bg-card/70 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-xl">Bills</CardTitle>
          <div className="flex items-center gap-3">
            <div className="w-56">
              <Label className="sr-only">Society</Label>
              <Select value={societyId} onValueChange={(v) => setSocietyId(v)}>
                <SelectTrigger className="bg-background/60">
                  <SelectValue placeholder="Select society" />
                </SelectTrigger>
                <SelectContent>
                  {societies.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Dialog open={addBillOpen} onOpenChange={setAddBillOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">Add New Bill</Button>
              </DialogTrigger>
              <AddBillDialog
                societies={societies}
                canSelectStatus={canReview}
                onSubmit={async (form) => {
                  if (!form.societyId) return;
                  await createBill({
                    societyId: form.societyId,
                    vendorName: form.vendorName,
                    transactionNature: form.transactionNature,
                    amount: form.amount,
                    dueDate: form.dueDate.getTime(),
                    attachments: form.attachments.filter(att => att.fileName && att.fileURL),
                  });
                  setAddBillOpen(false); // Close the dialog on successful submission
                }}
              />
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <Label htmlFor="search" className="sr-only">Search</Label>
              <Input
                id="search"
                placeholder="Search by vendor name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-background/60"
              />
            </div>
            <div className="w-full md:w-60">
              <Label className="sr-only">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as BillStatus)}>
                <SelectTrigger className="bg-background/60">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Nature</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attachments</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b) => (
                  <TableRow key={b.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{b.vendorName}</TableCell>
                    <TableCell>{b.transactionNature}</TableCell>
                    <TableCell className="text-right">₹{Number(b.amount).toLocaleString()}</TableCell>
                    <TableCell>{format(new Date(b.dueDate), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
                        {b.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {b.attachments && b.attachments.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {b.attachments.map((attachment: any, index: number) => (
                            <a
                              key={index}
                              href={attachment.fileURL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline text-xs"
                            >
                              {attachment.fileName || `Attachment ${index + 1}`}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">No attachments</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {canReview ? (
                        <Button variant="secondary" size="sm" className="bg-secondary" onClick={() => setReviewBill(b)}>Review</Button>
                      ) : (
                        <Button variant="secondary" size="sm" className="bg-secondary" disabled>
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">No bills</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {reviewBill ? (
        <ReviewBillDialog
          bill={reviewBill}
          onClose={() => setReviewBill(null)}
          onSubmit={async (payload) => {
            await updateBillStatus(reviewBill.id, { status: payload.newStatus, remark: payload.remark });
            const list = await getBills({ societyId });
            setBills(list);
            setReviewBill(null);
          }}
        />
      ) : null}
    </div>
  );
}

type NewBillForm = {
  societyId: string;
  vendorName: string;
  transactionNature: string;
  amount: number;
  dueDate: Date;
  attachments: { fileName: string; fileURL: string }[];
};

function AddBillDialog({ onSubmit, canSelectStatus, societies }: { onSubmit: (bill: NewBillForm) => void | Promise<void>; canSelectStatus: boolean; societies: any[] }) {
  const [form, setForm] = useState<NewBillForm>({
    societyId: "",
    vendorName: "",
    transactionNature: "",
    amount: 0,
    dueDate: new Date(),
    attachments: [],
  });

  useEffect(() => {
    if (!form.societyId && societies[0]?.id) setForm((f) => ({ ...f, societyId: societies[0].id }));
  }, [societies, form.societyId]);

  return (
    <DialogContent className="bg-background/95 border-border/60">
      <DialogHeader>
        <DialogTitle>Add New Bill</DialogTitle>
      </DialogHeader>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(form);
        }}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-2 md:col-span-2">
            <Label>Society</Label>
            <Select value={form.societyId} onValueChange={(v) => setForm({ ...form, societyId: v })}>
              <SelectTrigger className="bg-background/60">
                <SelectValue placeholder="Select society" />
              </SelectTrigger>
              <SelectContent>
                {societies.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vendor">Vendor Name</Label>
            <Input id="vendor" value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} required className="bg-background/60" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nature">Transaction Nature</Label>
            <Input id="nature" value={form.transactionNature} onChange={(e) => setForm({ ...form, transactionNature: e.target.value })} required className="bg-background/60" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} required min={0} className="bg-background/60" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="due">Due Date</Label>
            <Input id="due" type="date" value={format(form.dueDate, "yyyy-MM-dd")} onChange={(e) => setForm({ ...form, dueDate: new Date(e.target.value) })} required className="bg-background/60" />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label>Attachments</Label>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                if (files.length === 0) return;
                try {
                  const urls = await uploadFiles(files);
                  const newAttachments = urls.map((u, i) => ({ fileName: files[i]?.name || `File ${i+1}`, fileURL: u }));
                  setForm({ ...form, attachments: [...form.attachments, ...newAttachments] });
                } catch (err) {
                  console.error(err);
                }
              }}
              className="block text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/90"
            />
            {form.attachments.length > 0 ? (
              <div className="flex flex-col gap-2 mt-2">
                {form.attachments.map((att, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 text-sm">
                    <a href={att.fileURL} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                      {att.fileName}
                    </a>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setForm({ ...form, attachments: form.attachments.filter((_, i) => i !== idx) })}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : null }
          </div>
          {!canSelectStatus ? (
            <div className="md:col-span-2 text-xs text-muted-foreground">Status will start as Pending. Reviewers can update.</div>
          ) : null}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" className="bg-accent hover:bg-accent/90">Submit Bill</Button>
        </div>
      </form>
    </DialogContent>
  );
}

function ReviewBillDialog({ bill, onSubmit, onClose }: { bill: any; onSubmit: (p: { newStatus: BillStatus; remark: string }) => void | Promise<void>; onClose: () => void }) {
  const [newStatus, setNewStatus] = useState<BillStatus>(bill.status === "Pending" ? "Under Review" : bill.status);
  const [remark, setRemark] = useState("");

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bg-background/95 border-border/60">
        <DialogHeader>
          <DialogTitle>Review Bill</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as BillStatus)}>
              <SelectTrigger className="bg-background/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Remark</Label>
            <Textarea value={remark} onChange={(e) => setRemark(e.target.value)} className="bg-background/60" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" className="bg-secondary" onClick={onClose}>Cancel</Button>
            <Button className="bg-primary" onClick={() => onSubmit({ newStatus, remark })}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

