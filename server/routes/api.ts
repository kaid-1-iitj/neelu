import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth, hashPassword, comparePassword, AuthUser, generateToken } from "../middleware/auth";
import { societies as societiesCol, bills as billsCol, users as usersCol, memberInvitations as invitationsCol, otpVerifications as otpCol } from "../db/collections";
import { z } from "zod";
import type { BillStatus, CreateRemarkRequest, SocietyDoc, CreateBillRequest, CreateSocietyRequest, UpdateBillStatusRequest, SignInRequest, SignUpRequest, ApiResponse, CreateAgentRequest, UpdateAgentSocietiesRequest, TerminateAgentRequest, InviteMemberRequest, AcceptInvitationRequest, UpdateSocietyRequest, AddSocietyMemberRequest, RemoveSocietyMemberRequest, SocietyMemberInfo, SendOTPRequest, VerifyOTPRequest } from "@shared/api";
import { ObjectId } from "mongodb";
import crypto from "crypto";
import { sendOTP, verifyOTP, isOTPVerified } from "../services/otpService";
import { sendExpenseNotification } from "../services/emailService";

const router = Router();

// File upload setup (disk storage)
const uploadsRoot = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsRoot),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${unique}-${safeName}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// OTP Verification Endpoints
router.post("/send-otp", async (req, res) => {
  const Schema = z.object({
    email: z.string().email(),
    phone: z.string().optional(),
  });

  const result = Schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "Invalid request body", details: result.error.issues });
  }

  const response = await sendOTP({
    email: result.data.email,
    phone: result.data.phone,
  });
  if (response.success) {
    return res.json({ message: response.message });
  } else {
    return res.status(400).json({ error: response.message });
  }
});

router.post("/verify-otp", async (req, res) => {
  const Schema = z.object({
    email: z.string().email(),
    otp: z.string().length(6),
  });

  const result = Schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "Invalid request body", details: result.error.issues });
  }

  const response = await verifyOTP({
    email: result.data.email,
    otp: result.data.otp,
  });
  if (response.success) {
    return res.json({ message: response.message });
  } else {
    return res.status(400).json({ error: response.message });
  }
});

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

async function getUserAccessibleSocieties(user: any): Promise<string[]> {
  const usersCollection = await usersCol();
  const userDoc = await usersCollection.findOne({ uid: user.uid });
  
  if (!userDoc) return [];
  
  // Admin can see all societies
  if (userDoc.role === "Admin") {
    const societiesCollection = await societiesCol();
    const societies = await societiesCollection.find({}).toArray();
    return societies.map(s => String(s._id));
  }
  
  // Agents can see their assigned societies
  if (userDoc.role === "Agent") {
    return userDoc.assignedSocieties || [];
  }
  
  // Society members can see their own society
  if (userDoc.associatedSocietyId) {
    return [userDoc.associatedSocietyId];
  }
  
  return [];
}

// Auth Endpoints
router.post("/signup", async (req, res) => {
  const Schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().optional(),
    role: z.enum(["Admin", "Manager", "Treasurer", "Secretary", "President"] as const).default("Manager"),
    otp: z.string().length(6),
  });
  
  const result = Schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ 
      error: "Invalid request body", 
      details: result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    });
  }
  
  const body = result.data;

  // Verify OTP from request
  const otpVerificationResult = await verifyOTP({
    email: body.email,
    otp: body.otp,
  });
  
  if (!otpVerificationResult.success) {
    return res.status(400).json({ error: otpVerificationResult.message });
  }

  const col = await usersCol();
  const existingUser = await col.findOne({ email: body.email });
  if (existingUser) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const hashedPassword = await hashPassword(body.password);
  const newUser = {
    uid: new ObjectId().toHexString(), // Generate a unique ID for the user
    email: body.email,
    name: body.name || "",
    role: body.role,
    password: hashedPassword,
    isEmailVerified: true, // Mark as verified since OTP was verified
    isActive: true,
    createdAt: Date.now(),
  };

  await col.insertOne(newUser);
  
  const user: AuthUser = { uid: newUser.uid, email: newUser.email, name: newUser.name, role: newUser.role };
  const token = generateToken(user);
  return res.status(201).json({ user, token });
});

