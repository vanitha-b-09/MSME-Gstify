import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Search, Loader2, Building2, Mail, Phone, MapPin, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clientsService } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import { CATEGORY_LABELS, type Client, type ClientCategory } from "@/types";

type Filter = ClientCategory | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "trading", label: "Trading" },
  { value: "services", label: "Services" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "retail", label: "Retail" },
  { value: "construction", label: "Construction" },
  { value: "logistics", label: "Logistics" },
  { value: "exports", label: "Exports" },
  { value: "other", label: "Other" },
];

const createClientSchema = z.object({
  name: z.string().trim().min(2, "Client name must be at least 2 characters."),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .length(15, "GSTIN must be exactly 15 characters.")
    .regex(/^[0-9A-Z]{15}$/, "GSTIN must be uppercase letters and numbers only."),
  category: z.custom<ClientCategory>(),
  contactEmail: z.string().trim().email("Enter a valid email.").optional().or(z.literal("")),
  contactPhone: z.string().trim().optional().or(z.literal("")),
  state: z.string().trim().min(1, "State is required.").optional().or(z.literal("")),
});

const Clients = () => {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    gstin: "",
    category: "other" as ClientCategory,
    contactEmail: "",
    contactPhone: "",
    state: "",
  });

  useEffect(() => {
    document.title = "Clients — GST Notice Manager";
  }, []);

  useEffect(() => {
    setLoading(true);
    clientsService
      .list(filter)
      .then(setClients)
      .catch((e) =>
        toast({
          variant: "destructive",
          title: "Failed to load clients",
          description: e instanceof Error ? e.message : "Unknown error",
        })
      )
      .finally(() => setLoading(false));
  }, [filter, toast]);

  const reload = async () => {
    setLoading(true);
    try {
      const list = await clientsService.list(filter);
      setClients(list);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Failed to load clients",
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  const onCreateClient = async () => {
    const parsed = createClientSchema.safeParse({
      ...form,
      gstin: form.gstin.toUpperCase(),
      state: form.state || "—",
      contactEmail: form.contactEmail || undefined,
      contactPhone: form.contactPhone || undefined,
    });
    if (!parsed.success) {
      toast({
        variant: "destructive",
        title: "Invalid client details",
        description: parsed.error.issues[0]?.message,
      });
      return;
    }

    setSaving(true);
    try {
      await clientsService.create({
        name: parsed.data.name,
        gstin: parsed.data.gstin,
        category: parsed.data.category,
        contactEmail: parsed.data.contactEmail || undefined,
        contactPhone: parsed.data.contactPhone || undefined,
        state: parsed.data.state || "—",
      });
      toast({ title: "Client saved" });
      setOpen(false);
      setForm({
        name: "",
        gstin: "",
        category: "other",
        contactEmail: "",
        contactPhone: "",
        state: "",
      });
      await reload();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Failed to save client",
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || c.gstin.toLowerCase().includes(q) || c.state.toLowerCase().includes(q)
    );
  }, [clients, query]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Clients</h1>
          <p className="text-sm text-muted-foreground">Browse, filter, and add clients.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add client</DialogTitle>
              <DialogDescription>
                Save client details so they appear everywhere (cases, dashboard, and clients list).
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="c_name">Client name</Label>
                <Input
                  id="c_name"
                  placeholder="Acme Traders Pvt Ltd"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="c_gstin">GSTIN</Label>
                <Input
                  id="c_gstin"
                  placeholder="27AAAAA0000A1Z5"
                  value={form.gstin}
                  onChange={(e) => setForm((p) => ({ ...p, gstin: e.target.value.toUpperCase() }))}
                  maxLength={15}
                  className="uppercase"
                />
              </div>

              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((p) => ({ ...p, category: v as ClientCategory }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="c_email">Email (optional)</Label>
                  <Input
                    id="c_email"
                    placeholder="accounts@acme.in"
                    value={form.contactEmail}
                    onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c_phone">Phone (optional)</Label>
                  <Input
                    id="c_phone"
                    placeholder="+91 98200 11111"
                    value={form.contactPhone}
                    onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="c_state">State</Label>
                <Input
                  id="c_state"
                  placeholder="Maharashtra"
                  value={form.state}
                  onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={onCreateClient} disabled={saving}>
                {saving ? "Saving…" : "Save client"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search by name, GSTIN, or state"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(v) => v && setFilter(v as Filter)}
          className="flex flex-wrap justify-start gap-2"
        >
          {FILTERS.map((f) => (
            <ToggleGroupItem
              key={f.value}
              value={f.value}
              className="rounded-full border bg-card px-3 text-xs font-medium data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {f.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading clients…
        </div>
      ) : visible.length === 0 ? (
        <Card className="shadow-[var(--shadow-card)]">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium">No clients found</p>
            <p className="text-sm text-muted-foreground">Try a different category or search term.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((c) => (
            <Card key={c.id} className="shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elegant)]">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="font-normal">
                    {CATEGORY_LABELS[c.category]}
                  </Badge>
                </div>
                <CardTitle className="mt-3 text-base leading-snug">{c.name}</CardTitle>
                <p className="font-mono text-xs text-muted-foreground">{c.gstin}</p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {c.contactEmail && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate">{c.contactEmail}</span>
                  </div>
                )}
                {c.contactPhone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {c.contactPhone}
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {c.state}
                </div>
                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <span className="text-xs text-muted-foreground">Active cases</span>
                  <span className="text-sm font-semibold">{c.activeCases}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Clients;
