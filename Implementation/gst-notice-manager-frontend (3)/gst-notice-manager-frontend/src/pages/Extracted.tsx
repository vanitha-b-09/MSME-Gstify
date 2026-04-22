import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  FileSearch,
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Pencil,
  Building2,
  Receipt,
  Calendar,
  IndianRupee,
  Check,
  X,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { extractedService } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import type { ExtractedData, ExtractedField } from "@/types";

type EditableData = ExtractedData & {
  fields: (ExtractedField & { edited?: boolean; original?: string })[];
};

const Extracted = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<EditableData[]>([]);
  const [originals, setOriginals] = useState<Record<string, ExtractedData>>({});
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [highlightLabel, setHighlightLabel] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Extracted Data — GST Notice Manager";
  }, []);

  useEffect(() => {
    setLoading(true);
    extractedService
      .list()
      .then((d) => {
        setItems(d.map((x) => ({ ...x, fields: x.fields.map((f) => ({ ...f })) })));
        const map: Record<string, ExtractedData> = {};
        d.forEach((x) => (map[x.caseId] = JSON.parse(JSON.stringify(x))));
        setOriginals(map);
      })
      .catch((e) =>
        toast({
          variant: "destructive",
          title: "Failed to load extracted data",
          description: e instanceof Error ? e.message : "Unknown error",
        })
      )
      .finally(() => setLoading(false));
  }, [toast]);

  const current = items[index];

  const updateField = (label: string, value: string) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i !== index
          ? it
          : {
              ...it,
              fields: it.fields.map((f) => {
                if (f.label !== label) return f;
                const ef = f as EditableData["fields"][number];
                return {
                  ...ef,
                  original: ef.original ?? ef.value,
                  value,
                  confidence: 1,
                  edited: true,
                };
              }),
            }
      )
    );
    setHighlightLabel(label);
    setTimeout(() => setHighlightLabel((l) => (l === label ? null : l)), 1200);
  };

  const resetField = (label: string) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        const orig = originals[it.caseId];
        const origField = orig?.fields.find((f) => f.label === label);
        if (!origField) return it;
        return {
          ...it,
          fields: it.fields.map((f) =>
            f.label !== label
              ? f
              : { ...origField, edited: false, original: undefined }
          ),
        };
      })
    );
  };

  const resetAll = () => {
    if (!current) return;
    const orig = originals[current.caseId];
    if (!orig) return;
    setItems((prev) =>
      prev.map((it, i) =>
        i !== index ? it : { ...JSON.parse(JSON.stringify(orig)) }
      )
    );
    toast({ title: "Reverted to original AI extraction" });
  };

  const editedCount = useMemo(
    () => current?.fields.filter((f) => (f as EditableData["fields"][number]).edited).length ?? 0,
    [current]
  );

  const avgConfidence = useMemo(() => {
    if (!current) return 0;
    const sum = current.fields.reduce((a, f) => a + f.confidence, 0);
    return Math.round((sum / current.fields.length) * 100);
  }, [current]);

  const lowConfidenceCount = useMemo(
    () => (current ? current.fields.filter((f) => f.confidence < 0.85).length : 0),
    [current]
  );

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading extracted data…
      </div>
    );
  }

  if (!current) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Extracted Data</h1>
          <p className="text-sm text-muted-foreground">AI-parsed details from uploaded GST notices.</p>
        </div>
        <Card className="shadow-[var(--shadow-card)]">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileSearch className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium">No extracted data yet</p>
            <p className="text-sm text-muted-foreground">Upload a notice to see parsed fields here.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const vendorFields = current.fields.filter((f) =>
    /gstin|name|address|state|officer|supply/i.test(f.label)
  );
  const invoiceFields = current.fields.filter(
    (f) => /notice|period|section|date|number/i.test(f.label) && !vendorFields.includes(f)
  );
  const amountFields = current.fields.filter(
    (f) => !vendorFields.includes(f) && !invoiceFields.includes(f)
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-3 md:px-6">
        <div className="flex items-center gap-2 md:gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {index + 1} of {items.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))}
            disabled={index === items.length - 1}
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="mx-1 h-6" />
          <div>
            <p className="font-mono text-sm font-semibold leading-tight">{current.noticeNumber}</p>
            <p className="text-xs text-muted-foreground">
              {current.clientName}
              {editedCount > 0 && (
                <span className="ml-2 text-primary">• {editedCount} edited</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            AI Confidence: {avgConfidence}%
          </Badge>
          {editedCount > 0 && (
            <Button variant="ghost" size="sm" onClick={resetAll}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Reset all
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="border-warning/40 text-warning hover:bg-warning/10 hover:text-warning"
          >
            <Flag className="mr-1.5 h-4 w-4" />
            Flag
          </Button>
          <Button
            size="sm"
            className="bg-success text-success-foreground hover:bg-success/90"
            onClick={() =>
              toast({
                title: "Notice approved",
                description: `${current.noticeNumber} marked as ready.`,
              })
            }
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Approve
          </Button>
        </div>
      </div>

      {/* Split view */}
      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2">
        {/* Left: PDF preview */}
        <div className="flex flex-col border-b bg-muted/30 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b bg-card/50 px-4 py-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">
                <FileText className="mr-1 h-3 w-3" />
                PDF
              </Badge>
              <span className="text-xs font-medium text-muted-foreground">
                notice_{current.caseId}.pdf
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Search className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">100%</span>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="flex justify-center p-6">
              <PdfMock data={current} highlightLabel={highlightLabel} />
            </div>
          </ScrollArea>
        </div>

        {/* Right: Extracted fields */}
        <div className="flex flex-col bg-background">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <h2 className="text-sm font-semibold">Extracted Data</h2>
            {lowConfidenceCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-warning">
                <AlertTriangle className="h-3.5 w-3.5" />
                {lowConfidenceCount} field{lowConfidenceCount > 1 ? "s" : ""} need attention
              </span>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-6 p-4 md:p-6">
              <FieldGroup
                icon={Building2}
                title="Vendor Details"
                fields={vendorFields}
                onSave={updateField}
                onReset={resetField}
              />
              <FieldGroup
                icon={Receipt}
                title="Invoice Details"
                fields={invoiceFields}
                onSave={updateField}
                onReset={resetField}
              />
              {amountFields.length > 0 && (
                <FieldGroup
                  icon={IndianRupee}
                  title="Amount Details"
                  fields={amountFields}
                  onSave={updateField}
                  onReset={resetField}
                />
              )}

              {/* Summary */}
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Summary
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">{current.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Issued: <strong className="text-foreground">{fmt(current.issuedOn)}</strong></span>
                  <span>•</span>
                  <span>Due: <strong className="text-warning">{fmt(current.dueOn)}</strong></span>
                  {current.amountDemanded && (
                    <>
                      <span>•</span>
                      <span>Demand: <strong className="text-foreground">{current.amountDemanded}</strong></span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

// ---------- Field group ----------
const FieldGroup = ({
  icon: Icon,
  title,
  fields,
  onSave,
  onReset,
}: {
  icon: typeof Building2;
  title: string;
  fields: (ExtractedField & { edited?: boolean })[];
  onSave: (label: string, value: string) => void;
  onReset: (label: string) => void;
}) => {
  if (fields.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">{title}</h3>
      </div>
      <div className="space-y-1">
        {fields.map((f) => (
          <FieldRow key={f.label} field={f} onSave={onSave} onReset={onReset} />
        ))}
      </div>
    </div>
  );
};

// ---------- Single field row (editable) ----------
const FieldRow = ({
  field,
  onSave,
  onReset,
}: {
  field: ExtractedField & { edited?: boolean };
  onSave: (label: string, value: string) => void;
  onReset: (label: string) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(field.value);

  useEffect(() => {
    if (!editing) setDraft(field.value);
  }, [field.value, editing]);

  const pct = Math.round(field.confidence * 100);
  const low = field.confidence < 0.85;

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== field.value) onSave(field.label, trimmed);
    setEditing(false);
  };

  return (
    <div
      className={`group flex items-start justify-between gap-3 rounded-md border px-3 py-2.5 transition-colors hover:bg-muted/50 ${
        field.edited
          ? "border-primary/40 bg-primary/5"
          : low
          ? "border-warning/40 bg-warning/5"
          : "border-transparent"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {field.label}
          </span>
          <ConfidenceBadge value={pct} />
          {field.edited && (
            <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              EDITED
            </span>
          )}
          {low && !field.edited && <AlertTriangle className="h-3 w-3 text-warning" />}
        </div>

        {editing ? (
          <div className="flex items-center gap-1.5">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") {
                  setDraft(field.value);
                  setEditing(false);
                }
              }}
              className="h-8 font-mono text-sm"
            />
            <Button size="icon" variant="default" className="h-8 w-8 shrink-0" onClick={commit} aria-label="Save">
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              onClick={() => {
                setDraft(field.value);
                setEditing(false);
              }}
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="block w-full break-words text-left font-mono text-sm font-medium text-foreground hover:text-primary"
          >
            {field.value}
          </button>
        )}
      </div>

      {!editing && (
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {field.edited && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onReset(field.label)}
              aria-label={`Revert ${field.label}`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${field.label}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
};

// ---------- Confidence pill ----------
const ConfidenceBadge = ({ value }: { value: number }) => {
  const tone =
    value >= 90
      ? "bg-success/15 text-success border-success/30"
      : value >= 75
      ? "bg-warning/15 text-warning border-warning/30"
      : "bg-destructive/15 text-destructive border-destructive/30";
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${tone}`}>
      {value}%
    </span>
  );
};

// ---------- Mocked PDF preview (reflects edits live) ----------
const PdfMock = ({
  data,
  highlightLabel,
}: {
  data: EditableData;
  highlightLabel: string | null;
}) => {
  const get = (re: RegExp) => data.fields.find((f) => re.test(f.label));
  const vendorName = get(/vendor.*name|^name|client/i);
  const vendorGstin = get(/gstin/i);
  const vendorAddress = get(/address/i);
  const noticeNo = get(/notice.*number/i) ?? get(/number/i);
  const period = get(/period/i);
  const officer = get(/officer/i);

  const flash = (label?: string) =>
    label && highlightLabel === label
      ? "bg-primary/20 ring-2 ring-primary/40 transition-all"
      : "transition-all";

  return (
    <div className="w-full max-w-md rounded-md bg-white p-6 text-slate-800 shadow-lg ring-1 ring-black/5">
      <div className="mb-4 text-center">
        <h3 className={`rounded px-1 text-xl font-bold ${flash(vendorName?.label)}`}>
          {vendorName?.value ?? data.clientName}
        </h3>
        <div className="mt-1 rounded bg-slate-100 py-1 text-xs font-medium text-slate-600">
          GST Notice / {data.noticeType}
        </div>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="font-semibold">Issued To:</p>
          <p className={`rounded px-1 ${flash(vendorName?.label)}`}>
            {vendorName?.value ?? data.clientName}
          </p>
          <p className={`rounded px-1 font-mono ${flash(vendorGstin?.label)}`}>
            GSTIN: {vendorGstin?.value ?? data.gstin}
          </p>
          {vendorAddress && (
            <p className={`mt-1 rounded px-1 ${flash(vendorAddress.label)}`}>
              {vendorAddress.value}
            </p>
          )}
        </div>
        <div className="rounded bg-amber-50 p-2">
          <p className="font-semibold">From Department:</p>
          <p>{data.section}</p>
          {officer && (
            <p className={`mt-1 rounded px-1 text-[11px] ${flash(officer.label)}`}>
              {officer.value}
            </p>
          )}
        </div>
      </div>
      <div className="mb-3 border-y border-slate-200 py-2 text-xs">
        <p>
          <span className="font-semibold">Notice No:</span>{" "}
          <span className={`rounded px-1 font-mono ${flash(noticeNo?.label)}`}>
            {noticeNo?.value ?? data.noticeNumber}
          </span>
        </p>
        {period && (
          <p>
            <span className="font-semibold">Period:</span>{" "}
            <span className={`rounded px-1 ${flash(period.label)}`}>{period.value}</span>
          </p>
        )}
        <p>
          <span className="font-semibold">Date:</span> {fmt(data.issuedOn)}
        </p>
        <p>
          <span className="font-semibold">Due:</span> {fmt(data.dueOn)}
        </p>
      </div>
      <table className="w-full text-xs">
        <thead className="bg-slate-100">
          <tr>
            <th className="p-1.5 text-left">Description</th>
            <th className="p-1.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.fields
            .filter((f) => /tax|itc|interest|amount|reverse/i.test(f.label))
            .slice(0, 5)
            .map((f) => (
              <tr key={f.label} className="border-b border-slate-100">
                <td className="p-1.5">{f.label}</td>
                <td className={`p-1.5 text-right font-mono ${flash(f.label)}`}>{f.value}</td>
              </tr>
            ))}
        </tbody>
      </table>
      {data.amountDemanded && (
        <div className="mt-3 flex justify-between border-t-2 border-slate-800 pt-2 text-sm font-bold">
          <span>Total Demanded:</span>
          <span>{data.amountDemanded}</span>
        </div>
      )}
      <p className="mt-4 text-center text-[10px] text-slate-400">
        This is a system-generated preview. Edits sync live.
      </p>
    </div>
  );
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export default Extracted;
