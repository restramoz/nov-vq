import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { Crown, Pencil, Search, Eye } from "lucide-react";
import { getOllamaConfig } from "@/lib/ollama";

export interface CouncilMember {
  role: "writer" | "analyst" | "reviewer";
  model: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  colorClass: string;
  dotClass: string;
}

const DEFAULT_MODELS = [
  "deepseek-v3.2:cloud",
  "glm-5:cloud",
  "nemotron-3-super:cloud",
  "qwen3.5:cloud",
  "gemini-flash:cloud",
];

const DEFAULT_COUNCIL: CouncilMember[] = [
  {
    role: "writer",
    model: "deepseek-v3.2:cloud",
    label: "Writer",
    icon: <Pencil className="h-4 w-4" />,
    description: "Menulis narasi dan dialog",
    colorClass: "text-green-400",
    dotClass: "bg-green-400",
  },
  {
    role: "analyst",
    model: "glm-5:cloud",
    label: "Analyst",
    icon: <Search className="h-4 w-4" />,
    description: "Analisis plot & konsistensi",
    colorClass: "night-text",
    dotClass: "bg-[hsl(210,55%,30%)]",
  },
  {
    role: "reviewer",
    model: "nemotron-3-super:cloud",
    label: "Reviewer",
    icon: <Eye className="h-4 w-4" />,
    description: "Review kualitas & perbaikan",
    colorClass: "mystic-text",
    dotClass: "bg-[hsl(275,60%,30%)]",
  },
];

interface AICouncilProps {
  council: CouncilMember[];
  onCouncilChange: (council: CouncilMember[]) => void;
}

export function AICouncil({ council, onCouncilChange }: AICouncilProps) {
  const config = getOllamaConfig();

  const updateMemberModel = (role: string, model: string) => {
    onCouncilChange(
      council.map((m) => (m.role === role ? { ...m, model } : m))
    );
  };

  return (
    <CollapsibleSection
      icon={<Crown className="h-5 w-5 rune-text" />}
      title="AI Council"
      hasContent
    >
      <div className="space-y-3">
        {council.map((member) => (
          <div
            key={member.role}
            className="flex items-center gap-3 rounded-lg rune-border bg-secondary/20 p-3"
          >
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${member.dotClass}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {member.icon}
                <span className="font-display font-semibold text-sm">{member.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{member.description}</p>
            </div>
            <Select value={member.model} onValueChange={(v) => updateMemberModel(member.role, v)}>
              <SelectTrigger className="w-40 h-8 text-xs rune-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_MODELS.map((m) => (
                  <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        <p className="text-xs text-muted-foreground mt-2">
          Writer menghasilkan teks, Analyst memeriksa plot, Reviewer menyempurnakan kualitas.
        </p>
      </div>
    </CollapsibleSection>
  );
}

export function getDefaultCouncil(): CouncilMember[] {
  // Load from localStorage if available
  const saved = localStorage.getItem("ai_council");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return DEFAULT_COUNCIL.map((def, i) => ({
        ...def,
        model: parsed[i]?.model || def.model,
      }));
    } catch { /* ignore */ }
  }
  return [...DEFAULT_COUNCIL];
}

export function saveCouncil(council: CouncilMember[]) {
  localStorage.setItem("ai_council", JSON.stringify(council.map(c => ({ role: c.role, model: c.model }))));
}
