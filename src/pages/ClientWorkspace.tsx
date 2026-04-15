import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronRight, Download, Upload, CheckCircle, LayoutGrid, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/AppSidebar";
import { InvoiceCard } from "@/components/InvoiceCard";
import { UploadZone } from "@/components/UploadZone";
import { ExtractionLoader } from "@/components/ExtractionLoader";
import { mockClients, mockInvoices, type Invoice } from "@/data/mockData";
import { toast } from "sonner";

type Phase = "workspace" | "uploading" | "extracting" | "results";

export default function ClientWorkspace() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const client = mockClients.find((c) => c.id === clientId);
  const [phase, setPhase] = useState<Phase>("workspace");
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);

  const clientInvoices = useMemo(
    () => invoices.filter((inv) => inv.clientId === clientId),
    [invoices, clientId]
  );

  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Client not found</p>
      </div>
    );
  }

  const handleUploadComplete = () => {
    setPhase("extracting");
    setTimeout(() => setPhase("results"), 3000);
  };

  const handleApprove = (id: string) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, status: "approved" as const } : inv))
    );
    toast.success("Invoice approved successfully");
  };

  const handleFlag = (id: string) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, status: "flagged" as const } : inv))
    );
    toast.warning("Invoice flagged for review");
  };

  const handleExport = () => {
    toast.success("Excel report generated successfully!", {
      description: `${clientInvoices.filter((i) => i.status === "approved").length} approved invoices exported`,
      duration: 5000,
    });
  };

  const steps = ["Upload", "OCR", "Extraction", "Validation", "Classification"];
  const activeStep = phase === "uploading" ? 0 : phase === "extracting" ? 2 : phase === "results" ? 4 : -1;

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 animate-fade-in">
            <button onClick={() => navigate("/dashboard")} className="hover:text-foreground transition-colors">Dashboard</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">{client.name}</span>
          </div>

          {/* Client context banner */}
          <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 mb-6 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <LayoutGrid className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">
                  You are viewing invoices for{" "}
                  <span className="text-primary font-semibold">{client.name}</span>
                </p>
                {client.gstin && (
                  <p className="text-xs text-muted-foreground font-mono">GSTIN: {client.gstin}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setPhase("uploading")}>
                <Upload className="w-4 h-4" /> Upload Invoices
              </Button>
              <Button size="sm" className="gap-2 bg-success hover:bg-success/90 text-success-foreground" onClick={handleExport}>
                <Download className="w-4 h-4" /> Export to Excel
              </Button>
            </div>
          </div>

          {/* Processing Steps Indicator */}
          {activeStep >= 0 && (
            <div className="flex items-center gap-2 mb-6 p-4 bg-card rounded-xl border border-border/60 animate-fade-in">
              {steps.map((step, i) => (
                <div key={step} className="flex items-center gap-2 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i <= activeStep ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {i < activeStep ? "✓" : i + 1}
                  </div>
                  <span className={`text-xs font-medium ${i <= activeStep ? "text-foreground" : "text-muted-foreground"}`}>{step}</span>
                  {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${i < activeStep ? "bg-primary" : "bg-muted"}`} />}
                </div>
              ))}
            </div>
          )}

          {/* Phase content */}
          {phase === "uploading" && <UploadZone onUploadComplete={handleUploadComplete} />}
          {phase === "extracting" && <ExtractionLoader />}

          {(phase === "workspace" || phase === "results") && (
            <div className="space-y-4">
              {phase === "results" && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20 mb-4 animate-scale-in">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <p className="text-sm font-medium text-success">AI extraction complete! Review the results below.</p>
                </div>
              )}

              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">Invoices ({clientInvoices.length})</h2>
              </div>

              {clientInvoices.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p>No invoices yet. Upload some to get started.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {clientInvoices.map((invoice, i) => (
                    <InvoiceCard key={invoice.id} invoice={invoice} index={i} onApprove={handleApprove} onFlag={handleFlag} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
