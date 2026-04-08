import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Globe, Plus, Trash2, Save, Loader2, Sparkles, MapPin, Scroll } from "lucide-react";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { ollamaGenerate } from "@/lib/ollama";
import { PROMPTS } from "@/lib/prompts";

interface WorldElement {
  id: string;
  type: "location" | "lore" | "system" | "faction" | "item";
  name: string;
  description: string;
}

const TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; badge: string }> = {
  location: { label: "Lokasi", icon: <MapPin className="h-4 w-4" />, badge: "night-badge" },
  lore: { label: "Lore", icon: <Scroll className="h-4 w-4" />, badge: "mystic-badge" },
  system: { label: "Sistem", icon: <Globe className="h-4 w-4" />, badge: "rune-text" },
  faction: { label: "Faksi", icon: <Globe className="h-4 w-4" />, badge: "blood-badge" },
  item: { label: "Item", icon: <Sparkles className="h-4 w-4" />, badge: "" },
};

export default function Worldbuilding() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [novel, setNovel] = useState<any>(null);
  const [elements, setElements] = useState<WorldElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<string>("location");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("novels").select("*").eq("id", id).single();
      setNovel(data);
      // Load world elements from localStorage
      const saved = localStorage.getItem(`world_${id}`);
      if (saved) setElements(JSON.parse(saved));
      setLoading(false);
    })();
  }, [id]);

  const saveElements = (els: WorldElement[]) => {
    setElements(els);
    localStorage.setItem(`world_${id}`, JSON.stringify(els));
  };

  const addElement = () => {
    if (!newName.trim()) return;
    saveElements([...elements, {
      id: crypto.randomUUID(),
      type: newType as any,
      name: newName.trim(),
      description: newDesc.trim(),
    }]);
    setNewName("");
    setNewDesc("");
    toast({ title: "Elemen dunia ditambahkan" });
  };

  const deleteElement = (elId: string) => {
    saveElements(elements.filter(e => e.id !== elId));
  };

  const generateWorld = async () => {
    if (!novel) return;
    setGenerating(true);
    try {
      const result = await ollamaGenerate([
        { role: "system", content: PROMPTS.worldbuilding },
        { role: "user", content: `Novel: ${novel.title}\nGenres: ${novel.genres?.join(", ")}\nSinopsis: ${novel.synopsis}\n${novel.master_concept ? `Master Concept: ${novel.master_concept}` : ""}\n\nGenerate world elements as JSON array: [{type, name, description}]. Types: location, lore, system, faction, item. Return ONLY valid JSON array, no other text.` },
      ]);

      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const newEls = parsed.map((e: any) => ({
          id: crypto.randomUUID(),
          type: e.type || "lore",
          name: e.name,
          description: e.description,
        }));
        saveElements([...elements, ...newEls]);
        toast({ title: `${newEls.length} elemen dunia ditempa!` });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container py-16 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin rune-text" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-4xl py-8 space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/novel/${id}`}><ArrowLeft className="mr-1 h-4 w-4" /> Kembali ke Detail</Link>
        </Button>

        <div className="text-center space-y-2">
          <div className="flex justify-center gap-2 items-center">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/40" />
            <Globe className="h-6 w-6 rune-text" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/40" />
          </div>
          <h1 className="font-display text-3xl font-bold">Worldbuilding</h1>
          <p className="text-muted-foreground text-sm">{novel?.title} — Peta dunia dan lore</p>
        </div>

        {/* Auto generate */}
        <div className="flex justify-center">
          <Button onClick={generateWorld} disabled={generating} className="rune-glow">
            {generating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
            Generate Elemen Dunia
          </Button>
        </div>

        {/* Add manual */}
        <CollapsibleSection icon={<Plus className="h-5 w-5 rune-text" />} title="Tambah Elemen" hasContent>
          <div className="space-y-3">
            <div className="flex gap-2">
              <select value={newType} onChange={e => setNewType(e.target.value)} className="rounded-md rune-border bg-background px-3 py-2 text-sm">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nama elemen..." className="rune-border" />
            </div>
            <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Deskripsi..." className="rune-border" rows={3} />
            <Button onClick={addElement} size="sm" className="rune-glow"><Save className="mr-1 h-4 w-4" /> Tambah</Button>
          </div>
        </CollapsibleSection>

        {/* Elements list grouped by type */}
        {Object.entries(TYPE_LABELS).map(([type, meta]) => {
          const typeEls = elements.filter(e => e.type === type);
          if (typeEls.length === 0) return null;
          return (
            <CollapsibleSection key={type} icon={meta.icon} title={`${meta.label} (${typeEls.length})`} hasContent defaultOpen>
              <div className="space-y-2">
                {typeEls.map(el => (
                  <div key={el.id} className="rounded-lg rune-border bg-secondary/20 p-3 flex gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-semibold text-sm">{el.name}</span>
                        <Badge variant="outline" className={`text-xs ${meta.badge}`}>{meta.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{el.description}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteElement(el.id)} className="text-destructive h-8 w-8 p-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          );
        })}

        {elements.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Belum ada elemen dunia. Generate atau tambah manual.</p>
        )}
      </main>
    </div>
  );
}
