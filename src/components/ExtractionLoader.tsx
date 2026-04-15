import { Brain, Sparkles } from "lucide-react";

export function ExtractionLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center animate-pulse-slow">
          <Brain className="w-10 h-10 text-primary-foreground" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent flex items-center justify-center animate-bounce">
          <Sparkles className="w-4 h-4 text-accent-foreground" />
        </div>
      </div>
      <h3 className="mt-6 font-semibold text-lg">AI is extracting invoice data…</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Analyzing documents, detecting fields, and validating GSTINs
      </p>
      <div className="w-64 bg-muted rounded-full h-2 mt-6 overflow-hidden">
        <div className="gradient-primary h-2 rounded-full animate-progress" />
      </div>
    </div>
  );
}
