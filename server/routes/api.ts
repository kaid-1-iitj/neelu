import { Router } from "express";
import { requireAuth, hashPassword, comparePassword, AuthUser, generateToken } from "../middleware/auth";
import { societies as societiesCol, bills as billsCol, users as usersCol } from "../db/collections";
import { z } from "zod";
import type { BillStatus, CreateRemarkRequest, SocietyDoc, CreateBillRequest, CreateSocietyRequest, UpdateBillStatusRequest, SignInRequest, SignUpRequest, ApiResponse } from "@shared/api";
import { ObjectId } from "mongodb";

const router = Router();

// Helpers
function toId(id: string) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

function serialize<T extends { _id: any }>(doc: T) {
  const { _id, ...rest } = doc;
  return { id: String(_id), ...rest } as any;
}

// Auth Endpoints
router.post("/signup", async (req, res) => {
  const Schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().optional(),
    role: z.enum(["Admin", "Manager", "Treasurer", "Secretary", "President", "Agent"] as const).default("Agent"),
  }) satisfies z.ZodType<SignUpRequest>;
  const body = Schema.parse(req.body);

  // Agents cannot sign up directly; must be created by Admin from Agents tab
  if (body.role === "Agent") {
    return res.status(403).json({ error: "Agents must be created by an Admin" });
  }

  const col = await usersCol();
  const existingUser = await col.findOne({ email: body.email });
  if (existingUser) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const hashedPassword = await hashPassword(body.password);
  const newUser = {
    uid: new ObjectId().toHexString(),
    email: body.email,
    name: body.name,
    role: body.role,
    password: hashedPassword,
    isActive: true,
    createdAt: Date.now(),
  };

  await col.insertOne(newUser as any);
  const user: AuthUser = { uid: newUser.uid, email: newUser.email, name: newUser.name, role: newUser.role };
  const token = generateToken(user);
  return res.status(201).json({ user, token });
});

router.post("/signin", async (req, res) => {
  const Schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }) satisfies z.ZodType<SignInRequest>;
  const body = Schema.parse(req.body);

  const col = await usersCol();
  const user = await col.findOne({ email: body.email });

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const passwordMatch = await comparePassword(body.password, user.password);

  if (!passwordMatch) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

    if (user.role === "Agent" && (user as any).isActive === false) {
    return res.status(403).json({ error: "Agent account is terminated" });
  }

  const authUser: AuthUser = { uid: user.uid, email: user.email, name: (user as any).name, role: user.role };
  const token = generateToken(authUser);
  return res.status(200).json({ user: authUser, token });
});

// Societies
router.post("/societies", requireAuth(["Admin"]), async (req, res) => {
  const Schema = z.object({
    name: z.string().min(1),
    address: z.object({ street: z.string(), city: z.string(), state: z.string(), zip: z.string() }),
    contactInfo: z.object({ phone: z.string().optional(), email: z.string().email().optional() }),
    members: z.array(z.object({ role: z.enum(["Manager", "Treasurer", "Secretary", "President"] as const), email: z.string().email() })),
  }) satisfies z.ZodType<CreateSocietyRequest>;
  const body = Schema.parse(req.body);

  const col = await societiesCol();
  const doc: SocietyDoc & { _id?: any } = {
    name: body.name,
    address: body.address,
    contactInfo: body.contactInfo,
    isActive: true,
    createdAt: Date.now(),
  };
  const result = await col.insertOne(doc as any);
  return res.status(201).json({ id: String(result.insertedId) });
});

router.put("/societies/:id/assign-agent", requireAuth(["Admin"]), async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const Body = z.object({ agentUid: z.string().min(1) });
  const { agentUid } = Body.parse(req.body);
  const col = await societiesCol();
  await col.updateOne({ _id: id }, { $set: { assignedAgentId: agentUid } });
  return res.json({ ok: true });
});

router.put("/societies/:id/unassign-agent", requireAuth(["Admin"]), async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const col = await societiesCol();
  await col.updateOne({ _id: id }, { $unset: { assignedAgentId: "" } });
  return res.json({ ok: true });
});

router.get("/societies", requireAuth(["Admin", "Agent", "Manager", "Treasurer", "Secretary", "President"]), async (_req, res) => {
  const col = await societiesCol();
  const list = await col.find().sort({ createdAt: -1 }).toArray();
  return res.json(list.map(serialize));
});

router.get("/societies/:id", requireAuth(["Admin", "Agent", "Manager", "Treasurer", "Secretary", "President"]), async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const col = await societiesCol();
  const found = await col.findOne({ _id: id });
  if (!found) return res.status(404).json({ error: "Not found" });
  return res.json(serialize(found));
});

// Bills
router.post("/bills", requireAuth(["Admin", "Manager", "Treasurer", "Secretary", "President"]), async (req, res) => {
  const Schema = z.object({
    societyId: z.string().min(1),
    vendorName: z.string().min(1),
    transactionNature: z.string().min(1),
    amount: z.number().positive(),
    dueDate: z.number().int(),
    attachments: z.array(z.object({ fileName: z.string(), fileURL: z.string().url() })).optional(),
  }) satisfies z.ZodType<CreateBillRequest>;
  const body = Schema.parse(req.body);

  const col = await billsCol();
  const doc = {
    societyId: body.societyId,
    vendorName: body.vendorName,
    transactionNature: body.transactionNature,
    amount: body.amount,
    dueDate: body.dueDate,
    status: "Pending" as BillStatus,
    attachments: body.attachments || [],
    submittedBy: (req as any).user?.uid || "unknown",
    createdAt: Date.now(),
    remarks: [] as any[],
  };
  const result = await col.insertOne(doc as any);
  return res.status(201).json({ id: String(result.insertedId) });
});

