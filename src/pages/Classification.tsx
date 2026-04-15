import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockInvoices } from "@/data/mockData";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { CheckCircle, Clock, XCircle, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function Classification() {
  const [tab, setTab] = useState("all");

  const getFiltered = () => {
    if (tab === "gst-ready") return mockInvoices.filter((i) => i.classification === "gst-ready");
    if (tab === "needs-review") return mockInvoices.filter((i) => i.classification === "needs-review");
    if (tab === "non-gst") return mockInvoices.filter((i) => i.classification === "non-gst");
    return mockInvoices;
  };

  const invoices = getFiltered();

  const counts = {
    all: mockInvoices.length,
    "gst-ready": mockInvoices.filter((i) => i.classification === "gst-ready").length,
    "needs-review": mockInvoices.filter((i) => i.classification === "needs-review").length,
    "non-gst": mockInvoices.filter((i) => i.classification === "non-gst").length,
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8 animate-fade-in">
            <div>
              <h1 className="text-2xl font-bold">Smart Classification</h1>
              <p className="text-muted-foreground text-sm mt-1">AI-categorized invoices by compliance status</p>
            </div>
            <Button className="gap-2" variant="outline" onClick={() => toast.success("Report exported successfully!")}>
              <Download className="w-4 h-4" /> Export to Excel
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="border-success/20 bg-success/5">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-success" />
                <div><p className="text-xl font-bold">{counts["gst-ready"]}</p><p className="text-xs text-muted-foreground">GST-ready</p></div>
              </CardContent>
            </Card>
            <Card className="border-warning/20 bg-warning/5">
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="w-5 h-5 text-warning" />
                <div><p className="text-xl font-bold">{counts["needs-review"]}</p><p className="text-xs text-muted-foreground">Needs Review</p></div>
              </CardContent>
            </Card>
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-4 flex items-center gap-3">
                <XCircle className="w-5 h-5 text-destructive" />
                <div><p className="text-xl font-bold">{counts["non-gst"]}</p><p className="text-xs text-muted-foreground">Non-GST</p></div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
              <TabsTrigger value="gst-ready">GST-ready ({counts["gst-ready"]})</TabsTrigger>
              <TabsTrigger value="needs-review">Needs Review ({counts["needs-review"]})</TabsTrigger>
              <TabsTrigger value="non-gst">Non-GST ({counts["non-gst"]})</TabsTrigger>
            </TabsList>

            <TabsContent value={tab}>
              <div className="space-y-3">
                {invoices.map((inv, i) => (
                  <Card key={inv.id} className="border-border/60 hover:shadow-md transition-all animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{inv.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground">{inv.supplierName} · {inv.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-sm font-semibold">{formatCurrency(inv.totalAmount)}</p>
                        <ConfidenceBadge score={inv.confidence} />
                        <StatusBadge status={inv.status} />
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${inv.classification === "gst-ready" ? "bg-success/10 text-success" : inv.classification === "needs-review" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>
                          {inv.classification === "gst-ready" ? "GST-ready" : inv.classification === "needs-review" ? "Needs Review" : "Non-GST"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
