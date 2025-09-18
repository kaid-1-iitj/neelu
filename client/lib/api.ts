import { getToken } from "./auth";
import type { ExpenseReport, ExpenseReportFilters, UpdateSocietyRequest, AddSocietyMemberRequest, SocietyMemberInfo, SendOTPRequest, VerifyOTPRequest, OnboardSocietyRequest, ProposeSocietyUpdateRequest } from "../../shared/api";

export type ReportsResponse = { pending: number; approved: number };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: HeadersInit = { ...(init?.headers || {}) };
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...(init || {}), headers });
  if (!res.ok) {
    let errorMessage = `API ${res.status}`;
    try {
      const errorData = await res.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData.details) {
        errorMessage = `Validation error: ${errorData.details.map((d: any) => d.message).join(', ')}`;
      }
    } catch {
      // If we can't parse the error response, use the default message
    }
    throw new Error(errorMessage);
  }
  return res.json();
}

export const getReports = () => api<ReportsResponse>("/api/reports");
export const getSocieties = () => api<any[]>("/api/societies");
export const createSociety = (payload: {
  name: string;
  address: { street: string; city: string; state: string; zip: string };
  contactInfo: { phone?: string; email?: string };
  members: { role: "Manager" | "Treasurer" | "Secretary" | "President"; email: string }[];
}) => api<{ id: string }>("/api/societies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
export const getBills = (params?: { societyId?: string; status?: string; q?: string }) => {
  const qs = new URLSearchParams();
  if (params?.societyId) qs.set("societyId", params.societyId);
  if (params?.status) qs.set("status", params.status);
  if (params?.q) qs.set("q", params.q);
  const url = "/api/bills" + (qs.toString() ? `?${qs.toString()}` : "");
  return api<any[]>(url);
};
export const createBill = (payload: {
  societyId: string;
  vendorName: string;
  transactionNature: string;
  amount: number;
  dueDate: number;
  attachments?: { fileName: string; fileURL: string }[];
}) => api<{ id: string }>("/api/bills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
export const updateBillStatus = (billId: string, payload: { status: string; remark?: string }) =>
  api<{ ok: true }>(`/api/bills/${billId}/status`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

export const getBill = (billId: string) => api<any>(`/api/bills/${billId}`);
export const getBillRemarks = (billId: string) => api<Array<{ text: string; authorId: string; authorName: string; authorRole: string; timestamp: number; previousStatus?: string; newStatus?: string }>>(`/api/bills/${billId}/remarks`);
export const addBillRemark = (billId: string, text: string) =>
  api<{ ok: true }>(`/api/bills/${billId}/remarks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

export const getExpenseReport = (filters?: ExpenseReportFilters) => {
  const params = new URLSearchParams();
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  if (filters?.societyId) params.set("societyId", filters.societyId);
  if (filters?.status) params.set("status", filters.status);
  
  const url = "/api/reports/expense" + (params.toString() ? `?${params.toString()}` : "");
  return api<ExpenseReport>(url);
};

// Society Management API functions
export const updateSociety = (societyId: string, data: UpdateSocietyRequest) =>
  api<any>(`/api/societies/${societyId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const getSocietyMembers = (societyId: string) =>
  api<SocietyMemberInfo[]>(`/api/societies/${societyId}/members`);

export const addSocietyMember = (societyId: string, data: AddSocietyMemberRequest) =>
  api<{ message: string }>(`/api/societies/${societyId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const removeSocietyMember = (societyId: string, userId: string) =>
  api<{ message: string }>(`/api/societies/${societyId}/members/${userId}`, {
    method: "DELETE",
  });

// OTP API functions
export const sendOTP = (data: SendOTPRequest) =>
  api<{ message: string }>("/api/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

// Upload API (multipart)
export async function uploadFiles(files: File[]): Promise<string[]> {
  const token = getToken();
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Upload failed (${res.status})`);
  }
  const data = await res.json();
  return data.urls as string[];
}

export const verifyOTP = (data: VerifyOTPRequest) =>
  api<{ message: string }>("/api/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

// Society onboarding
export const onboardSociety = (data: OnboardSocietyRequest) =>
  api<{ id: string; approvalStatus: "Pending" }>("/api/societies/onboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const approveSociety = (societyId: string) =>
  api<any>(`/api/societies/${societyId}/approve`, { method: "PUT" });

// My society APIs
export const getSociety = (societyId: string) => api<any>(`/api/societies/${societyId}`);
export const getSocietyAgent = (societyId: string) => api<{ uid: string; name: string; email: string } | null>(`/api/societies/${societyId}/agent`);
export const proposeSocietyUpdate = (societyId: string, data: ProposeSocietyUpdateRequest) =>
  api<{ success: boolean; message: string }>(`/api/societies/${societyId}/propose-update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
