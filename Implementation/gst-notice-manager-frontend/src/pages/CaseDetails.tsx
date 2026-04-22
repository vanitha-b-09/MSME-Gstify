import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDropzone, FileRejection } from "react-dropzone";
import { FileText, Loader2, Trash2, UploadCloud, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { caseFilesService, casesService } from "@/lib/services";
import { extractGstin } from "@/lib/gstin";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

const SUPPORTED_MIME_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/bmp": [".bmp"],
  "image/tiff": [".tif", ".tiff"],
  "image/heic": [".heic"],
  "image/heif": [".heif"],
} as const;

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const CaseDetails = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [reprocessing, setReprocessing] = useState(false);

  const [caseRow, setCaseRow] = useState<{
    client_name: string;
    client_gstin: string;
  } | null>(null);

  // ✅ UPDATED TYPE (added parsed_data)
  const [files, setFiles] = useState<
    Array<{
      id: string;
      file_key: string;
      file_type: string;
      parsed_data?: unknown;
      created_at: string;
    }>
  >([]);

  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const selectedFile = useMemo(() => {
    if (!selectedFileId) return null;
    return files.find((f) => f.id === selectedFileId) || null;
  }, [files, selectedFileId]);

  const selectedPreviewUrl = useMemo(() => {
    if (!selectedFile) return null;
    return caseFilesService.fileContentUrl(selectedFile.id);
  }, [selectedFile]);

  const selectedExt = useMemo(() => {
    if (!selectedFile) return "";
    const name = selectedFile.file_key || "";
    const parts = name.split(".");
    return (parts.length > 1 ? parts[parts.length - 1] : "").toLowerCase();
  }, [selectedFile]);

  const normalizedExtracted = useMemo(() => {
    const pd = selectedFile?.parsed_data;
    if (!pd || typeof pd !== "object") return null;
    const obj = pd as Record<string, unknown>;

    const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const numLike = (v: unknown) =>
      typeof v === "number" ? String(v) : typeof v === "string" ? v.trim() : "";
    const arrStr = (v: unknown) =>
      Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : "")).filter(Boolean) : [];

    // Common keys we’ve seen / expect from parser
    const gstin = extractGstin(obj) || str(obj.gstin) || str(obj.GSTIN) || (caseRow?.client_gstin ?? "");
    const date = str(obj.date) || str(obj.invoice_date) || str(obj.issued_on);
    const invoiceNumber = str(obj.invoice_number) || str(obj.invoiceNo) || str(obj.invoice_no);
    const amount = numLike(obj.amount) || numLike(obj.total_amount) || numLike(obj.total);
    const noticeType = str(obj.notice_type) || str(obj.type) || str(obj.document_type);
    const sections = arrStr(obj.sections);

    const required = [
      { label: "GSTIN", value: gstin },
      { label: "Date", value: date },
      { label: "Invoice / Notice No.", value: invoiceNumber },
      { label: "Amount", value: amount },
      { label: "Notice Type", value: noticeType },
      { label: "Sections", value: sections.length ? sections.join(", ") : "" },
    ];

    const hasAny = required.some((x) => x.value);
    return hasAny ? required : null;
  }, [selectedFile]);

  const title = useMemo(() => {
    if (!caseRow) return "Case";
    return `${caseRow.client_name} — ${caseRow.client_gstin}`;
  }, [caseRow]);

  const reload = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    try {
      const [c, f] = await Promise.all([casesService.get(caseId), caseFilesService.list(caseId)]);
      setCaseRow(c);

      // ✅ UPDATED mapping (added parsed_data)
      setFiles(
        f.map((x) => ({
          id: x.id,
          file_key: x.file_key,
          file_type: x.file_type,
          parsed_data: x.parsed_data,
          created_at: x.created_at,
        }))
      );

      setSelectedFileId((prev) => {
        if (prev && f.some((x) => x.id === prev)) return prev;
        return f[0]?.id || null;
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Failed to load case",
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, [caseId, toast]);

  useEffect(() => {
    document.title = "Case files — GST Notice Manager";
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onDrop = useCallback(
    async (accepted: File[], rejected: FileRejection[]) => {
      if (!caseId) return;
      if (rejected[0]) {
        toast({
          variant: "destructive",
          title: "Invalid file",
          description: rejected[0]?.errors?.[0]?.message,
        });
        return;
      }
      if (!accepted.length) return;

      setUploading(true);
      try {
        await caseFilesService.uploadMore(caseId, accepted);
        toast({ title: "Files added" });
        await reload();
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: e instanceof Error ? e.message : "Unknown error",
        });
      } finally {
        setUploading(false);
      }
    },
    [caseId, reload, toast]
  );

  const dz = useDropzone({
    onDrop,
    multiple: true,
    accept: SUPPORTED_MIME_TYPES,
    maxSize: MAX_FILE_BYTES,
  });

  const removeFile = async (fileId: string) => {
    setRemovingId(fileId);
    try {
      await caseFilesService.remove(fileId);
      toast({ title: "File removed" });
      await reload();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Remove failed",
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setRemovingId(null);
    }
  };

  const reprocessSelected = async () => {
    if (!selectedFile) return;
    setReprocessing(true);
    try {
      await caseFilesService.reprocess(selectedFile.id);
      toast({ title: "Re-extract started", description: "Updated extracted data will appear once processing completes." });
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
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Button variant="ghost" className="mb-2 -ml-3" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Case files</h1>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : (
        <>
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-primary" />
                Add more files
              </CardTitle>
              <CardDescription>
                Upload additional PDFs, Excel sheets, images, or bill photos. Max 20MB each.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                {...dz.getRootProps()}
                className="cursor-pointer rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center transition hover:border-primary/60 hover:bg-primary/10"
              >
                <input {...dz.getInputProps()} />
                <UploadCloud className="mx-auto mb-3 h-8 w-8 text-primary" />
                <p className="font-medium">{uploading ? "Uploading…" : "Drop files here or click to browse"}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Duplicate files are automatically ignored on the server.
                </p>
              </div>
            </CardContent>
          </Card>

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
                {files.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No files uploaded yet.
                  </div>
                ) : (
                  files.map((f) => (
                    <div
                      key={f.id}
                      className={[
                        "flex items-center justify-between rounded-md border px-3 py-2 transition",
                        f.id === selectedFileId ? "border-primary/60 bg-primary/10" : "bg-muted/40 hover:bg-muted/60",
                      ].join(" ")}
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => setSelectedFileId(f.id)}
                        aria-label={`View ${f.file_key}`}
                      >
                        <p className="truncate text-sm font-medium">{f.file_key}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(f.created_at).toLocaleString("en-IN")} • {f.file_type}
                        </p>
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(f.id)}
                        disabled={removingId === f.id}
                        aria-label={`Remove ${f.file_key}`}
                      >
                        {removingId === f.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>Extracted data</CardTitle>
                    <CardDescription>
                      {selectedFile ? `Showing extracted details for ${selectedFile.file_key}` : "Select a file to view details"}
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!selectedFile || reprocessing}
                    onClick={reprocessSelected}
                  >
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
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    Select an uploaded file to see its PDF preview and extracted fields.
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">Document preview</div>
                      {selectedPreviewUrl ? (
                        selectedExt === "pdf" ? (
                          <iframe
                            title={`Preview ${selectedFile.file_key}`}
                            src={selectedPreviewUrl}
                            className="h-[420px] w-full rounded-md border bg-background"
                          />
                        ) : ["png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff", "heic", "heif"].includes(selectedExt) ? (
                          <img
                            src={selectedPreviewUrl}
                            alt={selectedFile.file_key}
                            className="max-h-[420px] w-full rounded-md border object-contain bg-background"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <a
                            className="text-sm text-primary underline underline-offset-4"
                            href={selectedPreviewUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Download / open file
                          </a>
                        )
                      ) : (
                        <div className="text-sm text-muted-foreground">Preview unavailable</div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">Required details</div>
                      {normalizedExtracted ? (
                        <div className="grid gap-2 rounded-md border bg-muted/20 p-3 text-sm">
                          {normalizedExtracted.map((row) => (
                            <div key={row.label} className="flex items-start justify-between gap-3">
                              <div className="text-muted-foreground">{row.label}</div>
                              <div className={row.value ? "text-foreground" : "text-muted-foreground"}>
                                {row.value || "N/A"}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                          Couldn’t find the required fields in the extracted output yet. Try “Re-extract”, or update the parser to return these keys.
                        </div>
                      )}

                      <div className="text-xs font-medium text-muted-foreground">Raw extracted JSON</div>
                      {selectedFile.parsed_data &&
                      typeof selectedFile.parsed_data === "object" &&
                      selectedFile.parsed_data !== null &&
                      Object.keys(selectedFile.parsed_data as Record<string, unknown>).length > 0 ? (
                        <pre className="max-h-[320px] overflow-auto rounded-md border bg-muted/30 p-3 text-xs leading-relaxed">
                          {JSON.stringify(selectedFile.parsed_data, null, 2)}
                        </pre>
                      ) : (
                        <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                          No extracted data available yet (unstructured/blank document, OCR failed, or still processing).
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default CaseDetails;