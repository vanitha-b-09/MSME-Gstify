import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { caseFilesService, casesService } from "@/lib/services";
import { extractGstin } from "@/lib/gstin";
import { useToast } from "@/hooks/use-toast";

type CaseFileRow = {
  id: string;
  file_key: string;
  file_type?: string;
  parsed_data?: unknown;
  created_at: string;
};

type ReconciliationResult = {
  reconciliation_status?: string;
  mismatches?: Array<Record<string, unknown>>;
  summary?: Record<string, unknown>;
  risk_level?: string;
};

const imageExts = new Set(["png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff", "heic", "heif"]);

const getExt = (name: string) => {
  const parts = name.split(".");
  return (parts.length > 1 ? parts[parts.length - 1] : "").toLowerCase();
};

const normalizeRequired = (parsed: unknown, fallbackGstin?: string) => {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const numLike = (v: unknown) =>
    typeof v === "number" ? String(v) : typeof v === "string" ? v.trim() : "";
  const arrStr = (v: unknown) =>
    Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : "")).filter(Boolean) : [];

  const required = [
    { label: "GSTIN", value: extractGstin(obj) || str(obj.gstin) || str(obj.GSTIN) || (fallbackGstin || "") },
    { label: "Date", value: str(obj.date) || str(obj.invoice_date) || str(obj.issued_on) },
    {
      label: "Invoice / Notice No.",
      value: str(obj.invoice_number) || str(obj.invoiceNo) || str(obj.invoice_no) || str(obj.notice_number),
    },
    { label: "Amount", value: numLike(obj.amount) || numLike(obj.total_amount) || numLike(obj.total) },
    { label: "Notice Type", value: str(obj.notice_type) || str(obj.type) || str(obj.document_type) },
    { label: "Sections", value: arrStr(obj.sections).join(", ") },
  ];

  const hasAny = required.some((x) => x.value);
  return hasAny ? required : null;
};