router.post("/signin", async (req, res) => {
  const Schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });
  
  const result = Schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ 
      error: "Invalid request body", 
      details: result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    });
  }
  
  const body = result.data;

  const col = await usersCol();
  const user = await col.findOne({ email: body.email });

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const passwordMatch = await comparePassword(body.password, user.password);

  if (!passwordMatch) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const authUser: AuthUser = { uid: user.uid, email: user.email, name: user.name, role: user.role };
  const token = generateToken(authUser);
  return res.status(200).json({ user: authUser, token });
});

// Agent Management Endpoints
router.post("/agents", requireAuth(["Admin"]), async (req, res) => {
  const Schema = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    assignedSocieties: z.array(z.string()).optional().default([]),
  });
  const body = Schema.parse(req.body);

  const col = await usersCol();
  const existingUser = await col.findOne({ email: body.email });
  if (existingUser) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const hashedPassword = await hashPassword("temp123"); // Temporary password
  const newAgent = {
    uid: new ObjectId().toHexString(),
    email: body.email,
    name: body.name,
    role: "Agent" as const,
    password: hashedPassword,
    assignedSocieties: body.assignedSocieties || [],
    isEmailVerified: false,
    isActive: true,
    createdBy: (req as any).user?.uid,
    createdAt: Date.now(),
  };

  await col.insertOne(newAgent);
  return res.status(201).json({ 
    success: true, 
    message: "Agent created successfully. They will receive an email to set their password.",
    data: { agentId: newAgent.uid }
  });
});

router.get("/agents", requireAuth(["Admin"]), async (_req, res) => {
  const col = await usersCol();
  const agents = await col.find({ role: "Agent" }).sort({ createdAt: -1 }).toArray();
  return res.json(agents.map(serialize));
});

router.put("/agents/:agentId/societies", requireAuth(["Admin"]), async (req, res) => {
  const agentId = req.params.agentId;
  const Schema = z.object({
    assignedSocieties: z.array(z.string()),
  });
  const body = Schema.parse(req.body);

  const col = await usersCol();
  const agent = await col.findOne({ uid: agentId, role: "Agent" });
  if (!agent) {
    return res.status(404).json({ error: "Agent not found" });
  }

  await col.updateOne({ uid: agentId }, { $set: { assignedSocieties: body.assignedSocieties } });
  return res.json({ success: true, message: "Agent societies updated successfully" });
});

router.put("/agents/:agentId/terminate", requireAuth(["Admin"]), async (req, res) => {
  const agentId = req.params.agentId;
  const Schema = z.object({
    reason: z.string().optional(),
  });
  const body = Schema.parse(req.body);

  const col = await usersCol();
  const agent = await col.findOne({ uid: agentId, role: "Agent" });
  if (!agent) {
    return res.status(404).json({ error: "Agent not found" });
  }

  await col.updateOne({ uid: agentId }, { 
    $set: { 
      isActive: false, 
      terminatedAt: Date.now(),
      assignedSocieties: [] // Remove all society assignments
    } 
  });
  return res.json({ success: true, message: "Agent terminated successfully" });
});

