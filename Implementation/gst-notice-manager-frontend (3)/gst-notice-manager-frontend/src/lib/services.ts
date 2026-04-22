import API from "../api/api";
import { USE_MOCKS } from "@/lib/api";
import { mock } from "@/lib/mockApi";
import type { Client, ClientCategory, User } from "@/types";

// ================== STATUS SAFE MAP ==================
const mapStatus = (status?: string) => {
  if (!status) return "uploaded";

  switch (status) {
    case "open":
      return "uploaded";
    case "processing":
      return "processing";
    case "done":
      return "ready";
    default:
      return "uploaded";
  }
};

// ================== CASES ==================
export const casesService = {
  create: async (data: any) => {
    if (USE_MOCKS) {
      const currentUser: User = {
        id: "mock",
        name: data?.currentUser?.name || "User",
        email: data?.currentUser?.email || "user@local",
        role: data?.currentUser?.role || "ca",
      };
      return await mock.createCase(
        {
          clientName: data.clientName,
          gstin: data.gstin,
          noticeFile: data.noticeFile,
          gstFiles: data.gstFiles || [],
        },
        currentUser
      );
    }
    // 1. create case
    const caseRes = await API.post("/cases", {
      client_name: data.clientName,
      client_gstin: data.gstin,
    });

    const caseId = caseRes.data.id;

    // 2. BULK UPLOAD
    const formData = new FormData();

    if (data.noticeFile) {
      formData.append("files", data.noticeFile);
    }

    if (data.gstFiles && data.gstFiles.length > 0) {
      data.gstFiles.forEach((file: File) => {
        formData.append("files", file);
      });
    }

    formData.append("case_id", caseId);
    formData.append("file_type", "mixed");

    try {
      await API.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch (uploadError) {
      // Roll back just-created case to avoid multiple orphan cases after retries.
      try {
        await API.delete(`/cases/${caseId}`);
      } catch {
        // Ignore rollback failure; original upload error should still surface.
      }
      throw uploadError;
    }

    return caseRes.data;
  },

  list: async (user?: any) => {
    if (USE_MOCKS) {
      return await mock.listCases(user);
    }
    const res = await API.get("/cases");

    return res.data.map((c: any) => ({
      id: c.id,
      clientName: c.client_name,
      gstin: c.client_gstin,
      noticeType: "GST Notice",
      status: mapStatus(c.status), // 🔥 safe now
      createdAt: c.created_at || new Date(),
      ownerName: user?.name || "You",
    }));
  },

  get: async (caseId: string) => {
    if (USE_MOCKS) return await mock.getCase(caseId);
    const res = await API.get(`/cases/${caseId}`);
    return res.data;
  },
};

export const clientsService = {
  list: async (category?: ClientCategory | "all"): Promise<Client[]> => {
    if (USE_MOCKS) return await mock.listClients(category);

    const params = new URLSearchParams();
    if (category && category !== "all") params.set("category", category);
    const qs = params.toString();
    const res = await API.get(`/clients${qs ? `?${qs}` : ""}`);
    return res.data as Client[];
  },

  create: async (client: Omit<Client, "id" | "activeCases" | "createdAt">): Promise<Client> => {
    if (USE_MOCKS) return await mock.createClient(client);

    const res = await API.post("/clients", {
      name: client.name,
      gstin: client.gstin,
      category: client.category,
      contactEmail: client.contactEmail,
      contactPhone: client.contactPhone,
      state: client.state,
    });
    return res.data as Client;
  },
};

export const extractedService = {
  list: async () => [],
};

export const caseFilesService = {
  list: async (caseId: string) => {
    if (USE_MOCKS) return await mock.listCaseFiles(caseId);
    const res = await API.get(`/upload/case/${caseId}`);
    return res.data as Array<{
      id: string;
      case_id: string;
      file_type: string;
      file_key: string;
      created_at: string;
    }>;
  },

  uploadMore: async (caseId: string, files: File[]) => {
    if (USE_MOCKS) return await mock.uploadCaseFiles(caseId, files);
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    formData.append("case_id", caseId);
    formData.append("file_type", "mixed");
    const res = await API.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  remove: async (fileId: string) => {
    if (USE_MOCKS) return await mock.removeCaseFile(fileId);
    const res = await API.delete(`/upload/file/${fileId}`);
    return res.data;
  },
};

export const authService = {
  getProfile: async () => ({
    name: "User",
    email: "test@test.com",
  }),
};