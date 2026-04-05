import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit, Loader2, X } from "lucide-react";

const GENRE_OPTIONS = [
  "Cultivation", "Western Fantasy", "RPG", "Romance", "Sci-Fi",
  "Horror", "Mystery", "Adventure", "Slice of Life", "Action",
  "Thriller", "Comedy", "Drama", "Historical",
];

interface EditNovelDialogProps {
  novel: any;
  onUpdate: () => void;
}

export function EditNovelDialog({ novel, onUpdate }: EditNovelDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(novel.title);
  const [synopsis, setSynopsis] = useState(novel.synopsis || "");
  const [genres, setGenres] = useState<string[]>(novel.genres || []);
  const [masterConcept, setMasterConcept] = useState(novel.master_concept || "");
  const [targetChapters, setTargetChapters] = useState(novel.target_chapters || 10);
  const [customGenre, setCustomGenre] = useState("");

  const toggleGenre = (g: string) => {
    setGenres((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  };

  const addCustomGenre = () => {
    const g = customGenre.trim();
    if (g && !genres.includes(g)) { setGenres([...genres, g]); setCustomGenre(""); }
  };

  const handleSave = async () => {
    if (!title.trim()) return toast({ title: "Judul wajib diisi", variant: "destructive" });
    setSaving(true);
    try {
      const { error } = await supabase.from("novels").update({
        title: title.trim(),
        synopsis: synopsis.trim(),
        genres,
        master_concept: masterConcept.trim() || null,
        target_chapters: targetChapters,
      }).eq("id", novel.id);
      if (error) throw error;
      toast({ title: "Novel berhasil diupdate!" });
      setOpen(false);
      onUpdate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rune-border">
          <Edit className="mr-1 h-4 w-4" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display rune-text">ᛟ Edit Metadata Novel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label>Judul</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Genre</Label>
            <div className="flex flex-wrap gap-1.5">
              {GENRE_OPTIONS.map((g) => (
                <Badge
                  key={g}
                  variant={genres.includes(g) ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => toggleGenre(g)}
                >
                  {g}
                </Badge>
              ))}
              {genres.filter((g) => !GENRE_OPTIONS.includes(g)).map((g) => (
                <Badge key={g} className="cursor-pointer text-xs" onClick={() => toggleGenre(g)}>
                  {g} <X className="ml-1 h-2.5 w-2.5" />
                </Badge>
              ))}
            </div>
            <div className="flex gap-1 mt-1">
              <Input
                placeholder="Genre kustom..."
                value={customGenre}
                onChange={(e) => setCustomGenre(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomGenre(); } }}
                className="text-sm h-8"
              />
              <Button type="button" variant="outline" size="sm" onClick={addCustomGenre}>+</Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Sinopsis</Label>
            <Textarea value={synopsis} onChange={(e) => setSynopsis(e.target.value)} rows={4} />
          </div>

          <div className="space-y-1">
            <Label>Master Concept</Label>
            <Textarea value={masterConcept} onChange={(e) => setMasterConcept(e.target.value)} rows={6} />
          </div>

          <div className="space-y-1">
            <Label>Target Jumlah Bab</Label>
            <Input type="number" min={1} value={targetChapters} onChange={(e) => setTargetChapters(parseInt(e.target.value) || 1)} />
          </div>

          <Button onClick={handleSave} className="w-full rune-glow" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Perubahan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