router.get("/bills", requireAuth(["Admin", "Agent", "Manager", "Treasurer", "Secretary", "President"]), async (req, res) => {
  const { societyId, status, q } = req.query as { societyId?: string; status?: string; q?: string };
  const filter: any = {};
  if (societyId) filter.societyId = societyId;
  if (status) filter.status = status;
  if (q) filter.vendorName = { $regex: q, $options: "i" };
  const col = await billsCol();
  const list = await col.find(filter).sort({ createdAt: -1 }).toArray();
  return res.json(list.map(serialize));
});

router.get("/bills/society/:societyId", requireAuth(["Admin", "Agent", "Manager", "Treasurer", "Secretary", "President"]), async (req, res) => {
  const { societyId } = req.params;
  const col = await billsCol();
  const list = await col.find({ societyId }).sort({ createdAt: -1 }).toArray();
  return res.json(list.map(serialize));
});

router.get("/bills/:billId", requireAuth(["Admin", "Agent", "Manager", "Treasurer", "Secretary", "President"]), async (req, res) => {
  const id = toId(req.params.billId);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const col = await billsCol();
  const found = await col.findOne({ _id: id });
  if (!found) return res.status(404).json({ error: "Not found" });
  return res.json(serialize(found));
});

router.put("/bills/:billId/status", requireAuth(["Admin", "Manager", "Treasurer", "Secretary", "President", "Agent"]), async (req, res) => {
  const id = toId(req.params.billId);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const Body = z.object({ status: z.enum(["Pending", "Under Review", "Clarification Required", "Approved", "Rejected"] as const), remark: z.string().optional() }) satisfies z.ZodType<UpdateBillStatusRequest>;
  const { status, remark } = Body.parse(req.body);

  const col = await billsCol();
  const existing = await col.findOne({ _id: id });
  if (!existing) return res.status(404).json({ error: "Not found" });
  const previousStatus = existing.status as BillStatus;
  const newRemark = {
    text: remark || "",
    authorId: (req as any).user?.uid || "unknown",
    authorRole: (req as any).user?.role || "Agent",
    timestamp: Date.now(),
    previousStatus,
    newStatus: status,
  } satisfies CreateRemarkRequest & { authorId: string; authorRole: string; timestamp: number; previousStatus: BillStatus; newStatus: BillStatus };

  await col.updateOne({ _id: id }, { $set: { status }, $push: { remarks: newRemark as any } });
  return res.json({ ok: true });
});

router.post("/bills/:billId/remarks", requireAuth(["Agent", "Manager", "Treasurer", "Secretary", "President"]), async (req, res) => {
  const id = toId(req.params.billId);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const Body = z.object({ text: z.string().min(1) }) satisfies z.ZodType<CreateRemarkRequest>;
  const { text } = Body.parse(req.body);
  const col = await billsCol();
  const existing = await col.findOne({ _id: id });
  if (!existing) return res.status(404).json({ error: "Not found" });
  const previousStatus = existing.status as BillStatus;
  const remark = {
    text,
    authorId: (req as any).user?.uid || "unknown",
    authorRole: (req as any).user?.role || "Agent",
    timestamp: Date.now(),
    previousStatus,
  };
  await col.updateOne({ _id: id }, { $push: { remarks: remark as any } });
  return res.json({ ok: true });
});

// Agents
router.get("/agents", requireAuth(["Admin"]), async (_req, res) => {
  const col = await usersCol();
  const agents = await col.find({ role: "Agent" }).project({ password: 0, _id: 0 }).toArray();
  return res.json(agents);
});

router.post("/agents", requireAuth(["Admin"]), async (req, res) => {
  const Body = z.object({ email: z.string().email(), password: z.string().min(6), name: z.string().optional() });
  const body = Body.parse(req.body);
  const col = await usersCol();
  const existingUser = await col.findOne({ email: body.email });
  if (existingUser) return res.status(409).json({ error: "Email already registered" });
  const hashedPassword = await hashPassword(body.password);
  const doc = {
    uid: new ObjectId().toHexString(),
    email: body.email,
    name: body.name,
    role: "Agent" as const,
    password: hashedPassword,
    isActive: true,
    createdAt: Date.now(),
  };
  await col.insertOne(doc as any);
  return res.status(201).json({ uid: doc.uid, email: doc.email, name: doc.name, role: doc.role, isActive: doc.isActive });
});

router.put("/agents/:uid/terminate", requireAuth(["Admin"]), async (req, res) => {
  const { uid } = req.params;
  const users = await usersCol();
  const result = await users.updateOne({ uid }, { $set: { isActive: false } });
  if (!result.matchedCount) return res.status(404).json({ error: "Agent not found" });
  const societies = await societiesCol();
  await societies.updateMany({ assignedAgentId: uid }, { $unset: { assignedAgentId: "" } });
  return res.json({ ok: true });
});

// Reports (simple counts)
router.get("/reports", requireAuth(["Admin"]), async (_req, res) => {
  const col = await billsCol();
  const [pending, approved] = await Promise.all([
    col.countDocuments({ status: "Pending" }),
    col.countDocuments({ status: "Approved" }),
  ]);
  return res.json({ pending, approved });
});

export default router;