// Societies
router.post("/societies", requireAuth(["Admin"]), async (req, res) => {
  const Schema = z.object({
    name: z.string().min(1),
    address: z.object({ 
      street: z.string().min(1), 
      city: z.string().min(1), 
      state: z.string().min(1), 
      zip: z.string().min(1) 
    }).strict(),
    contactInfo: z.object({ 
      phone: z.string().optional(), 
      email: z.string().email().optional() 
    }),
    members: z.array(z.object({ 
      role: z.enum(["Manager", "Treasurer", "Secretary", "President"] as const), 
      email: z.string().email() 
    })),
  });
  const body = Schema.parse(req.body);

  const col = await societiesCol();
  const doc: SocietyDoc = {
    name: body.name,
    address: body.address as any,
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

router.get("/societies", requireAuth(["Admin", "Agent", "Manager", "Treasurer", "Secretary", "President"]), async (req, res) => {
  const user = (req as any).user;
  const accessibleSocieties = await getUserAccessibleSocieties(user);
  
  if (accessibleSocieties.length === 0) {
    return res.json([]);
  }
  
  const col = await societiesCol();
  const list = await col.find({ 
    _id: { $in: accessibleSocieties.map(id => new ObjectId(id)) }
  }).sort({ createdAt: -1 }).toArray();
  return res.json(list.map(serialize));
});

router.get("/societies/:id", requireAuth(["Admin", "Agent", "Manager", "Treasurer", "Secretary", "President"]), async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  
  const user = (req as any).user;
  const accessibleSocieties = await getUserAccessibleSocieties(user);
  
  if (!accessibleSocieties.includes(String(id))) {
    return res.status(403).json({ error: "Access denied to this society" });
  }
  
  const col = await societiesCol();
  const found = await col.findOne({ _id: id });
  if (!found) return res.status(404).json({ error: "Not found" });
  return res.json(serialize(found));
});

// Society Management (Admin only)
router.put("/societies/:id", requireAuth(["Admin"]), async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const Schema = z.object({
    name: z.string().min(1).optional(),
    address: z.object({
      street: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
      zip: z.string().min(1),
    }).optional(),
    contactInfo: z.object({
      phone: z.string().optional(),
      email: z.string().email().optional(),
    }).optional(),
    isActive: z.boolean().optional(),
  }).strict();

  const result = Schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "Invalid request body", details: result.error.issues });
  }

  const col = await societiesCol();
  const updateData = result.data;
  
  // Convert the update data to match MongoDB's expected format
  const mongoUpdateData: any = {};
  if (updateData.name !== undefined) mongoUpdateData.name = updateData.name;
  if (updateData.address !== undefined) mongoUpdateData.address = updateData.address;
  if (updateData.contactInfo !== undefined) mongoUpdateData.contactInfo = updateData.contactInfo;
  if (updateData.isActive !== undefined) mongoUpdateData.isActive = updateData.isActive;
  
  const updated = await col.updateOne({ _id: id }, { $set: mongoUpdateData });
  if (updated.matchedCount === 0) {
    return res.status(404).json({ error: "Society not found" });
  }

  const updatedSociety = await col.findOne({ _id: id });
  return res.json(serialize(updatedSociety!));
});

router.get("/societies/:id/members", requireAuth(["Admin"]), async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const usersCollection = await usersCol();
  const members = await usersCollection.find({ 
    associatedSocietyId: String(id),
    role: { $in: ["Manager", "Treasurer", "Secretary", "President"] }
  }).toArray();

  const memberInfo = members.map(member => ({
    userId: member.uid,
    email: member.email,
    name: member.name,
    role: member.role,
    isActive: member.isActive,
    joinedAt: member.createdAt
  }));

  return res.json(memberInfo);
});

router.post("/societies/:id/members", requireAuth(["Admin"]), async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const Schema = z.object({
    email: z.string().email(),
    role: z.enum(["Manager", "Treasurer", "Secretary", "President"]),
    name: z.string().min(1).optional(),
  });

  const result = Schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "Invalid request body", details: result.error.issues });
  }

  const { email, role, name } = result.data;
  const usersCollection = await usersCol();

  // Check if user already exists
  const existingUser = await usersCollection.findOne({ email });
  if (existingUser) {
    if (existingUser.associatedSocietyId) {
      return res.status(409).json({ error: "User is already associated with a society" });
    }
    
    // Update existing user
    await usersCollection.updateOne(
      { email },
      { 
        $set: { 
          associatedSocietyId: String(id),
          role,
          name: name || existingUser.name
        }
      }
    );
  } else {
    // Create new user
    const hashedPassword = await hashPassword("temp123"); // Temporary password
    const newUser = {
      uid: Math.random().toString(36).substring(2, 15),
      email,
      name: name || email.split('@')[0],
      role,
      password: hashedPassword,
      associatedSocietyId: String(id),
      isEmailVerified: false,
      isActive: true,
      createdAt: Date.now(),
    };
    await usersCollection.insertOne(newUser);
  }

  return res.json({ message: "Member added successfully" });
});

router.delete("/societies/:id/members/:userId", requireAuth(["Admin"]), async (req, res) => {
  const societyId = toId(req.params.id);
  const userId = req.params.userId;
  
  if (!societyId) return res.status(400).json({ error: "Invalid society id" });

  const usersCollection = await usersCol();
  
  // Remove society association
  const result = await usersCollection.updateOne(
    { uid: userId, associatedSocietyId: String(societyId) },
    { $unset: { associatedSocietyId: "" } }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ error: "Member not found in this society" });
  }

  return res.json({ message: "Member removed successfully" });
});