export function ExtractedDataPanel({ caseId, caseGstin }: { caseId: string; caseGstin?: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reprocessing, setReprocessing] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [files, setFiles] = useState<CaseFileRow[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationResult | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await caseFilesService.list(caseId);
      const mapped: CaseFileRow[] = res.map((x) => ({
        id: x.id,
        file_key: x.file_key,
        file_type: x.file_type,
        parsed_data: x.parsed_data,
        created_at: x.created_at,
      }));
      setFiles(mapped);
      setSelectedFileId((prev) => (prev && mapped.some((m) => m.id === prev) ? prev : mapped[0]?.id || null));
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Failed to load extracted data",
        description: e instanceof Error ? e.message : "Unknown error",
      });
      setFiles([]);
      setSelectedFileId(null);
    } finally {
      setLoading(false);
    }
  }, [caseId, toast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const selectedFile = useMemo(() => files.find((f) => f.id === selectedFileId) || null, [files, selectedFileId]);
  const previewUrl = useMemo(() => (selectedFile ? caseFilesService.fileContentUrl(selectedFile.id) : null), [selectedFile]);
  const ext = useMemo(() => (selectedFile ? getExt(selectedFile.file_key) : ""), [selectedFile]);
  const required = useMemo(() => normalizeRequired(selectedFile?.parsed_data, caseGstin), [selectedFile, caseGstin]);
  const mismatchCount = useMemo(() => {
    if (Array.isArray(reconciliation?.mismatches)) return reconciliation.mismatches.length;
    return Number(reconciliation?.summary?.total_mismatches || 0);
  }, [reconciliation]);

  const reprocessSelected = async () => {
    if (!selectedFile) return;
    setReprocessing(true);
    try {
      await caseFilesService.reprocess(selectedFile.id);
      toast({ title: "Re-extract complete" });
      await reload();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Re-extract failed",
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setReprocessing(false);
    }
  };

  const runReconciliation = async () => {
    setReconciling(true);
    try {
      const result = await casesService.reconcileGstr(caseId);
      setReconciliation(result?.data || null);
      toast({ title: "GST reconciliation complete" });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "GST reconciliation failed",
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setReconciling(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Extracted data</CardTitle>
              <CardDescription>{selectedFile ? selectedFile.file_key : "Select a file to view details"}</CardDescription>
            </div>
            <Button type="button" variant="outline" disabled={!selectedFile || reprocessing} onClick={reprocessSelected}>
              {reprocessing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Re-extracting…
                </span>
              ) : (
                "Re-extract"
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedFile ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Pick a file to see its PDF + details.</div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">PDF / document preview</div>
                {previewUrl ? (
                  ext === "pdf" ? (
                    <iframe
                      title={`Preview ${selectedFile.file_key}`}
                      src={previewUrl}
                      className="h-[420px] w-full rounded-md border bg-background"
                    />
                  ) : imageExts.has(ext) ? (
                    <img
                      src={previewUrl}
                      alt={selectedFile.file_key}
                      className="max-h-[420px] w-full rounded-md border bg-background object-contain"
                    />
                  ) : (
                    <a className="text-sm text-primary underline underline-offset-4" href={previewUrl} target="_blank" rel="noreferrer">
                      Download / open file
                    </a>
                  )
                ) : (
                  <div className="text-sm text-muted-foreground">Preview unavailable</div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Required details</div>
                {required ? (
                  <div className="grid gap-2 rounded-md border bg-muted/20 p-3 text-sm">
                    {required.map((row) => (
                      <div key={row.label} className="flex items-start justify-between gap-3">
                        <div className="text-muted-foreground">{row.label}</div>
                        <div className={row.value ? "text-foreground" : "text-muted-foreground"}>{row.value || "N/A"}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                    No required fields available yet (unstructured/blank doc, OCR failed, or parser returned a different format).
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Raw extracted JSON</div>
                {selectedFile.parsed_data && typeof selectedFile.parsed_data === "object" ? (
                  <pre className="max-h-[320px] overflow-auto rounded-md border bg-muted/30 p-3 text-xs leading-relaxed">
                    {JSON.stringify(selectedFile.parsed_data, null, 2)}
                  </pre>
                ) : (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">No extracted JSON yet.</div>
                )}
              </div>

              <div className="space-y-2">
                <Button type="button" onClick={runReconciliation} disabled={reconciling || files.length === 0}>
                  {reconciling ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Reconciling...
                    </span>
                  ) : (
                    "GST Reconciliation"
                  )}
                </Button>
              </div>

              {reconciliation ? (
                <>
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Reconciliation Summary</div>
                    <div className="grid gap-2 rounded-md border bg-muted/20 p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-muted-foreground">Status</div>
                        <div className="text-foreground">{String(reconciliation.reconciliation_status || "unknown")}</div>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-muted-foreground">Total records processed</div>
                        <div className="text-foreground">{files.length}</div>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-muted-foreground">Matched records count</div>
                        <div className="text-foreground">{Math.max(files.length - mismatchCount, 0)}</div>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-muted-foreground">Mismatched records count</div>
                        <div className="text-foreground">{mismatchCount}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Mismatch Details</div>
                    {Array.isArray(reconciliation.mismatches) && reconciliation.mismatches.length > 0 ? (
                      <div className="space-y-2">
                        {reconciliation.mismatches.map((mismatch, idx) => (
                          <div key={`${String(mismatch.field || "field")}-${idx}`} className="rounded-md border bg-muted/20 p-3 text-sm">
                            {(() => {
                              const severity = String(mismatch.severity || "medium").toLowerCase();
                              const severityClass =
                                severity === "high" || severity === "critical"
                                  ? "bg-red-100 text-red-700 border border-red-200"
                                  : severity === "medium"
                                  ? "bg-amber-100 text-amber-700 border border-amber-200"
                                  : "bg-muted text-muted-foreground border border-border";
                              return (
                                <div className="mb-2 flex items-center justify-between gap-3">
                                  <div className="font-medium text-foreground">{String(mismatch.field || "Field mismatch")}</div>
                                  <div
                                    className={`rounded-sm px-2 py-0.5 text-[10px] uppercase tracking-wide ${severityClass}`}
                                  >
                                    {severity}
                                  </div>
                                </div>
                              );
                            })()}

                            <div className="grid gap-2 rounded-md border bg-background/60 p-2">
                              <div className="grid grid-cols-[110px_1fr] items-start gap-2">
                                <div className="text-[11px] font-medium text-muted-foreground">Expected</div>
                                <div className="break-words text-xs text-foreground">
                                  {String(mismatch.gstr1_value ?? "N/A")}
                                </div>
                              </div>
                              <div className="grid grid-cols-[110px_1fr] items-start gap-2">
                                <div className="text-[11px] font-medium text-muted-foreground">Actual</div>
                                <div className="break-words text-xs text-foreground">
                                  {String(mismatch.gstr3b_value ?? "N/A")}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                        No mismatch details available.
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Uploaded files
          </CardTitle>
          <CardDescription>{files.length} file(s)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading files…
            </div>
          ) : files.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No files uploaded yet.</div>
          ) : (
            files.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFileId(f.id)}
                className={[
                  "w-full rounded-md border px-3 py-2 text-left transition",
                  f.id === selectedFileId ? "border-primary/60 bg-primary/10" : "bg-muted/40 hover:bg-muted/60",
                ].join(" ")}
              >
                <p className="truncate text-sm font-medium">{f.file_key}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(f.created_at).toLocaleString("en-IN")} {f.file_type ? `• ${f.file_type}` : ""}
                </p>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

