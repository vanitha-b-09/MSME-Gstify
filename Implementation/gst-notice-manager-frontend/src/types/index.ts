export type UserRole = "ca" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  firmName?: string;
  phone?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type CaseStatus = "uploaded" | "processing" | "ready" | "submitted" | "error";

export type ClientCategory =
  | "manufacturing"
  | "trading"
  | "services"
  | "ecommerce"
  | "retail"
  | "construction"
  | "logistics"
  | "exports"
  | "other";

export interface Client {
  id: string;
  name: string;
  gstin: string;
  category: ClientCategory;
  contactEmail?: string;
  contactPhone?: string;
  state: string;
  activeCases: number;
  createdAt: string;
}

export interface CaseSummary {
  id: string;
  clientId: string;
  clientName: string;
  gstin: string;
  noticeType: string;
  status: CaseStatus;
  createdAt: string;
  ownerName?: string;
}

export interface UploadPayload {
  clientName: string;
  gstin: string;
  noticeFile: File;
  gstFiles: File[];
}

export interface ExtractedField {
  label: string;
  value: string;
  confidence: number; // 0-1
}

export interface ExtractedData {
  caseId: string;
  clientName: string;
  gstin: string;
  noticeNumber: string;
  noticeType: string;
  issuedOn: string;
  dueOn: string;
  section: string;
  amountDemanded?: string;
  fields: ExtractedField[];
  summary: string;
}

export const CATEGORY_LABELS: Record<ClientCategory, string> = {
  manufacturing: "Manufacturing",
  trading: "Trading",
  services: "Services",
  ecommerce: "E-commerce",
  retail: "Retail",
  construction: "Construction",
  logistics: "Logistics & Transport",
  exports: "Exports",
  other: "Other",
};
