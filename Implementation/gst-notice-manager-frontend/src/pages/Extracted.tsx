import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { casesService } from "@/lib/services";
import { useAuth } from "@/contexts/AuthContext";
import { ExtractedDataPanel } from "@/components/ExtractedDataPanel";
import type { CaseSummary } from "@/types";

const Extracted = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    casesService
      .list(user)
      .then(setCases)
      .finally(() => setLoading(false));
  }, [user]);

  const selectedCaseId = useMemo(() => {
    const fromQs = searchParams.get("caseId");
    if (fromQs) return fromQs;
    return cases[0]?.id || "";
  }, [cases, searchParams]);

  useEffect(() => {
    if (!selectedCaseId) return;
    searchParams.set("caseId", selectedCaseId);
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCaseId]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Extracted data</CardTitle>
            <Select
              value={selectedCaseId}
              onValueChange={(v) => {
                setSearchParams({ caseId: v }, { replace: true });
              }}
              disabled={loading || cases.length === 0}
            >
              <SelectTrigger className="md:w-80">
                <SelectValue placeholder={loading ? "Loading…" : "Select a case"} />
              </SelectTrigger>
              <SelectContent>
                {cases.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.clientName} — {c.gstin}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {selectedCaseId ? (
            <ExtractedDataPanel
              caseId={selectedCaseId}
              caseGstin={cases.find((c) => c.id === selectedCaseId)?.gstin || ""}
            />
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">No cases found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Extracted;