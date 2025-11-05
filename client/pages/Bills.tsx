import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { createBill, getBills, getSocieties, updateBillStatus, uploadFiles, addBillRemark, getBillRemarks, getAdvancePayments, createAdvancePayment, updateAdvancePayment } from "@/lib/api";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const statuses = ["Pending", "Under Review", "Clarification Required", "Approved", "Rejected"] as const;
type BillStatus = typeof statuses[number];

const advancePaymentStatuses = ["Pending", "Approved", "Rejected", "Partially Approved"] as const;
type AdvancePaymentStatus = typeof advancePaymentStatuses[number];

const reviewerRoles = ["Admin", "Agent", "Treasurer", "Secretary", "President"] as const;

export default function Bills() {
  const { user } = useAuth();
  const [societies, setSocieties] = useState<any[]>([]);
  const [societyId, setSocietyId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("bills");
  const [bills, setBills] = useState<any[]>([]);

  const canReview = !!user && (reviewerRoles as readonly string[]).includes(user.role);

  useEffect(() => {
    getSocieties().then((list) => { setSocieties(list); if (list[0]?.id) setSocietyId(list[0].id); });
  }, []);

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
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="bills">Bills</TabsTrigger>
              <TabsTrigger value="advance-payments">Advance Payments</TabsTrigger>
              <TabsTrigger value="others">Others</TabsTrigger>
            </TabsList>
            <TabsContent value="bills" className="mt-6">
              <BillsTab
                societyId={societyId}
                societies={societies}
                canReview={canReview}
                bills={bills}
                setBills={setBills}
              />
            </TabsContent>
            <TabsContent value="advance-payments" className="mt-6">
              <AdvancePaymentsTab
                societyId={societyId}
                societies={societies}
                canReview={canReview}
                bills={bills}
              />
            </TabsContent>
            <TabsContent value="others" className="mt-6">
              <OthersTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Bills Tab Component
function BillsTab({ societyId, societies, canReview, bills: billsProp, setBills: setBillsProp }: { societyId: string; societies: any[]; canReview: boolean; bills?: any[]; setBills?: (bills: any[]) => void }) {
  const [localBills, setLocalBills] = useState<any[]>([]);
  const bills = billsProp || localBills;
  const setBills = setBillsProp || setLocalBills;
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BillStatus | undefined>(undefined);
  const [reviewBill, setReviewBill] = useState<any | null>(null);
  const [addBillOpen, setAddBillOpen] = useState(false);
  const [remarksBillId, setRemarksBillId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<Array<{ text: string; authorId: string; authorName: string; authorRole: string; timestamp: number; previousStatus?: string; newStatus?: string }>>([]);
  const [remarksLoading, setRemarksLoading] = useState(false);
  const [newRemark, setNewRemark] = useState("");

  useEffect(() => {
    if (!societyId) return;
    setLoading(true);
    getBills({ societyId })
      .then((list) => {
        setBills(list);
      })
      .finally(() => setLoading(false));
  }, [societyId, addBillOpen]);

  const filtered = useMemo(() => {
    return bills.filter((b) => (status ? b.status === status : true) && (search ? b.vendorName.toLowerCase().includes(search.toLowerCase()) : true));
  }, [bills, search, status]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Dialog open={addBillOpen} onOpenChange={setAddBillOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">Add New Bill</Button>
          </DialogTrigger>
          <AddBillDialog
            societies={societies}
            canSelectStatus={canReview}
            onSubmit={async (form) => {
              if (!form.societyId) return;
              try {
                await createBill({
                  societyId: form.societyId,
                  vendorName: form.vendorName,
                  transactionNature: form.transactionNature,
                  amount: form.amount,
                  dueDate: form.dueDate.getTime(),
                  attachments: form.attachments.filter(att => att.fileName && att.fileURL),
                });
                setAddBillOpen(false);
                // Reload bills list
                const list = await getBills({ societyId });
                setBills(list);
              } catch (error: any) {
                console.error("Failed to create bill:", error);
                alert(error.message || "Failed to create bill. Please check the console for details.");
              }
            }}
          />
        </Dialog>
      </div>
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
              <TableHead>Bill ID</TableHead>
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
                <TableCell className="font-mono text-xs font-medium">{b.id}</TableCell>
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
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={async () => {
                      setRemarksBillId(b.id);
                      setRemarksLoading(true);
                      try {
                        const list = await getBillRemarks(b.id);
                        setRemarks(list);
                      } finally {
                        setRemarksLoading(false);
                      }
                    }}>Remarks</Button>
                    {canReview ? (
                      <Button variant="secondary" size="sm" className="bg-secondary" onClick={() => setReviewBill(b)}>Review</Button>
                    ) : (
                      <Button variant="secondary" size="sm" className="bg-secondary" disabled>View</Button>
                    )}
                  </div>
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

      {remarksBillId ? (
        <Dialog open onOpenChange={(open) => { if (!open) { setRemarksBillId(null); setRemarks([]); setNewRemark(""); } }}>
          <DialogContent className="bg-background/95 border-border/60 max-w-2xl">
            <DialogHeader>
              <DialogTitle>Remarks</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="text-sm text-muted-foreground">All remarks on this bill. Notifications are sent when new remarks are added.</div>
              <Separator />
              <ScrollArea className="h-64 pr-3">
                <div className="flex flex-col gap-3">
                  {remarksLoading ? (
                    <div className="text-sm text-muted-foreground">Loading...</div>
                  ) : remarks.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No remarks yet.</div>
                  ) : (
                    remarks
                      .sort((a, b) => a.timestamp - b.timestamp)
                      .map((r, idx) => (
                        <div key={idx} className="rounded-md border border-border/60 p-3 bg-card/60">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div>
                              <span className="font-medium text-foreground">{r.authorName}</span>
                              <span> ({r.authorRole})</span>
                            </div>
                            <div>{new Date(r.timestamp).toLocaleString()}</div>
                          </div>
                          <div className="mt-2 text-sm whitespace-pre-wrap">{r.text}</div>
                          {(r.previousStatus || r.newStatus) ? (
                            <div className="mt-2 text-xs text-muted-foreground">{r.previousStatus ? `Previous: ${r.previousStatus}` : ""}{r.previousStatus && r.newStatus ? " → " : ""}{r.newStatus ? `New: ${r.newStatus}` : ""}</div>
                          ) : null}
                        </div>
                      ))
                  )}
                </div>
              </ScrollArea>
              <form
                className="flex items-center gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!remarksBillId || !newRemark.trim()) return;
                  const text = newRemark.trim();
                  await addBillRemark(remarksBillId, text);
                  setNewRemark("");
                  const list = await getBillRemarks(remarksBillId);
                  setRemarks(list);
                }}
              >
                <Input
                  placeholder="Add a remark..."
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                  className="bg-background/60"
                />
                <Button type="submit" className="bg-primary">Add</Button>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

// Advance Payments Tab Component
function AdvancePaymentsTab({ societyId, societies, canReview, bills }: { societyId: string; societies: any[]; canReview: boolean; bills: any[] }) {
  const [advancePayments, setAdvancePayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [reviewPayment, setReviewPayment] = useState<any | null>(null);

  useEffect(() => {
    if (!societyId) return;
    setLoading(true);
    getAdvancePayments({ societyId })
      .then((list) => setAdvancePayments(list))
      .finally(() => setLoading(false));
  }, [societyId, requestDialogOpen]);

  const calculateRemaining = (payment: any) => {
    if (!payment.approvedAmount && !payment.receivedAmount) return payment.totalAmountNeeded;
    const approved = payment.approvedAmount || 0;
    const received = payment.receivedAmount || 0;
    return payment.totalAmountNeeded - Math.max(approved, received);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">Request Advance Payment</Button>
          </DialogTrigger>
          <RequestAdvancePaymentDialog
            societyId={societyId}
            societies={societies}
            bills={bills}
            onSubmit={async (form) => {
              await createAdvancePayment({
                societyId: form.societyId,
                billId: form.billId,
                totalAmountNeeded: form.totalAmountNeeded,
                requestedAmount: form.requestedAmount,
                remarks: form.remarks,
              });
              setRequestDialogOpen(false);
            }}
          />
        </Dialog>
      </div>

      <div className="rounded-lg border border-border/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill ID</TableHead>
              <TableHead>Total Amount Needed</TableHead>
              <TableHead className="text-right">Requested Amount</TableHead>
              <TableHead className="text-right">Approved Amount</TableHead>
              <TableHead className="text-right">Received Amount</TableHead>
              <TableHead className="text-right">Remaining Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {advancePayments.map((payment) => {
              const remaining = calculateRemaining(payment);
              return (
                <TableRow key={payment.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs">
                    {payment.billId ? (
                      <span className="text-blue-600 font-medium">{payment.billId}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">₹{Number(payment.totalAmountNeeded).toLocaleString()}</TableCell>
                  <TableCell className="text-right">₹{Number(payment.requestedAmount).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {payment.approvedAmount ? `₹${Number(payment.approvedAmount).toLocaleString()}` : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.receivedAmount ? `₹${Number(payment.receivedAmount).toLocaleString()}` : "-"}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ₹{remaining.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
                      {payment.status}
                    </span>
                  </TableCell>
                  <TableCell>{format(new Date(payment.createdAt), "dd MMM yyyy")}</TableCell>
                  <TableCell className="text-right">
                    {canReview && payment.status === "Pending" ? (
                      <Button variant="secondary" size="sm" className="bg-secondary" onClick={() => setReviewPayment(payment)}>
                        Review
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        View
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {advancePayments.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-6">
                  No advance payment requests
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      {reviewPayment ? (
        <ReviewAdvancePaymentDialog
          payment={reviewPayment}
          onClose={() => setReviewPayment(null)}
          onSubmit={async (payload) => {
            await updateAdvancePayment(reviewPayment.id, payload);
            const list = await getAdvancePayments({ societyId });
            setAdvancePayments(list);
            setReviewPayment(null);
          }}
        />
      ) : null}
    </div>
  );
}

// Others Tab Component (Notes Section)
function OthersTab() {
  const [notes, setNotes] = useState<string>("");
  const [savedNotes, setSavedNotes] = useState<string[]>([]);

  const handleSaveNote = () => {
    if (notes.trim()) {
      setSavedNotes([...savedNotes, notes.trim()]);
      setNotes("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Add your notes here..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="bg-background/60 min-h-[200px]"
        />
        <Button onClick={handleSaveNote} className="bg-primary hover:bg-primary/90">
          Save Note
        </Button>
      </div>
      {savedNotes.length > 0 && (
        <div className="space-y-2">
          <Label>Saved Notes</Label>
          <div className="space-y-2">
            {savedNotes.map((note, idx) => (
              <Card key={idx} className="bg-card/60">
                <CardContent className="pt-4">
                  <p className="text-sm whitespace-pre-wrap">{note}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => setSavedNotes(savedNotes.filter((_, i) => i !== idx))}
                  >
                    Delete
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Dialog Components
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!form.societyId && societies[0]?.id) setForm((f) => ({ ...f, societyId: societies[0].id }));
  }, [societies, form.societyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.societyId || !form.vendorName || !form.transactionNature || form.amount <= 0) {
      alert("Please fill in all required fields");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(form);
    } catch (error) {
      console.error("Error in onSubmit:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="bg-background/95 border-border/60">
      <DialogHeader>
        <DialogTitle>Add New Bill</DialogTitle>
      </DialogHeader>
      <form
        className="grid gap-4"
        onSubmit={handleSubmit}
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
            ) : null}
          </div>
          {!canSelectStatus ? (
            <div className="md:col-span-2 text-xs text-muted-foreground">Status will start as Pending. Reviewers can update.</div>
          ) : null}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button 
            type="submit" 
            className="bg-accent hover:bg-accent/90"
            disabled={isSubmitting || !form.societyId || !form.vendorName || !form.transactionNature || form.amount <= 0}
          >
            {isSubmitting ? "Submitting..." : "Submit Bill"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

function ReviewBillDialog({ bill, onSubmit, onClose }: { bill: any; onSubmit: (p: { newStatus: BillStatus; remark: string }) => void | Promise<void>; onClose: () => void }) {
  const { user } = useAuth();
  
  // Manager cannot approve bills
  const canApprove = user?.role !== "Manager";
  const availableStatuses = canApprove ? statuses : statuses.filter(s => s !== "Approved");
  
  // Initialize status - if Manager and status is Approved, default to Under Review
  const initialStatus = (user?.role === "Manager" && bill.status === "Approved") 
    ? "Under Review" 
    : (bill.status === "Pending" ? "Under Review" : bill.status);
  
  const [newStatus, setNewStatus] = useState<BillStatus>(initialStatus);
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
                {availableStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!canApprove && (
              <div className="text-xs text-muted-foreground">Managers cannot approve bills</div>
            )}
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

type AdvancePaymentForm = {
  societyId: string;
  billId?: string;
  totalAmountNeeded: number;
  requestedAmount: number;
  remarks?: string;
};

function RequestAdvancePaymentDialog({ societyId, societies, bills, onSubmit }: { societyId: string; societies: any[]; bills: any[]; onSubmit: (form: AdvancePaymentForm) => void | Promise<void> }) {
  const [form, setForm] = useState<AdvancePaymentForm>({
    societyId: societyId || "",
    billId: "",
    totalAmountNeeded: 0,
    requestedAmount: 0,
    remarks: "",
  });

  useEffect(() => {
    if (!form.societyId && societies[0]?.id) setForm((f) => ({ ...f, societyId: societies[0].id }));
  }, [societies, form.societyId]);

  return (
    <DialogContent className="bg-background/95 border-border/60">
      <DialogHeader>
        <DialogTitle>Request Advance Payment</DialogTitle>
      </DialogHeader>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(form);
        }}
      >
          <div className="grid gap-4">
            <div className="grid gap-2">
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
              <Label htmlFor="bill-id">Link to Bill (Optional)</Label>
              <Select value={form.billId || ""} onValueChange={(v) => setForm({ ...form, billId: v || undefined })}>
                <SelectTrigger className="bg-background/60">
                  <SelectValue placeholder="Select a bill to link (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {bills.filter(b => b.societyId === form.societyId).map((bill) => (
                    <SelectItem key={bill.id} value={bill.id}>
                      {bill.id} - {bill.vendorName} (₹{Number(bill.amount).toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          <div className="grid gap-2">
            <Label htmlFor="total-amount">Total Amount Needed</Label>
            <Input
              id="total-amount"
              type="number"
              value={form.totalAmountNeeded}
              onChange={(e) => setForm({ ...form, totalAmountNeeded: Number(e.target.value) })}
              required
              min={0}
              className="bg-background/60"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="requested-amount">Requested Amount</Label>
            <Input
              id="requested-amount"
              type="number"
              value={form.requestedAmount}
              onChange={(e) => setForm({ ...form, requestedAmount: Number(e.target.value) })}
              required
              min={0}
              max={form.totalAmountNeeded}
              className="bg-background/60"
            />
            {form.totalAmountNeeded > 0 && (
              <div className="text-xs text-muted-foreground">
                Requested: ₹{form.requestedAmount.toLocaleString()} / Total: ₹{form.totalAmountNeeded.toLocaleString()}
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="remarks">Remarks (Optional)</Label>
            <Textarea
              id="remarks"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              className="bg-background/60"
              placeholder="Add any additional remarks..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" className="bg-primary hover:bg-primary/90">Submit Request</Button>
        </div>
      </form>
    </DialogContent>
  );
}

function ReviewAdvancePaymentDialog({ payment, onSubmit, onClose }: { payment: any; onSubmit: (p: { status: AdvancePaymentStatus; approvedAmount?: number; receivedAmount?: number; remarks?: string }) => void | Promise<void>; onClose: () => void }) {
  const { user } = useAuth();
  
  // Manager cannot approve advance payments
  const canApprove = user?.role !== "Manager";
  const availableStatuses = canApprove ? advancePaymentStatuses : advancePaymentStatuses.filter(s => s !== "Approved" && s !== "Partially Approved");
  
  // Initialize status - if Manager and status is Approved/Partially Approved, default to Pending
  const initialStatus = (user?.role === "Manager" && (payment.status === "Approved" || payment.status === "Partially Approved"))
    ? "Pending"
    : payment.status;
  
  const [status, setStatus] = useState<AdvancePaymentStatus>(initialStatus);
  const [approvedAmount, setApprovedAmount] = useState<number>(payment.approvedAmount || payment.requestedAmount);
  const [receivedAmount, setReceivedAmount] = useState<number>(payment.receivedAmount || 0);
  const [remarks, setRemarks] = useState("");

  const remaining = payment.totalAmountNeeded - (receivedAmount || 0);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bg-background/95 border-border/60">
        <DialogHeader>
          <DialogTitle>Review Advance Payment</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AdvancePaymentStatus)}>
              <SelectTrigger className="bg-background/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!canApprove && (
              <div className="text-xs text-muted-foreground">Managers cannot approve advance payments</div>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="approved-amount">Approved Amount</Label>
            <Input
              id="approved-amount"
              type="number"
              value={approvedAmount}
              onChange={(e) => setApprovedAmount(Number(e.target.value))}
              min={0}
              max={payment.totalAmountNeeded}
              className="bg-background/60"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="received-amount">Received Amount</Label>
            <Input
              id="received-amount"
              type="number"
              value={receivedAmount}
              onChange={(e) => setReceivedAmount(Number(e.target.value))}
              min={0}
              max={payment.totalAmountNeeded}
              className="bg-background/60"
            />
          </div>
          <div className="p-3 bg-muted/30 rounded-md">
            <div className="text-sm text-muted-foreground">Total Amount Needed: ₹{payment.totalAmountNeeded.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground mt-1">Remaining Amount: ₹{remaining.toLocaleString()}</div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="review-remarks">Remarks</Label>
            <Textarea
              id="review-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="bg-background/60"
              placeholder="Add remarks..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" className="bg-secondary" onClick={onClose}>Cancel</Button>
            <Button className="bg-primary" onClick={() => onSubmit({ status, approvedAmount, receivedAmount, remarks })}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
