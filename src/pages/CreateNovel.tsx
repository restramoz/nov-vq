import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { Link } from "react-router-dom";

const GENRE_OPTIONS = [
  "Cultivation", "Western Fantasy", "RPG", "Romance", "Sci-Fi",
  "Horror", "Mystery", "Adventure", "Slice of Life", "Action",
  "Thriller", "Comedy", "Drama", "Historical",
];

const LANGUAGE_OPTIONS = ["Indonesia", "English", "Japanese", "Korean", "Chinese"];

const WRITING_STYLES = [
  "Cultivation", "Western Fantasy", "RPG", "Light Novel",
  "Dark Fantasy", "Romantic Comedy", "Hard Sci-Fi", "Grimdark",
];

const STORY_STYLES = [
  "First Person", "Third Person", "Multiple POV", "Epistolary",
  "Nonlinear", "Stream of Consciousness",
];

const OLLAMA_MODELS = ["deepseek-v3.2:cloud", "glm-5:cloud", "nemotron-3-super:cloud"];

export default function CreateNovel() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    genres: [] as string[],
    synopsis: "",
    tags: [] as string[],
    language: "Indonesia",
    model: localStorage.getItem("ollama_model") || "deepseek-v3.2:cloud",
    writing_style: "",
    story_styles: [] as string[],
    target_chapters: 10,
    cover_image: "",
  });

  const [customGenre, setCustomGenre] = useState("");
  const [tagInput, setTagInput] = useState("");

  const updateField = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const toggleGenre = (genre: string) => {
    updateField("genres", form.genres.includes(genre) ? form.genres.filter((g) => g !== genre) : [...form.genres, genre]);
  };

  const addCustomGenre = () => {
    const g = customGenre.trim();
    if (g && !form.genres.includes(g)) { updateField("genres", [...form.genres, g]); setCustomGenre(""); }
  };

  const toggleStoryStyle = (style: string) => {
    updateField("story_styles", form.story_styles.includes(style) ? form.story_styles.filter((s) => s !== style) : [...form.story_styles, style]);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) { updateField("tags", [...form.tags, t]); setTagInput(""); }
  };

  const removeTag = (tag: string) => updateField("tags", form.tags.filter((t) => t !== tag));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast({ title: "Judul wajib diisi", variant: "destructive" });
    if (form.genres.length === 0) return toast({ title: "Pilih minimal 1 genre", variant: "destructive" });
    if (!form.synopsis.trim()) return toast({ title: "Sinopsis wajib diisi", variant: "destructive" });

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("novels")
        .insert({
          title: form.title.trim(),
          genres: form.genres,
          synopsis: form.synopsis.trim(),
          tags: form.tags,
          language: form.language,
          model: form.model,
          writing_style: form.writing_style,
          story_styles: form.story_styles,
          target_chapters: form.target_chapters,
          cover_image: form.cover_image || null,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      toast({ title: "Novel berhasil dibuat!" });
      navigate(`/novel/${data.id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-2xl py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" /> Kembali</Link>
        </Button>

        <h1 className="font-display text-3xl font-bold mb-6 rune-text">ᛟ Buat Novel Baru</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Judul *</Label>
            <Input id="title" value={form.title} onChange={(e) => updateField("title", e.target.value)} placeholder="Judul novel..." />
          </div>

          <div className="space-y-2">
            <Label>Genre * (pilih satu atau lebih)</Label>
            <div className="flex flex-wrap gap-2">
              {GENRE_OPTIONS.map((genre) => (
                <Badge key={genre} variant={form.genres.includes(genre) ? "default" : "outline"} className="cursor-pointer transition-colors" onClick={() => toggleGenre(genre)}>
                  {genre}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Genre kustom..." value={customGenre} onChange={(e) => setCustomGenre(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomGenre(); } }} className="flex-1" />
              <Button type="button" variant="outline" size="sm" onClick={addCustomGenre}>Tambah</Button>
            </div>
            {form.genres.filter((g) => !GENRE_OPTIONS.includes(g)).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {form.genres.filter((g) => !GENRE_OPTIONS.includes(g)).map((g) => (
                  <Badge key={g} className="cursor-pointer" onClick={() => toggleGenre(g)}>{g} <X className="ml-1 h-3 w-3" /></Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="synopsis">Sinopsis / Premis *</Label>
            <Textarea id="synopsis" value={form.synopsis} onChange={(e) => updateField("synopsis", e.target.value)} rows={5} placeholder="Ceritakan premis novel..." />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input placeholder="Tambah tag..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>Tambah</Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {form.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>{tag} <X className="ml-1 h-3 w-3" /></Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bahasa</Label>
              <Select value={form.language} onValueChange={(v) => updateField("language", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Model AI (Ollama)</Label>
              <Select value={form.model} onValueChange={(v) => updateField("model", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OLLAMA_MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Gaya Penulisan</Label>
            <Select value={form.writing_style} onValueChange={(v) => updateField("writing_style", v)}>
              <SelectTrigger><SelectValue placeholder="Pilih gaya..." /></SelectTrigger>
              <SelectContent>
                {WRITING_STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Gaya Cerita</Label>
            <div className="flex flex-wrap gap-2">
              {STORY_STYLES.map((style) => (
                <Badge key={style} variant={form.story_styles.includes(style) ? "default" : "outline"} className="cursor-pointer transition-colors" onClick={() => toggleStoryStyle(style)}>
                  {style}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_chapters">Target Jumlah Bab</Label>
            <Input id="target_chapters" type="number" min={1} value={form.target_chapters} onChange={(e) => updateField("target_chapters", parseInt(e.target.value) || 1)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cover_image">Cover Image URL</Label>
            <Input id="cover_image" value={form.cover_image} onChange={(e) => updateField("cover_image", e.target.value)} placeholder="https://..." />
          </div>

          <Button type="submit" className="w-full rune-glow" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            ᛟ Simpan Novel
          </Button>
        </form>
      </main>
    </div>
  );
}
