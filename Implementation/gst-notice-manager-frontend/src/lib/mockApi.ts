import type {
  AuthResponse,
  CaseSummary,
  Client,
  ClientCategory,
  ExtractedData,
  UploadPayload,
  User,
  UserRole,
} from "@/types";

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));
type MockCaseFile = {
  id: string;
  case_id: string;
  file_type: string;
  file_key: string;
  created_at: string;
};

const seedUsers: Array<User & { password: string }> = [
  { id: "u_admin", name: "Admin User", email: "admin@demo.in", role: "admin", firmName: "Demo & Co.", phone: "+91 98765 43210", password: "admin123" },
  { id: "u_ca", name: "Ravi Sharma (CA)", email: "ca@demo.in", role: "ca", firmName: "Sharma Associates", phone: "+91 99887 76655", password: "ca12345" },
];

const seedClients: Client[] = [
  { id: "cl_1", name: "Acme Traders Pvt Ltd", gstin: "27AAAAA0000A1Z5", category: "trading", contactEmail: "accounts@acme.in", contactPhone: "+91 98200 11111", state: "Maharashtra", activeCases: 2, createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: "cl_2", name: "Bharat Steel LLP", gstin: "29BBBBB1111B1Z3", category: "manufacturing", contactEmail: "finance@bharatsteel.in", contactPhone: "+91 99000 22222", state: "Karnataka", activeCases: 1, createdAt: new Date(Date.now() - 86400000 * 60).toISOString() },
  { id: "cl_3", name: "Coastal Exports", gstin: "33CCCCC2222C1Z7", category: "exports", contactEmail: "ops@coastalex.in", state: "Tamil Nadu", activeCases: 1, createdAt: new Date(Date.now() - 86400000 * 14).toISOString() },
  { id: "cl_4", name: "Nirmaan Constructions", gstin: "07DDDDD3333D1Z9", category: "construction", contactEmail: "ca@nirmaan.in", contactPhone: "+91 98111 33333", state: "Delhi", activeCases: 0, createdAt: new Date(Date.now() - 86400000 * 90).toISOString() },
  { id: "cl_5", name: "QuickKart Online", gstin: "29EEEEE4444E1Z1", category: "ecommerce", contactEmail: "tax@quickkart.in", state: "Karnataka", activeCases: 3, createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: "cl_6", name: "FreshMart Retail", gstin: "27FFFFF5555F1Z2", category: "retail", contactEmail: "accounts@freshmart.in", state: "Maharashtra", activeCases: 0, createdAt: new Date(Date.now() - 86400000 * 45).toISOString() },
  { id: "cl_7", name: "BlueLine Logistics", gstin: "06GGGGG6666G1Z4", category: "logistics", contactEmail: "ops@blueline.in", state: "Haryana", activeCases: 1, createdAt: new Date(Date.now() - 86400000 * 20).toISOString() },
  { id: "cl_8", name: "Insight Consulting", gstin: "29HHHHH7777H1Z6", category: "services", contactEmail: "billing@insightc.in", state: "Karnataka", activeCases: 0, createdAt: new Date(Date.now() - 86400000 * 100).toISOString() },
];

const seedCases: CaseSummary[] = [
  { id: "c_1001", clientId: "cl_1", clientName: "Acme Traders Pvt Ltd", gstin: "27AAAAA0000A1Z5", noticeType: "GSTR-3B Mismatch (Sec 61)", status: "ready", createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), ownerName: "Ravi Sharma (CA)" },
  { id: "c_1002", clientId: "cl_2", clientName: "Bharat Steel LLP", gstin: "29BBBBB1111B1Z3", noticeType: "ITC Reversal (Sec 73)", status: "processing", createdAt: new Date(Date.now() - 86400000).toISOString(), ownerName: "Ravi Sharma (CA)" },
  { id: "c_1003", clientId: "cl_3", clientName: "Coastal Exports", gstin: "33CCCCC2222C1Z7", noticeType: "Refund Scrutiny", status: "uploaded", createdAt: new Date().toISOString(), ownerName: "Ravi Sharma (CA)" },
  { id: "c_1004", clientId: "cl_5", clientName: "QuickKart Online", gstin: "29EEEEE4444E1Z1", noticeType: "TCS Reconciliation", status: "submitted", createdAt: new Date(Date.now() - 86400000 * 7).toISOString(), ownerName: "Ravi Sharma (CA)" },
];

