import { Loader2, Pencil, Search, Eye, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { FormattedContent } from "@/components/FormattedContent";
import type { CouncilResult } from "@/lib/council";

interface CouncilProgressProps {
  result: CouncilResult;
  streamText: string;
}

const phaseMap = {
  idle: { label: "Menunggu", progress: 0 },
  writing: { label: "Writer sedang menulis...", progress: 20 },
  analyzing: { label: "Analyst memeriksa konsistensi...", progress: 55 },
  reviewing: { label: "Reviewer menilai kualitas...", progress: 80 },
  done: { label: "Council selesai!", progress: 100 },
  error: { label: "Terjadi error", progress: 0 },
};

function PhaseIndicator({ phase, targetPhase, icon, label }: {
  phase: string;
  targetPhase: string;
  icon: React.ReactNode;
  label: string;
}) {
  const phases = ["writing", "analyzing", "reviewing", "done"];
  const currentIdx = phases.indexOf(phase);
  const targetIdx = phases.indexOf(targetPhase);
  
  const isActive = phase === targetPhase;
  const isDone = currentIdx > targetIdx || phase === "done";
  const isPending = currentIdx < targetIdx;

  return (
    <div className={`flex items-center gap-2 rounded-lg p-2.5 transition-all ${
      isActive ? "bg-primary/10 rune-border" : isDone ? "bg-green-500/10 border border-green-500/20" : "bg-secondary/30 border border-transparent"
    }`}>
      <div className={`flex-shrink-0 ${isActive ? "rune-text animate-pulse" : isDone ? "text-green-400" : "text-muted-foreground/40"}`}>
        {isActive ? <Loader2 className="h-4 w-4 animate-spin" /> : isDone ? <CheckCircle2 className="h-4 w-4" /> : icon}
      </div>
      <span className={`text-sm font-medium ${isActive ? "rune-text" : isDone ? "text-green-400" : "text-muted-foreground/50"}`}>
        {label}
      </span>
    </div>
  );
}

export function CouncilProgress({ result, streamText }: CouncilProgressProps) {
  const { phase } = result;
  const info = phaseMap[phase];

  if (phase === "idle") return null;

  return (
    <div className="rounded-lg rune-border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <span className="rune-text">ᛟ</span> AI Council Pipeline
        </h3>
        {result.qualityScore !== null && (
          <Badge variant={result.qualityScore >= 70 ? "default" : "destructive"} className="text-lg px-3 py-1 font-display">
            {result.qualityScore}/100
          </Badge>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <Progress value={info.progress} className="h-2" />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {phase !== "done" && phase !== "error" && <Loader2 className="h-3 w-3 animate-spin" />}
          {phase === "error" && <XCircle className="h-3 w-3 text-destructive" />}
          {phase === "done" && <CheckCircle2 className="h-3 w-3 text-green-400" />}
          <span>{info.label}</span>
        </div>
      </div>

      {/* Phase indicators */}
      <div className="grid grid-cols-3 gap-2">
        <PhaseIndicator phase={phase} targetPhase="writing" icon={<Pencil className="h-4 w-4" />} label="Writer" />
        <PhaseIndicator phase={phase} targetPhase="analyzing" icon={<Search className="h-4 w-4" />} label="Analyst" />
        <PhaseIndicator phase={phase} targetPhase="reviewing" icon={<Eye className="h-4 w-4" />} label="Reviewer" />
      </div>

      {/* Writer streaming output */}
      {phase === "writing" && streamText && (
        <div className="prose-reader max-h-72 overflow-y-auto rounded-lg bg-background/50 p-4 rune-border">
          <FormattedContent content={streamText} className="text-sm leading-relaxed mystical-typing" />
          <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5" />
        </div>
      )}

      {/* Analyst output */}
      {result.analystOutput && (
        <CollapsibleSection
          icon={<Search className="h-5 w-5 text-[hsl(210,55%,50%)]" />}
          title="Laporan Analyst"
          hasContent
        >
          <FormattedContent content={result.analystOutput} className="text-sm" />
        </CollapsibleSection>
      )}

      {/* Reviewer output */}
      {result.reviewerOutput && (
        <CollapsibleSection
          icon={<Eye className="h-5 w-5 text-[hsl(275,60%,50%)]" />}
          title="Laporan Reviewer"
          hasContent
        >
          <FormattedContent content={result.reviewerOutput} className="text-sm" />
        </CollapsibleSection>
      )}

      {/* Error */}
      {phase === "error" && result.error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {result.error}
        </div>
      )}
    </div>
  );
}
