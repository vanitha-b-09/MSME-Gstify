import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDropzone, FileRejection } from "react-dropzone";
import { FileText, Loader2, Trash2, UploadCloud, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { caseFilesService, casesService } from "@/lib/services";

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

  const [caseRow, setCaseRow] = useState<any>(null);
  const [files, setFiles] = useState<
    Array<{ id: string; file_key: string; file_type: string; created_at: string }>
  >([]);

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
      setFiles(
        f.map((x) => ({
          id: x.id,
          file_key: x.file_key,
          file_type: x.file_type,
          created_at: x.created_at,
        }))
      );
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
              <CardDescription>Upload additional PDFs, Excel sheets, images, or bill photos. Max 20MB each.</CardDescription>
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
                <div className="py-10 text-center text-sm text-muted-foreground">No files uploaded yet.</div>
              ) : (
                files.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{f.file_key}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(f.created_at).toLocaleString("en-IN")} • {f.file_type}
                      </p>
                    </div>
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
        </>
      )}
    </div>
  );
};

export default CaseDetails;