const seedExtracted: ExtractedData[] = [
  {
    caseId: "c_1001",
    clientName: "Acme Traders Pvt Ltd",
    gstin: "27AAAAA0000A1Z5",
    noticeNumber: "ASMT-10/2024-25/MH/00123",
    noticeType: "GSTR-3B vs GSTR-1 Mismatch",
    issuedOn: "2025-03-12",
    dueOn: "2025-04-11",
    section: "Section 61, CGST Act 2017",
    amountDemanded: "₹4,82,150",
    summary:
      "Outward supplies declared in GSTR-1 exceed those declared in GSTR-3B for FY 2023-24 by ₹26.78 lakh. Department seeks reconciliation and payment of differential tax with interest.",
    fields: [
      { label: "Notice Number", value: "ASMT-10/2024-25/MH/00123", confidence: 0.98 },
      { label: "GSTIN", value: "27AAAAA0000A1Z5", confidence: 0.99 },
      { label: "Period", value: "April 2023 – March 2024", confidence: 0.94 },
      { label: "Section", value: "Section 61", confidence: 0.96 },
      { label: "Tax demanded (CGST)", value: "₹2,41,075", confidence: 0.91 },
      { label: "Tax demanded (SGST)", value: "₹2,41,075", confidence: 0.91 },
      { label: "Issuing officer", value: "Asst. Commissioner, Mumbai South", confidence: 0.86 },
    ],
  },
  {
    caseId: "c_1002",
    clientName: "Bharat Steel LLP",
    gstin: "29BBBBB1111B1Z3",
    noticeNumber: "DRC-01A/2025/KA/0456",
    noticeType: "ITC Reversal",
    issuedOn: "2025-04-02",
    dueOn: "2025-05-02",
    section: "Section 73, CGST Act 2017",
    amountDemanded: "₹12,40,000",
    summary:
      "Excess Input Tax Credit availed against ineligible invoices flagged in GSTR-2B for Q3 FY 2024-25. Taxpayer is required to reverse ITC with interest.",
    fields: [
      { label: "Notice Number", value: "DRC-01A/2025/KA/0456", confidence: 0.97 },
      { label: "GSTIN", value: "29BBBBB1111B1Z3", confidence: 0.99 },
      { label: "Period", value: "Oct 2024 – Dec 2024", confidence: 0.93 },
      { label: "Section", value: "Section 73", confidence: 0.95 },
      { label: "ITC to reverse", value: "₹10,50,000", confidence: 0.88 },
      { label: "Interest", value: "₹1,90,000", confidence: 0.84 },
    ],
  },
];

const store = {
  users: [...seedUsers],
  clients: [...seedClients],
  cases: [...seedCases],
  extracted: [...seedExtracted],
  caseFiles: [] as MockCaseFile[],
};

let caseSeq = 2000;

