import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CollapsibleSectionProps {
  icon: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  emptyText?: string;
  hasContent?: boolean;
}

export function CollapsibleSection({
  icon,
  title,
  actions,
  children,
  defaultOpen = false,
  emptyText,
  hasContent = true,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg rune-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          {icon} {title}
        </h2>
        <div className="flex gap-2">
          {hasContent && (
            <Button variant="ghost" size="sm" onClick={() => setOpen(!open)}>
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
          {actions}
        </div>
      </div>

      {open && hasContent && (
        <div className="text-sm bg-parchment dark:bg-secondary rounded-lg p-4 max-h-96 overflow-y-auto">
          {children}
        </div>
      )}

      {!hasContent && emptyText && (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}
