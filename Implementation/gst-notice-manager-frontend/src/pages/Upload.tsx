import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone, FileRejection } from "react-dropzone";
import { FileText, Files, Loader2, Trash2, UploadCloud } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { casesService } from "@/lib/services";

const MAX_NOTICE_BYTES = 20 * 1024 * 1024;
const MAX_GST_BYTES = 20 * 1024 * 1024;
const MAX_GST_FILES = 50;

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

const ALLOWED_EXTENSIONS = new Set(
  Object.values(SUPPORTED_MIME_TYPES).flat().map((ext) => ext.toLowerCase())
);

const metaSchema = z.object({
  clientName: z.string().trim().min(2, "Client name must be at least 2 characters."),
  gstin: z
    .string()
    .trim()
    .length(15, "GSTIN must be exactly 15 characters.")
    .regex(/^[0-9A-Z]{15}$/, "GSTIN must use uppercase letters and numbers only."),
});

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const Upload = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [clientName, setClientName] = useState("");
  const [gstin, setGstin] = useState("");
  const [noticeFile, setNoticeFile] = useState<File | null>(null);
  const [gstFiles, setGstFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "New case";
  }, []);

  const validateFile = useCallback((file: File, maxBytes: number) => {
    const ext = `.${(file.name.split(".").pop() || "").toLowerCase()}`;
    const extensionAllowed = ALLOWED_EXTENSIONS.has(ext);
    const mimeAllowed = !file.type || file.type in SUPPORTED_MIME_TYPES;

    if (!extensionAllowed || !mimeAllowed) {
      return "Only PDF, Excel, and image files are allowed.";
    }

    if (file.size > maxBytes) {
      return `File "${file.name}" exceeds ${(maxBytes / (1024 * 1024)).toFixed(0)}MB limit.`;
    }

    return null;
  }, []);

  const showRejectionToast = useCallback(
    (title: string, rejected: FileRejection[]) => {
      const reason =
        rejected[0]?.errors?.[0]?.message || "Selected file does not meet validation rules.";
      toast({
        variant: "destructive",
        title,
        description: reason,
      });
    },
    [toast]
  );

  // ===== NOTICE =====
  const onDropNotice = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected[0]) {
        showRejectionToast("Invalid notice file", rejected);
        return;
      }

      if (accepted[0]) {
        const validationError = validateFile(accepted[0], MAX_NOTICE_BYTES);
        if (validationError) {
          toast({
            variant: "destructive",
            title: "Invalid notice file",
            description: validationError,
          });
          return;
        }
        setNoticeFile(accepted[0]);
      }
    },
    [showRejectionToast, toast, validateFile]
  );

  // ===== GST FILES =====
  const onDropGst = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected[0]) {
        showRejectionToast("Some files were rejected", rejected);
      }

      if (accepted.length) {
        setGstFiles((prev) => {
          const existing = new Set(prev.map((f) => f.name + f.size));
          const remainingSlots = Math.max(0, MAX_GST_FILES - prev.length);

          const newFiles = accepted.filter(
            (f) => !existing.has(f.name + f.size)
          );

          const validated = newFiles.filter((f) => !validateFile(f, MAX_GST_BYTES));
          const invalidCount = newFiles.length - validated.length;

          if (invalidCount > 0) {
            toast({
              variant: "destructive",
              title: "Some files were skipped",
              description: `${invalidCount} file(s) failed type or size validation.`,
            });
          }

          if (validated.length > remainingSlots) {
            toast({
              variant: "destructive",
              title: "Upload limit reached",
              description: `Only ${MAX_GST_FILES} GST files are allowed per case.`,
            });
          }

          return [...prev, ...validated.slice(0, remainingSlots)];
        });
      }
    },
    [showRejectionToast, toast, validateFile]
  );

  // ===== DROPZONES =====
  const noticeDz = useDropzone({
    onDrop: onDropNotice,
    multiple: false,
    accept: SUPPORTED_MIME_TYPES,
    maxSize: MAX_NOTICE_BYTES,
  });

  const gstDz = useDropzone({
    onDrop: onDropGst,
    multiple: true,
    accept: SUPPORTED_MIME_TYPES,
    maxSize: MAX_GST_BYTES,
    maxFiles: MAX_GST_FILES,
  });

  // ===== SUBMIT =====
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (submitting) return;

    const parsedMeta = metaSchema.safeParse({ clientName, gstin });
    if (!parsedMeta.success) {
      toast({
        variant: "destructive",
        title: "Invalid case details",
        description: parsedMeta.error.issues[0]?.message,
      });
      return;
    }

    if (!noticeFile) {
      toast({
        variant: "destructive",
        title: "Notice is required",
        description: "Please upload a notice file before submitting.",
      });
      return;
    }

    setSubmitting(true);

    try {
      await casesService.create({
        clientName: parsedMeta.data.clientName,
        gstin: parsedMeta.data.gstin,
        noticeFile,
        gstFiles,
        currentUser: user,
      });

      toast({
        title: "Case created",
        description: "Files were uploaded successfully.",
      });
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Please verify files and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40 p-4 md:p-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl">Create New Case</CardTitle>
            <CardDescription>
              Upload notices, GST files, Excel sheets, images, and handwritten bills in one place.
            </CardDescription>
          </CardHeader>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Client Details</CardTitle>
              <CardDescription>Enter basic information before uploading files.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  placeholder="Enter client name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  placeholder="15 character GSTIN"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="h-11 uppercase"
                  maxLength={15}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Notice File
                </CardTitle>
                <CardDescription>One file up to 20MB. Supports PDF, Excel, and images.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  {...noticeDz.getRootProps()}
                  className="cursor-pointer rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center transition hover:border-primary/60 hover:bg-primary/10"
                >
                  <input {...noticeDz.getInputProps()} />
                  <UploadCloud className="mx-auto mb-3 h-8 w-8 text-primary" />
                  <p className="font-medium">Drop notice here or click to browse</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    PDF, XLS/XLSX, JPG/PNG/WebP and scanned handwritten bills
                  </p>
                </div>
                {noticeFile && (
                  <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                    <p className="font-medium text-foreground">{noticeFile.name}</p>
                    <p className="text-muted-foreground">{formatFileSize(noticeFile.size)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Files className="h-5 w-5 text-primary" />
                  GST Supporting Files
                </CardTitle>
                <CardDescription>
                  Bulk upload up to {MAX_GST_FILES} files, each up to 20MB.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  {...gstDz.getRootProps()}
                  className="cursor-pointer rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center transition hover:border-primary/60 hover:bg-primary/10"
                >
                  <input {...gstDz.getInputProps({ multiple: true })} />
                  <UploadCloud className="mx-auto mb-3 h-8 w-8 text-primary" />
                  <p className="font-medium">Drop GST files here or click to browse</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Accepted: PDF, Excel, images, handwritten bill photos/scans
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {gstFiles.length} / {MAX_GST_FILES} files selected
                </div>
              </CardContent>
            </Card>
          </div>

          {gstFiles.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Selected GST Files</CardTitle>
                <CardDescription>Review files before creating the case.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {gstFiles.map((file, i) => (
                  <div
                    key={`${file.name}-${file.size}-${i}`}
                    className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setGstFiles((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      aria-label={`Remove ${file.name}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="min-w-36">
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </span>
              ) : (
                "Create Case"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Upload;