export const mock = {
  async login(email: string, password: string): Promise<AuthResponse> {
    await delay();
    const u = store.users.find((x) => x.email.toLowerCase() === email.toLowerCase());
    if (!u || u.password !== password) throw new Error("Invalid email or password");
    const { password: _p, ...user } = u;
    return { token: `mock.${u.id}.${Date.now()}`, user };
  },

  async signup(name: string, email: string, password: string, role: UserRole): Promise<AuthResponse> {
    await delay();
    if (store.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("An account with this email already exists");
    }
    const newUser = { id: `u_${Date.now()}`, name, email, role, password };
    store.users.push(newUser);
    const { password: _p, ...user } = newUser;
    return { token: `mock.${newUser.id}.${Date.now()}`, user };
  },

  async listCases(_currentUser: User): Promise<CaseSummary[]> {
    await delay(300);
    return [...store.cases];
  },

  async createCase(p: UploadPayload, currentUser: User): Promise<CaseSummary> {
    await delay(900);
    let client = store.clients.find((c) => c.gstin.toLowerCase() === p.gstin.toLowerCase());
    if (!client) {
      client = {
        id: `cl_${Date.now()}`,
        name: p.clientName,
        gstin: p.gstin,
        category: "other",
        state: "—",
        activeCases: 1,
        createdAt: new Date().toISOString(),
      };
      store.clients.unshift(client);
    } else {
      client.activeCases += 1;
    }
    const c: CaseSummary = {
      id: `c_${++caseSeq}`,
      clientId: client.id,
      clientName: p.clientName,
      gstin: p.gstin,
      noticeType: "Pending parsing…",
      status: "processing",
      createdAt: new Date().toISOString(),
      ownerName: currentUser.name,
    };
    store.cases.unshift(c);

    const incomingFiles = [p.noticeFile, ...(p.gstFiles || [])].filter(Boolean);
    const now = new Date().toISOString();
    for (const file of incomingFiles) {
      store.caseFiles.unshift({
        id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        case_id: c.id,
        file_type: "mixed",
        file_key: file.name,
        created_at: now,
      });
    }

    return c;
  },

  async getCase(caseId: string): Promise<{
    id: string;
    client_name: string;
    client_gstin: string;
    status: string;
    created_at: string;
  }> {
    await delay(200);
    const c = store.cases.find((x) => x.id === caseId);
    if (!c) throw new Error("Case not found");
    return {
      id: c.id,
      client_name: c.clientName,
      client_gstin: c.gstin,
      status: c.status,
      created_at: c.createdAt,
    };
  },

  async listClients(category?: ClientCategory | "all"): Promise<Client[]> {
    await delay(250);
    if (!category || category === "all") return [...store.clients];
    return store.clients.filter((c) => c.category === category);
  },

  async createClient(input: Omit<Client, "id" | "activeCases" | "createdAt">): Promise<Client> {
    await delay(450);
    const gstin = input.gstin.trim().toUpperCase();
    const existing = store.clients.find((c) => c.gstin.toUpperCase() === gstin);
    if (existing) {
      Object.assign(existing, {
        name: input.name.trim(),
        gstin,
        category: input.category,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        state: input.state || "—",
      });
      return { ...existing };
    }

    const created: Client = {
      id: `cl_${Date.now()}`,
      name: input.name.trim(),
      gstin,
      category: input.category,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      state: input.state || "—",
      activeCases: 0,
      createdAt: new Date().toISOString(),
    };
    store.clients.unshift(created);
    return created;
  },

  async listExtracted(): Promise<ExtractedData[]> {
    await delay(250);
    return [...store.extracted];
  },

  async updateProfile(userId: string, patch: Partial<User>): Promise<User> {
    await delay(400);
    const u = store.users.find((x) => x.id === userId);
    if (!u) throw new Error("User not found");
    Object.assign(u, patch);
    const { password: _p, ...user } = u;
    return user;
  },

  async listCaseFiles(caseId: string): Promise<MockCaseFile[]> {
    await delay(250);
    return store.caseFiles.filter((f) => f.case_id === caseId);
  },

  async uploadCaseFiles(caseId: string, files: File[]): Promise<{ savedCount: number; duplicateCount: number }> {
    await delay(450);
    let savedCount = 0;
    let duplicateCount = 0;

    const existingNames = new Set(
      store.caseFiles.filter((f) => f.case_id === caseId).map((f) => f.file_key.toLowerCase())
    );

    for (const file of files) {
      const key = file.name.toLowerCase();
      if (existingNames.has(key)) {
        duplicateCount += 1;
        continue;
      }

      store.caseFiles.unshift({
        id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        case_id: caseId,
        file_type: "mixed",
        file_key: file.name,
        created_at: new Date().toISOString(),
      });
      existingNames.add(key);
      savedCount += 1;
    }

    return { savedCount, duplicateCount };
  },

  async removeCaseFile(fileId: string): Promise<void> {
    await delay(250);
    const before = store.caseFiles.length;
    store.caseFiles = store.caseFiles.filter((f) => f.id !== fileId);
    if (store.caseFiles.length === before) throw new Error("File not found");
  },
};
