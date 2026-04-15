import { Building2, FileText, Clock, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Client } from "@/data/mockData";

interface ClientCardProps {
  client: Client;
  onSelect: (id: string) => void;
  index: number;
}

export function ClientCard({ client, onSelect, index }: ClientCardProps) {
  return (
    <Card
      className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 border-border/60 animate-fade-in-up"
      style={{ animationDelay: `${index * 100}ms` }}
      onClick={() => onSelect(client.id)}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {client.name}
              </h3>
              {client.gstin && (
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  GSTIN: {client.gstin}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <FileText className="w-3.5 h-3.5" />
                  {client.invoiceCount} invoices
                </span>
                {client.pendingCount > 0 && (
                  <span className="flex items-center gap-1.5 text-sm text-warning">
                    <Clock className="w-3.5 h-3.5" />
                    {client.pendingCount} pending
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Last activity: {client.lastActivity}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(client.id);
            }}
          >
            View Invoices
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
