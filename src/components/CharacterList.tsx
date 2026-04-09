import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Sparkles, Loader2, Pencil, Trash2, Plus, Save, X, UserCircle,
  ChevronDown, ChevronUp,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ollamaGenerate } from "@/lib/ollama";

interface Character {
  id: string;
  novel_id: string;
  name: string;
  role: string;
  description: string;
  traits: string[];
}

interface CharacterListProps {
  novelId: string;
  novel: any;
  characters: Character[];
  onRefresh: () => void;
}

export function CharacterList({ novelId, novel, characters, onRefresh }: CharacterListProps) {
  const { toast } = useToast();
  const [extracting, setExtracting] = useState(false);
  const [editChar, setEditChar] = useState<Character | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", description: "", traits: "" });
  const [collapsed, setCollapsed] = useState(false);

  const extractCharacters = async () => {
    setExtracting(true);
    try {
      const prompt = `Analyze this novel and extract all main characters:
Title: ${novel.title}
Synopsis: ${novel.synopsis}
Genres: ${novel.genres?.join(", ")}
${novel.master_concept ? `Master Concept: ${novel.master_concept}` : ""}

Return a JSON array of characters. Each character must have:
- name (string)
- role (string: Protagonist, Antagonist, Supporting, etc.)
- description (string: 2-3 sentences)
- traits (string array: 3-5 personality traits)

IMPORTANT: Return ONLY valid JSON array, no other text. Example:
[{"name":"...", "role":"...", "description":"...", "traits":["...",".."]}]`;

      const result = await ollamaGenerate([
        { role: "system", content: `You are a character extraction AI. Always respond with valid JSON only. Language: ${novel.language || "Indonesia"}` },
        { role: "user", content: prompt },
      ]);

      // Parse JSON from response
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Tidak bisa mengekstrak karakter dari respons AI");

      const chars = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(chars) || chars.length === 0) {
        toast({ title: "Tidak ada karakter ditemukan" });
        return;
      }

      const inserts = chars.map((c: any) => ({
        novel_id: novelId,
        name: c.name || "",
        role: c.role || "",
        description: c.description || "",
        traits: c.traits || [],
      }));

      const { error: insertError } = await supabase.from("characters").insert(inserts);
      if (insertError) throw insertError;

      toast({ title: `${chars.length} karakter berhasil diekstrak!` });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  const deleteCharacter = async (id: string) => {
    if (!confirm("Hapus karakter ini?")) return;
    const { error } = await supabase.from("characters").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Karakter dihapus" }); onRefresh(); }
  };

  const openEdit = (char: Character) => {
    setEditChar(char);
    setForm({ name: char.name, role: char.role, description: char.description, traits: char.traits.join(", ") });
  };

  const openAdd = () => {
    setEditChar(null);
    setShowAdd(true);
    setForm({ name: "", role: "", description: "", traits: "" });
  };

  const saveCharacter = async () => {
    const traits = form.traits.split(",").map((t) => t.trim()).filter(Boolean);
    if (!form.name.trim()) {
      toast({ title: "Nama karakter wajib diisi", variant: "destructive" });
      return;
    }

    if (editChar) {
      const { error } = await supabase.from("characters").update({
        name: form.name.trim(), role: form.role.trim(), description: form.description.trim(), traits,
      }).eq("id", editChar.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else { toast({ title: "Karakter diupdate" }); setEditChar(null); onRefresh(); }
    } else {
      const { error } = await supabase.from("characters").insert({
        novel_id: novelId, name: form.name.trim(), role: form.role.trim(), description: form.description.trim(), traits,
      });
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else { toast({ title: "Karakter ditambahkan" }); setShowAdd(false); onRefresh(); }
    }
  };

  const isDialogOpen = !!editChar || showAdd;

  return (
    <div className="rounded-lg rune-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 rune-text" />
          <span className="rune-text" style={{ fontFamily: 'MedievalSharp, serif' }}>ᚹ</span> Karakter
          {characters.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs">{characters.length}</Badge>
          )}
        </h2>
        <div className="flex gap-2">
          {characters.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={openAdd}>
            <Plus className="mr-1 h-4 w-4" /> Tambah
          </Button>
          <Button variant="outline" size="sm" onClick={extractCharacters} disabled={extracting}>
            {extracting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
            {characters.length > 0 ? "Re-extract" : "Extract AI"}
          </Button>
        </div>
      </div>

      {characters.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada karakter. Klik "Extract AI" untuk mengekstrak karakter dari premis novel.
        </p>
      ) : !collapsed ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {characters.map((char) => (
            <div
              key={char.id}
              className="rounded-lg rune-border bg-secondary/30 p-4 space-y-2 transition-all hover:bg-secondary/50 hover:rune-glow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <UserCircle className="h-5 w-5 rune-text flex-shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-display font-semibold text-foreground truncate">{char.name}</h3>
                    <Badge variant="outline" className="text-xs border-primary/30 rune-text">
                      {char.role}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(char)} className="h-7 w-7 p-0">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteCharacter(char.id)} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{char.description}</p>
              {char.traits?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {char.traits.map((t, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setEditChar(null); setShowAdd(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editChar ? "Edit Karakter" : "Tambah Karakter"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nama</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama karakter" />
            </div>
            <div>
              <label className="text-sm font-medium">Peran</label>
              <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Protagonist, Antagonist, dll." />
            </div>
            <div>
              <label className="text-sm font-medium">Deskripsi</label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi karakter..." rows={3} />
            </div>
            <div>
              <label className="text-sm font-medium">Traits (pisahkan dengan koma)</label>
              <Input value={form.traits} onChange={(e) => setForm({ ...form, traits: e.target.value })} placeholder="Berani, Cerdas, Setia" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setEditChar(null); setShowAdd(false); }}>
              <X className="mr-1 h-4 w-4" /> Batal
            </Button>
            <Button onClick={saveCharacter}>
              <Save className="mr-1 h-4 w-4" /> Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
