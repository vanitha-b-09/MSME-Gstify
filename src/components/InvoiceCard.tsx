import { Check, Flag, Pencil, FileText, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import type { Invoice } from "@/data/mockData";
import { cn } from "@/lib/utils";

interface InvoiceCardProps {
  invoice: Invoice;
  index: number;
  onApprove: (id: string) => void;
  onFlag: (id: string) => void;
}

export function InvoiceCard({ invoice, index, onApprove, onFlag }: InvoiceCardProps) {
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const confidenceExplanation = invoice.confidence < 60
    ? "Low confidence due to missing GSTIN or unreadable fields"
    : invoice.confidence < 85
    ? "Medium confidence — some fields may need manual verification"
    : "High confidence — all fields extracted successfully";

  return (
    <Card className="transition-all duration-300 hover:shadow-md border-border/60 animate-fade-in-up" style={{ animationDelay: `${index * 80}ms` }}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">{invoice.invoiceNumber}</p>
              <p className="text-xs text-muted-foreground">{invoice.date}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ConfidenceBadge score={invoice.confidence} />
            <StatusBadge status={invoice.status} />
            {invoice.classification && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${invoice.classification === "gst-ready" ? "bg-success/10 text-success" : invoice.classification === "needs-review" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>
                {invoice.classification === "gst-ready" ? "GST-ready" : invoice.classification === "needs-review" ? "Review" : "Non-GST"}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-3">
          <div>
            <span className="text-muted-foreground text-xs">Supplier</span>
            <p className="font-medium truncate">{invoice.supplierName}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">GSTIN</span>
            <p className={cn("font-mono text-xs", !invoice.gstinValid && "text-destructive font-semibold")}>
              {invoice.supplierGstin || "—"}
              {!invoice.gstinValid && invoice.supplierGstin && (
                <span className="ml-1 text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">Invalid</span>
              )}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">HSN Code</span>
            <p className="font-mono">{invoice.hsnCode || "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Tax Rate</span>
            <p>{invoice.taxRate}%</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Net Amount</span>
            <p className="font-semibold">{formatCurrency(invoice.netAmount)}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Tax</span>
            <p>{formatCurrency(invoice.taxAmount)}</p>
          </div>
        </div>

        {/* Confidence explanation */}
        <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3" />
          {confidenceExplanation}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <p className="text-sm font-bold">Total: {formatCurrency(invoice.totalAmount)}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 text-primary hover:text-primary" onClick={() => {}}>
              <Pencil className="w-3 h-3" /> Edit
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 text-warning hover:text-warning border-warning/30 hover:bg-warning/10" onClick={() => onFlag(invoice.id)}>
              <Flag className="w-3 h-3" /> Flag
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-success hover:bg-success/90 text-success-foreground" onClick={() => onApprove(invoice.id)}>
              <Check className="w-3 h-3" /> Approve
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
