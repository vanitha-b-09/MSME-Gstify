export interface Client {
  id: string;
  name: string;
  gstin?: string;
  invoiceCount: number;
  pendingCount: number;
  lastActivity: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  fileName: string;
  invoiceNumber: string;
  date: string;
  supplierName: string;
  supplierGstin: string;
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
  hsnCode: string;
  taxRate: number;
  confidence: number;
  status: "approved" | "pending" | "flagged";
  gstinValid: boolean;
  classification: "gst-ready" | "needs-review" | "non-gst";
  vendor?: string;
}

export const mockClients: Client[] = [
  { id: "1", name: "Sharma Enterprises Pvt Ltd", gstin: "27AADCS1234F1ZQ", invoiceCount: 24, pendingCount: 3, lastActivity: "2 hours ago" },
  { id: "2", name: "Patel Trading Co.", gstin: "24AABCP5678G1Z2", invoiceCount: 18, pendingCount: 7, lastActivity: "Yesterday" },
  { id: "3", name: "Gupta Manufacturing Ltd", gstin: "09AAECG9012H1ZX", invoiceCount: 31, pendingCount: 0, lastActivity: "3 days ago" },
];

export const mockInvoices: Invoice[] = [
  { id: "inv-1", clientId: "1", fileName: "invoice_sharma_001.pdf", invoiceNumber: "INV-2024-001", date: "2024-03-15", supplierName: "ABC Suppliers", supplierGstin: "27AADCS9876F1ZQ", netAmount: 45000, taxAmount: 8100, totalAmount: 53100, hsnCode: "8471", taxRate: 18, confidence: 97, status: "approved", gstinValid: true, classification: "gst-ready", vendor: "ABC Suppliers" },
  { id: "inv-2", clientId: "1", fileName: "invoice_sharma_002.pdf", invoiceNumber: "INV-2024-002", date: "2024-03-18", supplierName: "XYZ Electronics", supplierGstin: "27INVALID1234", netAmount: 22500, taxAmount: 4050, totalAmount: 26550, hsnCode: "8504", taxRate: 18, confidence: 72, status: "flagged", gstinValid: false, classification: "needs-review", vendor: "XYZ Electronics" },
  { id: "inv-3", clientId: "1", fileName: "invoice_sharma_003.jpg", invoiceNumber: "INV-2024-003", date: "2024-03-20", supplierName: "Metro Logistics", supplierGstin: "27AABCM4567G1Z8", netAmount: 12000, taxAmount: 600, totalAmount: 12600, hsnCode: "9965", taxRate: 5, confidence: 89, status: "pending", gstinValid: true, classification: "gst-ready", vendor: "Metro Logistics" },
  { id: "inv-4", clientId: "2", fileName: "patel_inv_march.pdf", invoiceNumber: "PT-2024-101", date: "2024-03-10", supplierName: "Steel Corp India", supplierGstin: "24AABCS3456H1Z5", netAmount: 185000, taxAmount: 33300, totalAmount: 218300, hsnCode: "7208", taxRate: 18, confidence: 95, status: "approved", gstinValid: true, classification: "gst-ready", vendor: "Steel Corp India" },
  { id: "inv-5", clientId: "2", fileName: "patel_inv_transport.png", invoiceNumber: "PT-2024-102", date: "2024-03-22", supplierName: "Quick Transport", supplierGstin: "24AABCQ7890J1Z3", netAmount: 8500, taxAmount: 1530, totalAmount: 10030, hsnCode: "9965", taxRate: 18, confidence: 82, status: "pending", gstinValid: true, classification: "needs-review", vendor: "Quick Transport" },
  { id: "inv-6", clientId: "3", fileName: "gupta_mfg_001.pdf", invoiceNumber: "GM-2024-501", date: "2024-03-05", supplierName: "Raw Materials Inc", supplierGstin: "09AABCR1234K1ZQ", netAmount: 320000, taxAmount: 57600, totalAmount: 377600, hsnCode: "3901", taxRate: 18, confidence: 98, status: "approved", gstinValid: true, classification: "gst-ready", vendor: "Raw Materials Inc" },
  { id: "inv-7", clientId: "3", fileName: "gupta_mfg_002.pdf", invoiceNumber: "GM-2024-502", date: "2024-03-12", supplierName: "PackWell Solutions", supplierGstin: "09AABCP5678L1Z4", netAmount: 15000, taxAmount: 1800, totalAmount: 16800, hsnCode: "4819", taxRate: 12, confidence: 93, status: "approved", gstinValid: true, classification: "gst-ready", vendor: "PackWell Solutions" },
  { id: "inv-8", clientId: "1", fileName: "sharma_misc_001.jpg", invoiceNumber: "INV-2024-004", date: "2024-03-25", supplierName: "Local Store", supplierGstin: "", netAmount: 5000, taxAmount: 0, totalAmount: 5000, hsnCode: "", taxRate: 0, confidence: 45, status: "flagged", gstinValid: false, classification: "non-gst", vendor: "Local Store" },
  { id: "inv-9", clientId: "2", fileName: "patel_duplicate.pdf", invoiceNumber: "PT-2024-101", date: "2024-03-10", supplierName: "Steel Corp India", supplierGstin: "24AABCS3456H1Z5", netAmount: 185000, taxAmount: 33300, totalAmount: 218300, hsnCode: "7208", taxRate: 18, confidence: 95, status: "flagged", gstinValid: true, classification: "needs-review", vendor: "Steel Corp India" },
];

export const mockVendors = [
  { name: "ABC Suppliers", invoiceCount: 12, totalAmount: 636000, reliability: 96, lastInvoice: "2024-03-15" },
  { name: "Steel Corp India", invoiceCount: 8, totalAmount: 1746400, reliability: 92, lastInvoice: "2024-03-10" },
  { name: "Raw Materials Inc", invoiceCount: 15, totalAmount: 5664000, reliability: 98, lastInvoice: "2024-03-05" },
  { name: "XYZ Electronics", invoiceCount: 4, totalAmount: 106200, reliability: 68, lastInvoice: "2024-03-18" },
  { name: "Metro Logistics", invoiceCount: 6, totalAmount: 75600, reliability: 88, lastInvoice: "2024-03-20" },
  { name: "Quick Transport", invoiceCount: 3, totalAmount: 30090, reliability: 82, lastInvoice: "2024-03-22" },
  { name: "PackWell Solutions", invoiceCount: 5, totalAmount: 84000, reliability: 94, lastInvoice: "2024-03-12" },
];

export const mockFraudAlerts = [
  { id: "f1", type: "duplicate" as const, message: "Duplicate invoice PT-2024-101 detected for Steel Corp India", severity: "high" as const, invoiceId: "inv-9" },
  { id: "f2", type: "gstin" as const, message: "Invalid GSTIN format for XYZ Electronics", severity: "medium" as const, invoiceId: "inv-2" },
  { id: "f3", type: "amount" as const, message: "Unusually high amount ₹3,77,600 from Raw Materials Inc", severity: "low" as const, invoiceId: "inv-6" },
];

export const monthlyData = [
  { month: "Oct", invoices: 18, amount: 245000 },
  { month: "Nov", invoices: 22, amount: 312000 },
  { month: "Dec", invoices: 15, amount: 198000 },
  { month: "Jan", invoices: 28, amount: 420000 },
  { month: "Feb", invoices: 32, amount: 510000 },
  { month: "Mar", invoices: 24, amount: 385000 },
];
