import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge  from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { casesService } from "@/lib/services";
import type { CaseStatus, CaseSummary } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { getGreeting } from "@/lib/greeting";
import { ExtractedDataPanel } from "@/components/ExtractedDataPanel";

const statusOptions: Array<{ value: "all" | CaseStatus; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "uploaded", label: "Uploaded" },
  { value: "processing", label: "Processing" },
  { value: "ready", label: "Ready" },
  { value: "submitted", label: "Submitted" },
  { value: "error", label: "Error" },
];

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | CaseStatus>("all");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Dashboard — GST Notice Manager";
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    casesService
      .list(user)
      .then((rows) => {
        setCases(rows);
        setSelectedCaseId((prev) => prev || rows[0]?.id || null);
      })
      .catch((e) =>
        toast({
          variant: "destructive",
          title: "Failed to load cases",
          description: e instanceof Error ? e.message : "Unknown error",
        })
      )
      .finally(() => setLoading(false));
  }, [user, toast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cases.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (!q) return true;
      return (
        c.clientName.toLowerCase().includes(q) ||
        c.gstin.toLowerCase().includes(q) ||
        c.noticeType.toLowerCase().includes(q)
      );
    });
  }, [cases, query, status]);

  const counts = useMemo(() => {
    const by = (s: CaseStatus) => cases.filter((c) => c.status === s).length;
    return { total: cases.length, processing: by("processing"), ready: by("ready"), submitted: by("submitted") };
  }, [cases]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">
            {getGreeting()}, {user?.name?.split(" ")[0] || "there"} 👋
          </p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {user?.role === "admin" ? "All cases across the firm." : "Your active GST notice cases."}
          </p>
        </div>
        <Button asChild>
          <Link to="/upload">
            <Plus className="mr-2 h-4 w-4" />
            New Case
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total cases" value={counts.total} />
        <StatCard label="Processing" value={counts.processing} />
        <StatCard label="Ready to file" value={counts.ready} />
        <StatCard label="Submitted" value={counts.submitted} />
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-base">Cases</CardTitle>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="md:w-72 pl-8"
                  placeholder="Search by client, GSTIN, type"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger className="md:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading cases…
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState hasAny={cases.length > 0} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead>Notice type</TableHead>
                    <TableHead>Status</TableHead>
                    {user?.role === "admin" && <TableHead>Owner</TableHead>}
                    <TableHead className="text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/cases/${c.id}`)}
                    >
                      <TableCell className="font-medium">{c.clientName}</TableCell>
                      <TableCell className="font-mono text-xs">{c.gstin}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.noticeType}</TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} />
                      </TableCell>
                      {user?.role === "admin" && (
                        <TableCell className="text-sm text-muted-foreground">{c.ownerName || "—"}</TableCell>
                      )}
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base">Extracted data</CardTitle>
              <p className="text-sm text-muted-foreground">Preview PDFs and extracted fields for a selected case.</p>
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <Select value={selectedCaseId ?? ""} onValueChange={(v) => setSelectedCaseId(v || null)}>
                <SelectTrigger className="md:w-80">
                  <SelectValue placeholder="Select a case" />
                </SelectTrigger>
                <SelectContent>
                  {filtered.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.clientName} — {c.gstin}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCaseId && (
                <Button variant="outline" onClick={() => navigate(`/cases/${selectedCaseId}`)}>
                  Open case
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {selectedCaseId ? (
            <ExtractedDataPanel
              caseId={selectedCaseId}
              caseGstin={cases.find((c) => c.id === selectedCaseId)?.gstin || ""}
            />
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">Select a case to view extracted data.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <Card className="shadow-[var(--shadow-card)]">
    <CardContent className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </CardContent>
  </Card>
);

const EmptyState = ({ hasAny }: { hasAny: boolean }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
      <FileText className="h-6 w-6 text-muted-foreground" />
    </div>
    <div>
      <p className="font-medium">{hasAny ? "No cases match your filters" : "No cases yet"}</p>
      <p className="text-sm text-muted-foreground">
        {hasAny ? "Try clearing search or status filter." : "Upload your first GST notice to get started."}
      </p>
    </div>
    {!hasAny && (
      <Button asChild className="mt-2">
        <Link to="/upload">
          <Plus className="mr-2 h-4 w-4" />
          New Case
        </Link>
      </Button>
    )}
  </div>
);

export default Dashboard;
