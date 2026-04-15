import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockVendors } from "@/data/mockData";
import { Building2, Star, FileText, TrendingUp } from "lucide-react";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function Vendors() {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-2xl font-bold">Vendor Intelligence</h1>
            <p className="text-muted-foreground text-sm mt-1">Insights and reliability scores for all vendors</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockVendors.map((v, i) => (
              <Card key={v.name} className="border-border/60 hover:shadow-md transition-all animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{v.name}</p>
                        <p className="text-xs text-muted-foreground">Last: {v.lastInvoice}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className={`w-4 h-4 ${v.reliability >= 90 ? "text-success fill-success" : v.reliability >= 75 ? "text-warning fill-warning" : "text-destructive fill-destructive"}`} />
                      <span className={`text-sm font-bold ${v.reliability >= 90 ? "text-success" : v.reliability >= 75 ? "text-warning" : "text-destructive"}`}>{v.reliability}%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"><FileText className="w-3 h-3" />Invoices</div>
                      <p className="font-bold text-lg">{v.invoiceCount}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"><TrendingUp className="w-3 h-3" />Total</div>
                      <p className="font-bold text-sm">{formatCurrency(v.totalAmount)}</p>
                    </div>
                  </div>
                  {/* Reliability bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Reliability</span>
                      <span className="font-medium">{v.reliability}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${v.reliability >= 90 ? "bg-success" : v.reliability >= 75 ? "bg-warning" : "bg-destructive"}`} style={{ width: `${v.reliability}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
