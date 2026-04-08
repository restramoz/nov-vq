import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2, Feather, Eye, EyeOff } from "lucide-react";
import { FormattedContent } from "@/components/FormattedContent";

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const chapterNum = parseInt(searchParams.get("chapter") || "1");
  const { toast } = useToast();

  const [novel, setNovel] = useState<any>(null);
  const [chapter, setChapter] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [novelRes, chapterRes] = await Promise.all([
      supabase.from("novels").select("*").eq("id", id).single(),
      supabase.from("chapters").select("*").eq("novel_id", id).eq("chapter_number", chapterNum).single(),
    ]);
    setNovel(novelRes.data);
    if (chapterRes.data) {
      setChapter(chapterRes.data);
      setTitle(chapterRes.data.title || "");
      setContent(chapterRes.data.content || "");
    }
    setLoading(false);
  }, [id, chapterNum]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!chapter) return;
    setSaving(true);
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const { error } = await supabase.from("chapters").update({
      title,
      content,
      word_count: wordCount,
    }).eq("id", chapter.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      // Update novel word count
      const { data: allChapters } = await supabase.from("chapters").select("word_count").eq("novel_id", id);
      const totalWords = allChapters?.reduce((s, c) => s + (c.word_count || 0), 0) || 0;
      await supabase.from("novels").update({ word_count: totalWords }).eq("id", id);
      toast({ title: "Bab tersimpan!" });
    }
    setSaving(false);
  };

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!chapter || !content) return;
    const timer = setInterval(() => {
      handleSave();
    }, 30000);
    return () => clearInterval(timer);
  }, [chapter, content, title]);

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

  if (!chapter) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container py-16 text-center space-y-4">
          <p className="text-muted-foreground">Bab tidak ditemukan.</p>
          <Button asChild><Link to={`/novel/${id}`}>Kembali</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-4xl py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link to={`/novel/${id}`}><ArrowLeft className="mr-1 h-4 w-4" /> Kembali</Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreview(!preview)} className="rune-border">
              {preview ? <EyeOff className="mr-1 h-4 w-4" /> : <Eye className="mr-1 h-4 w-4" />}
              {preview ? "Edit" : "Preview"}
            </Button>
            <Button onClick={handleSave} disabled={saving} size="sm" className="rune-glow">
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              Simpan
            </Button>
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center gap-2 items-center">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/40" />
            <Feather className="h-5 w-5 rune-text" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/40" />
          </div>
          <h1 className="font-display text-2xl font-bold">Editor Bab</h1>
          <p className="text-muted-foreground text-sm">{novel?.title} — Bab {chapterNum}</p>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Judul Bab</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} className="rune-border font-display text-lg" />
        </div>

        {/* Content */}
        {preview ? (
          <div className="rounded-lg rune-border bg-card p-6 min-h-[60vh]">
            <FormattedContent content={content} className="prose-reader" />
          </div>
        ) : (
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="rune-border min-h-[60vh] font-serif text-base leading-relaxed"
            placeholder="Tulis isi bab di sini..."
          />
        )}

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{content.split(/\s+/).filter(Boolean).length.toLocaleString()} kata</span>
          <span>Auto-save setiap 30 detik</span>
        </div>
      </main>
    </div>
  );
}
