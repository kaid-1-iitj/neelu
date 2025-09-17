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
  activationTimestamp?: number; // epoch ms
  assignedAgentId?: string;
  createdAt: number; // epoch ms
}

export interface UserDoc {
  uid: string; // from auth
  email: string;
  name?: string;
  role: UserRole;
  assignedSocieties?: string[]; // optional, if agents can manage multiple societies
  associatedSocietyId?: string; // for Members
  isEmailVerified?: boolean;
  isActive: boolean;
  password?: string; // stored only on server; never sent to client
  createdAt: number; // epoch ms
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

export interface AssignAgentRequest {
  agentUid: string;
}

export interface CreateAgentRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AgentListItem {
  uid: string;
  email: string;
  name?: string;
  role: Extract<UserRole, "Agent">;
  isActive: boolean;
}

export interface CreateBillRequest
  extends Pick<
    BillDoc,
    "societyId" | "vendorName" | "transactionNature" | "amount" | "dueDate"
  > {
  attachments?: { fileName: string; fileURL: string }[];
}

export interface UpdateBillStatusRequest {
  status: BillStatus;
  remark?: string;
}

export interface CreateRemarkRequest {
  text: string;
}
