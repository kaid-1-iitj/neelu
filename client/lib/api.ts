import { getToken } from "./auth";

export type ReportsResponse = { pending: number; approved: number };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: HeadersInit = { ...(init?.headers || {}) };
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...(init || {}), headers });
  if (!res.ok) throw new Error(`API ${res.status}`);
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

// Agents
export const getAgents = () => api<any[]>("/api/agents");
export const createAgent = (payload: { email: string; password: string; name?: string }) =>
  api<{ uid: string; email: string; name?: string; role: string; isActive: boolean }>("/api/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
export const terminateAgent = (uid: string) => api<{ ok: true }>(`/api/agents/${uid}/terminate`, { method: "PUT" });
export const assignAgentToSociety = (societyId: string, agentUid: string) =>
  api<{ ok: true }>(`/api/societies/${societyId}/assign-agent`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agentUid }) });
export const unassignAgentFromSociety = (societyId: string) =>
  api<{ ok: true }>(`/api/societies/${societyId}/unassign-agent`, { method: "PUT" });
