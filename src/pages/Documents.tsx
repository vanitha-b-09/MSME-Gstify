import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { mockInvoices } from "@/data/mockData";
import { Search, FileText, Tag, Calendar, Building2, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function Documents() {
  const [search, setSearch] = useState("");
  const [filterBy, setFilterBy] = useState("all");

  const filtered = mockInvoices.filter((inv) => {
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      inv.supplierGstin.toLowerCase().includes(search.toLowerCase());
    if (filterBy === "all") return matchesSearch;
    return matchesSearch && inv.status === filterBy;
  });

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-2xl font-bold">Document Management</h1>
            <p className="text-muted-foreground text-sm mt-1">Search, filter, and manage all invoices</p>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by invoice #, vendor, or GSTIN..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground mb-4">{filtered.length} documents found</p>

          {/* Document List */}
          <div className="space-y-3">
            {filtered.map((inv, i) => (
              <Card key={inv.id} className="border-border/60 hover:shadow-md transition-all animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{inv.fileName}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="w-3 h-3" />{inv.invoiceNumber}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{inv.date}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" />{inv.supplierName}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-sm font-semibold">{formatCurrency(inv.totalAmount)}</p>
                      <StatusBadge status={inv.status} />
                    </div>
                  </div>
                  {inv.supplierGstin && (
                    <div className="mt-2 ml-14">
                      <span className="text-xs font-mono text-muted-foreground">GSTIN: {inv.supplierGstin}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">No documents match your search.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
