import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { caseFilesService } from "@/lib/services";
import { extractGstin } from "@/lib/gstin";
import { useToast } from "@/hooks/use-toast";

type CaseFileRow = {
  id: string;
  file_key: string;
  file_type?: string;
  parsed_data?: unknown;
  created_at: string;
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
  const [files, setFiles] = useState<CaseFileRow[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

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

  return (
    <div className="grid gap-6 lg:grid-cols-2">
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