// Bills
router.post("/bills", requireAuth(["Admin", "Manager", "Treasurer", "Secretary", "President"]), async (req, res) => {
  const Schema = z.object({
    societyId: z.string().min(1),
    vendorName: z.string().min(1),
    transactionNature: z.string().min(1),
    amount: z.number().positive(),
    dueDate: z.number().int(),
    attachments: z.array(z.object({ 
      fileName: z.string().min(1), 
      fileURL: z.string().url() 
    })).optional(),
  });
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
  
  // Send email notifications
  try {
    const societiesCollection = await societiesCol();
    const society = await societiesCollection.findOne({ _id: new ObjectId(body.societyId) });
    
    if (society) {
      const usersCollection = await usersCol();
      
      // Get society members and assigned agents
      const members = await usersCollection.find({
        $or: [
          { associatedSocietyId: body.societyId },
          { assignedSocieties: body.societyId }
        ],
        isActive: true
      }).toArray();
      
      const recipientEmails = members.map(member => member.email);
      
      if (recipientEmails.length > 0) {
        await sendExpenseNotification(
          society.name,
          {
            vendorName: body.vendorName,
            amount: body.amount,
            transactionNature: body.transactionNature,
            dueDate: body.dueDate,
          },
          recipientEmails
        );
      }
    }
  } catch (error) {
    console.error("Failed to send email notification:", error);
    // Don't fail the request if email fails
  }
  
  return res.status(201).json({ id: String(result.insertedId) });
});

router.get("/bills", requireAuth(["Admin", "Agent", "Manager", "Treasurer", "Secretary", "President"]), async (req, res) => {
  const { societyId, status, q } = req.query as { societyId?: string; status?: string; q?: string };
  const user = (req as any).user;
  const accessibleSocieties = await getUserAccessibleSocieties(user);
  
  if (accessibleSocieties.length === 0) {
    return res.json([]);
  }
  
  const filter: any = {
    societyId: { $in: accessibleSocieties }
  };
  
  if (societyId && accessibleSocieties.includes(societyId)) {
    filter.societyId = societyId;
  }
  if (status) filter.status = status;
  if (q) filter.vendorName = { $regex: q, $options: "i" };
  
  const col = await billsCol();
  const list = await col.find(filter).sort({ createdAt: -1 }).toArray();
  return res.json(list.map(serialize));
});

router.get("/bills/society/:societyId", requireAuth(["Admin", "Agent", "Manager", "Treasurer", "Secretary", "President"]), async (req, res) => {
  const { societyId } = req.params;
  const user = (req as any).user;
  const accessibleSocieties = await getUserAccessibleSocieties(user);
  
  if (!accessibleSocieties.includes(societyId)) {
    return res.status(403).json({ error: "Access denied to this society's bills" });
  }
  
  const col = await billsCol();
  const list = await col.find({ societyId }).sort({ createdAt: -1 }).toArray();
  return res.json(list.map(serialize));
});

router.get("/bills/:billId", requireAuth(["Admin", "Agent", "Manager", "Treasurer", "Secretary", "President"]), async (req, res) => {
  const id = toId(req.params.billId);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  
  const user = (req as any).user;
  const accessibleSocieties = await getUserAccessibleSocieties(user);
  
  const col = await billsCol();
  const found = await col.findOne({ _id: id });
  if (!found) return res.status(404).json({ error: "Not found" });
  
  if (!accessibleSocieties.includes(found.societyId)) {
    return res.status(403).json({ error: "Access denied to this bill" });
  }
  
  return res.json(serialize(found));
});

// Upload endpoint - returns public URL(s)
router.post("/upload", requireAuth(["Admin", "Agent", "Manager", "Treasurer", "Secretary", "President"]), upload.array("files", 5), async (req, res) => {
  try {
    const files = (req as any).files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }
    const urls = files.map(f => `/uploads/${path.basename(f.path)}`);
    return res.json({ urls });
  } catch (error) {
    console.error("Upload failed:", error);
    return res.status(500).json({ error: "Upload failed" });
  }
});

