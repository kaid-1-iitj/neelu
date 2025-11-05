/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

// Firestore Collections
export type UserRole =
  | "Admin"
  | "Manager"
  | "Treasurer"
  | "Secretary"
  | "President"
  | "Agent";

export interface SocietyAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface SocietyContactInfo {
  phone?: string;
  email?: string;
}

export interface SocietyDoc {
  name: string;
  address: SocietyAddress;
  contactInfo: SocietyContactInfo;
  isActive: boolean;
  approvalStatus?: "Pending" | "Approved" | "Rejected";
  activationTimestamp?: number; // epoch ms
  assignedAgentId?: string;
  createdAt: number; // epoch ms
  // Proposed updates awaiting admin approval
  pendingUpdate?: Partial<Pick<SocietyDoc, "name" | "address" | "contactInfo" >> & { updatedAt: number; updatedBy: string };
}

export interface UserDoc {
  uid: string; // from Firebase Auth
  email: string;
  name: string;
  role: UserRole;
  password: string; // hashed password
  assignedSocieties?: string[]; // societyIds for Agents
  associatedSocietyId?: string; // for Members
  isEmailVerified: boolean;
  isActive: boolean; // for agent termination
  createdBy?: string; // uid of admin who created this user (for agents)
  createdAt: number; // epoch ms
  terminatedAt?: number; // epoch ms when agent was terminated
}

export type BillStatus =
  | "Pending"
  | "Under Review"
  | "Clarification Required"
  | "Approved"
  | "Rejected";

export interface BillAttachment {
  fileName: string;
  fileURL: string;
}

export interface BillDoc {
  societyId: string; // ref id
  vendorName: string;
  vendorContact?: { phone?: string; email?: string };
  transactionNature: string;
  amount: number;
  dueDate: number; // epoch ms
  status: BillStatus;
  attachments?: BillAttachment[];
  submittedBy: string; // user uid
  remarks?: RemarkDoc[];
  createdAt: number; // epoch ms
}

export interface RemarkDoc {
  text: string;
  authorId: string;
  authorRole: UserRole | string;
  timestamp: number; // epoch ms
  previousStatus: BillStatus;
  newStatus?: BillStatus;
}

export interface NotificationDoc {
  recipientUids: string[];
  subject: string;
  message: string;
  relatedBillId?: string;
  isRead: boolean;
  createdAt: number;
}

// API Contracts (simplified)
export interface CreateSocietyRequest {
  name: string;
  address: SocietyAddress;
  contactInfo: SocietyContactInfo;
  members: { role: Exclude<UserRole, "Admin" | "Agent">; email: string }[];
}

export interface OnboardSocietyRequest {
  name: string;
  address: SocietyAddress;
  contactInfo: SocietyContactInfo;
}

export interface AssignAgentRequest {
  agentUid: string;
}

export interface CreateBillRequest
  extends Pick<BillDoc, "societyId" | "vendorName" | "transactionNature" | "amount" | "dueDate"> {
  attachments?: { fileName: string; fileURL: string }[];
}

export interface UpdateBillStatusRequest {
  status: BillStatus;
  remark?: string;
}

export interface CreateRemarkRequest {
  text: string;
}

// Authentication API types
export interface SignUpRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  otp?: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Expense Report types
export interface ExpenseReportSummary {
  totalAmount: number;
  totalBills: number;
  averageAmount: number;
}

export interface ExpenseReport {
  summary: ExpenseReportSummary;
  bills: BillDoc[];
  byStatus: Record<string, number>;
  bySociety: Record<string, number>;
  dateRange: {
    startDate: string | null;
    endDate: string | null;
  };
}

export interface ExpenseReportFilters {
  startDate?: string;
  endDate?: string;
  societyId?: string;
  status?: BillStatus;
}

// Agent Management API types
export interface CreateAgentRequest {
  email: string;
  name: string;
  assignedSocieties?: string[];
}

export interface UpdateAgentSocietiesRequest {
  assignedSocieties: string[];
}

export interface TerminateAgentRequest {
  reason?: string;
}

// Member Invitation API types
export interface InviteMemberRequest {
  email: string;
  role: Exclude<UserRole, "Admin" | "Agent">;
  societyId: string;
}

export interface AcceptInvitationRequest {
  token: string;
  password: string;
  name: string;
}

export interface MemberInvitationDoc {
  email: string;
  role: Exclude<UserRole, "Admin" | "Agent">;
  societyId: string;
  invitedBy: string; // uid of the member who sent the invitation
  token: string; // unique token for invitation
  isAccepted: boolean;
  expiresAt: number; // epoch ms
  createdAt: number; // epoch ms
}

// Society Management API interfaces
export interface UpdateSocietyRequest {
  name?: string;
  address?: SocietyAddress;
  contactInfo?: SocietyContactInfo;
  isActive?: boolean;
}

export interface ProposeSocietyUpdateRequest {
  name?: string;
  address?: SocietyAddress;
  contactInfo?: SocietyContactInfo;
}

export interface AddSocietyMemberRequest {
  email: string;
  role: UserRole;
  name?: string;
}

export interface RemoveSocietyMemberRequest {
  userId: string;
}

export interface SocietyMemberInfo {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  joinedAt: number;
}

// Email and OTP related interfaces
export interface EmailNotificationRequest {
  to: string[];
  subject: string;
  body: string;
  htmlBody?: string;
}

export interface SendOTPRequest {
  email: string;
  phone?: string;
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
}

export interface OTPVerificationDoc {
  email: string;
  phone?: string;
  otp: string;
  isVerified: boolean;
  expiresAt: number; // epoch ms
  createdAt: number; // epoch ms
  attempts: number; // number of verification attempts
}

// Advance Payment types
export type AdvancePaymentStatus = "Pending" | "Approved" | "Rejected" | "Partially Approved";

export interface AdvancePaymentDoc {
  societyId: string; // ref id
  billId?: string; // Linked bill ID (optional)
  totalAmountNeeded: number; // Total amount needed
  requestedAmount: number; // Amount requested in this advance payment
  receivedAmount?: number; // Amount received (if approved)
  approvedAmount?: number; // Amount approved by admin
  status: AdvancePaymentStatus;
  requestedBy: string; // user uid
  approvedBy?: string; // user uid (admin who approved)
  remarks?: string;
  createdAt: number; // epoch ms
  updatedAt?: number; // epoch ms
  approvedAt?: number; // epoch ms
}

export interface CreateAdvancePaymentRequest {
  societyId: string;
  billId?: string; // Optional bill ID to link advance payment to
  totalAmountNeeded: number;
  requestedAmount: number;
  remarks?: string;
}

export interface UpdateAdvancePaymentRequest {
  status: AdvancePaymentStatus;
  approvedAmount?: number;
  receivedAmount?: number;
  remarks?: string;
}