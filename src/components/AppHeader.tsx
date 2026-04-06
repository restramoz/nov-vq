import { Link } from "react-router-dom";
import { Plus, Settings, Shield } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
            <Shield className="h-7 w-7 rune-text transition-all group-hover:scale-110" />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold rune-text" style={{ fontFamily: 'MedievalSharp, serif' }}>ᛟ</span>
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            Novel <span className="rune-text">AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Button asChild variant="default" size="sm" className="rune-glow">
            <Link to="/create">
              <Plus className="mr-1 h-4 w-4" /> Tempa Novel
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="rune-border rounded-full">
            <Link to="/settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
