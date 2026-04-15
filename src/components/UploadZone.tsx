import { useState, useCallback } from "react";
import { Upload, File, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadedFile {
  name: string;
  size: string;
  progress: number;
  done: boolean;
}

interface UploadZoneProps {
  onUploadComplete: () => void;
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const simulateUpload = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const newFiles: UploadedFile[] = Array.from(fileList).map((f) => ({
        name: f.name,
        size: (f.size / 1024).toFixed(1) + " KB",
        progress: 0,
        done: false,
      }));
      setFiles((prev) => [...prev, ...newFiles]);

      newFiles.forEach((file, i) => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 30 + 10;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setFiles((prev) =>
              prev.map((f) =>
                f.name === file.name ? { ...f, progress: 100, done: true } : f
              )
            );
            if (i === newFiles.length - 1) {
              setTimeout(onUploadComplete, 500);
            }
          } else {
            setFiles((prev) =>
              prev.map((f) =>
                f.name === file.name ? { ...f, progress } : f
              )
            );
          }
        }, 300);
      });
    },
    [onUploadComplete]
  );

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 cursor-pointer",
          dragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          simulateUpload(e.dataTransfer.files);
        }}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          input.accept = ".pdf,.jpg,.jpeg,.png";
          input.onchange = () => simulateUpload(input.files);
          input.click();
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center">
            <Upload className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              Drop invoices here or click to browse
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Supports PDF, JPG, PNG • Max 10MB per file
            </p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.name}
              className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/60 animate-scale-in"
            >
              <File className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <span className="text-xs text-muted-foreground ml-2">
                    {file.size}
                  </span>
                </div>
                {!file.done && (
                  <div className="w-full bg-muted rounded-full h-1.5 mt-1.5">
                    <div
                      className="gradient-primary h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}
              </div>
              {file.done ? (
                <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
              ) : (
                <button onClick={() => removeFile(file.name)}>
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