router.put("/bills/:billId/status", requireAuth(["Admin", "Manager", "Treasurer", "Secretary", "President", "Agent"]), async (req, res) => {
  const id = toId(req.params.billId);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const Body = z.object({ 
    status: z.enum(["Pending", "Under Review", "Clarification Required", "Approved", "Rejected"] as const), 
    remark: z.string().optional() 
  });
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
  const Body = z.object({ text: z.string().min(1) });
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

// Member Invitation Endpoints
router.post("/societies/:societyId/invite-member", requireAuth(["Manager", "Treasurer", "Secretary", "President"]), async (req, res) => {
  const societyId = req.params.societyId;
  const Schema = z.object({
    email: z.string().email(),
    role: z.enum(["Manager", "Treasurer", "Secretary", "President"] as const),
  });
  const body = Schema.parse(req.body);

  // Check if user is a member of this society
  const user = (req as any).user;
  const usersCollection = await usersCol();
  const currentUser = await usersCollection.findOne({ uid: user.uid });
  if (!currentUser || currentUser.associatedSocietyId !== societyId) {
    return res.status(403).json({ error: "You can only invite members to your own society" });
  }

  // Check if email is already registered
  const existingUser = await usersCollection.findOne({ email: body.email });
  if (existingUser) {
    return res.status(409).json({ error: "Email already registered" });
  }

  // Check if invitation already exists
  const invitationsCollection = await invitationsCol();
  const existingInvitation = await invitationsCollection.findOne({ 
    email: body.email, 
    societyId,
    isAccepted: false,
    expiresAt: { $gt: Date.now() }
  });
  if (existingInvitation) {
    return res.status(409).json({ error: "Invitation already sent to this email" });
  }

  // Create invitation
  const token = crypto.randomBytes(32).toString('hex');
  const invitation = {
    email: body.email,
    role: body.role,
    societyId,
    invitedBy: user.uid,
    token,
    isAccepted: false,
    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
    createdAt: Date.now(),
  };

  await invitationsCollection.insertOne(invitation);
  
  // TODO: Send email notification here
  console.log(`Invitation sent to ${body.email} for society ${societyId}. Token: ${token}`);
  
  return res.status(201).json({ 
    success: true, 
    message: "Invitation sent successfully",
    data: { invitationId: invitation.token }
  });
});

router.post("/accept-invitation", async (req, res) => {
  const Schema = z.object({
    token: z.string().min(1),
    password: z.string().min(6),
    name: z.string().min(1),
  });
  const body = Schema.parse(req.body);

  const invitationsCollection = await invitationsCol();
  const invitation = await invitationsCollection.findOne({ 
    token: body.token,
    isAccepted: false,
    expiresAt: { $gt: Date.now() }
  });

  if (!invitation) {
    return res.status(400).json({ error: "Invalid or expired invitation" });
  }

  // Check if email is already registered
  const usersCollection = await usersCol();
  const existingUser = await usersCollection.findOne({ email: invitation.email });
  if (existingUser) {
    return res.status(409).json({ error: "Email already registered" });
  }

  // Create user
  const hashedPassword = await hashPassword(body.password);
  const newUser = {
    uid: new ObjectId().toHexString(),
    email: invitation.email,
    name: body.name,
    role: invitation.role,
    password: hashedPassword,
    associatedSocietyId: invitation.societyId,
    isEmailVerified: true,
    isActive: true,
    createdAt: Date.now(),
  };

  await usersCollection.insertOne(newUser);
  
  // Mark invitation as accepted
  await invitationsCollection.updateOne({ token: body.token }, { $set: { isAccepted: true } });

  const authUser: AuthUser = { uid: newUser.uid, email: newUser.email, name: newUser.name, role: newUser.role };
  const token = generateToken(authUser);
  
  return res.status(201).json({ 
    success: true,
    message: "Account created successfully",
    data: { user: authUser, token }
  });
});

router.get("/invitations/pending", requireAuth(["Manager", "Treasurer", "Secretary", "President"]), async (req, res) => {
  const user = (req as any).user;
  const usersCollection = await usersCol();
  const currentUser = await usersCollection.findOne({ uid: user.uid });
  
  if (!currentUser || !currentUser.associatedSocietyId) {
    return res.status(403).json({ error: "You must be associated with a society" });
  }

  const invitationsCollection = await invitationsCol();
  const invitations = await invitationsCollection.find({
    societyId: currentUser.associatedSocietyId,
    isAccepted: false,
    expiresAt: { $gt: Date.now() }
  }).sort({ createdAt: -1 }).toArray();

  return res.json(invitations.map(serialize));
});

// Expense Reports with date filtering
router.get("/reports/expense", requireAuth(["Admin", "Agent", "Manager", "Treasurer", "Secretary", "President"]), async (req, res) => {
  const { startDate, endDate, societyId, status } = req.query as { 
    startDate?: string; 
    endDate?: string; 
    societyId?: string; 
    status?: string; 
  };
  
  const user = (req as any).user;
  const accessibleSocieties = await getUserAccessibleSocieties(user);
  
  if (accessibleSocieties.length === 0) {
    return res.json({ 
      summary: { totalAmount: 0, totalBills: 0, averageAmount: 0 },
      bills: [],
      byStatus: {},
      bySociety: {}
    });
  }
  
  const col = await billsCol();
  const filter: any = { societyId: { $in: accessibleSocieties } };
  
  // Date filtering
  if (startDate) {
    filter.createdAt = { ...filter.createdAt, $gte: parseInt(startDate) };
  }
  if (endDate) {
    filter.createdAt = { ...filter.createdAt, $lte: parseInt(endDate) };
  }
  
  // Society filtering (if user has access to that society)
  if (societyId && accessibleSocieties.includes(societyId)) {
    filter.societyId = societyId;
  }
  
  // Status filtering
  if (status) {
    filter.status = status;
  }
  
  const bills = await col.find(filter).sort({ createdAt: -1 }).toArray();
  
  // Calculate summary
  const totalAmount = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const totalBills = bills.length;
  const averageAmount = totalBills > 0 ? totalAmount / totalBills : 0;
  
  // Group by status
  const byStatus = bills.reduce((acc, bill) => {
    acc[bill.status] = (acc[bill.status] || 0) + bill.amount;
    return acc;
  }, {} as Record<string, number>);
  
  // Group by society
  const bySociety = bills.reduce((acc, bill) => {
    acc[bill.societyId] = (acc[bill.societyId] || 0) + bill.amount;
    return acc;
  }, {} as Record<string, number>);
  
  // Get society names for the response
  const societiesCollection = await societiesCol();
  const societies = await societiesCollection.find({ 
    _id: { $in: Object.keys(bySociety).map(id => new ObjectId(id)) }
  }).toArray();
  
  const societyNames = societies.reduce((acc, society) => {
    acc[String(society._id)] = society.name;
    return acc;
  }, {} as Record<string, string>);
  
  const bySocietyWithNames = Object.entries(bySociety).reduce((acc, [societyId, amount]) => {
    acc[societyNames[societyId] || societyId] = amount;
    return acc;
  }, {} as Record<string, number>);
  
  return res.json({
    summary: {
      totalAmount,
      totalBills,
      averageAmount: Math.round(averageAmount * 100) / 100
    },
    bills: bills.map(serialize),
    byStatus,
    bySociety: bySocietyWithNames,
    dateRange: {
      startDate: startDate ? new Date(parseInt(startDate)).toISOString() : null,
      endDate: endDate ? new Date(parseInt(endDate)).toISOString() : null
    }
  });
});

// Reports (simple counts)
router.get("/reports", requireAuth(["Admin", "Agent", "Manager", "Treasurer", "Secretary", "President"]), async (req, res) => {
  const user = (req as any).user;
  const accessibleSocieties = await getUserAccessibleSocieties(user);
  
  if (accessibleSocieties.length === 0) {
    return res.json({ pending: 0, approved: 0 });
  }
  
  const col = await billsCol();
  const filter = { societyId: { $in: accessibleSocieties } };
  const [pending, approved] = await Promise.all([
    col.countDocuments({ ...filter, status: "Pending" }),
    col.countDocuments({ ...filter, status: "Approved" }),
  ]);
  return res.json({ pending, approved });
});

export default router;
