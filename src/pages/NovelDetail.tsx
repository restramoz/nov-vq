import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, BookOpen, Trash2, Loader2, Sparkles, RefreshCw,
  FileText, Feather, ScrollText, Shield, Globe, Pencil,
} from "lucide-react";
import { FormattedContent } from "@/components/FormattedContent";
import { CharacterList } from "@/components/CharacterList";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { MusicPlayer } from "@/components/MusicPlayer";
import { EditNovelDialog } from "@/components/EditNovelDialog";
import { AICouncil, getDefaultCouncil, saveCouncil, type CouncilMember } from "@/components/AICouncil";
import { CouncilProgress } from "@/components/CouncilProgress";
import { runCouncilPipeline, INITIAL_COUNCIL_RESULT, type CouncilResult } from "@/lib/council";
import { ollamaGenerateStream } from "@/lib/ollama";
import { getPromptForPhase, PROMPTS } from "@/lib/prompts";
import { useMusic } from "@/contexts/MusicContext";

export default function NovelDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { setMusic } = useMusic();
  const [novel, setNovel] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingConcept, setGeneratingConcept] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [council, setCouncil] = useState<CouncilMember[]>(getDefaultCouncil());

  const handleCouncilChange = (newCouncil: CouncilMember[]) => {
    setCouncil(newCouncil);
    saveCouncil(newCouncil);
  };

  const fetchNovel = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [novelRes, chaptersRes, charsRes] = await Promise.all([
        supabase.from("novels").select("*").eq("id", id).single(),
        supabase.from("chapters").select("*").eq("novel_id", id).order("chapter_number"),
        supabase.from("characters").select("*").eq("novel_id", id).order("created_at"),
      ]);
      if (novelRes.error) throw novelRes.error;
      setNovel(novelRes.data);
      setChapters(chaptersRes.data || []);
      setCharacters(charsRes.data || []);

      // Set global music if novel has audio
      if (novelRes.data?.audio_url) {
        setMusic(novelRes.data.audio_url, novelRes.data.title);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, toast, setMusic]);

  useEffect(() => { fetchNovel(); }, [fetchNovel]);

  const getPhaseLabel = () => {
    if (!novel) return "";
    const progress = chapters.length / (novel.target_chapters || 10);
    if (progress < 0.15) return "ᛟ Pengenalan";
    if (progress < 0.35) return "ᚱ Rising Action";
    if (progress < 0.65) return "ᛏ Development";
    if (progress < 0.85) return "ᚦ Klimaks Build-up";
    return "ᛉ Klimaks & Resolusi";
  };

  const generate = async (type: "chapter" | "concept") => {
    if (!novel) return;
    const isChapter = type === "chapter";
    if (isChapter) { setGenerating(true); setStreamText(""); }
    else setGeneratingConcept(true);

    try {
      const lastChapter = chapters.length > 0 ? chapters[chapters.length - 1] : null;
      const nextChapterNum = (lastChapter?.chapter_number || 0) + 1;
      const progress = chapters.length / (novel.target_chapters || 10);

      const genreTerms: Record<string, string> = {
        "Cultivation": "Qi, Dao, Sect, Dantian, Spirit Root, Meridian, Spirit Beast, Alchemy",
        "Western Fantasy": "Mana, Spell, Knight, Dragon, Dungeon, Elf, Dwarf, Holy Magic, Dark Magic",
        "RPG": "Level, Stats, Skill Tree, HP/MP, System Window, Item Drop, Boss Monster, EXP, Class",
      };

      const genreContext = novel.genres
        .map((g: string) => genreTerms[g] ? `For ${g} genre, use terms: ${genreTerms[g]}` : "")
        .filter(Boolean).join("\n");

      const characterContext = characters.length > 0
        ? `=== CHARACTERS ===\n${characters.map((c: any) =>
            `- ${c.name} (${c.role}): ${c.description}${c.traits?.length ? ` | Traits: ${c.traits.join(", ")}` : ""}`
          ).join("\n")}\n`
        : "";

      let systemPrompt: string;
      let userPrompt: string;

      if (type === "concept") {
        systemPrompt = `${PROMPTS.worldbuilding}\n\nYou are a master novel architect. Create a comprehensive master concept. Write in ${novel.language}. ${genreContext}`;
        userPrompt = `Create a master concept for:
Title: ${novel.title}
Genres: ${novel.genres.join(", ")}
Synopsis: ${novel.synopsis}
Target Chapters: ${novel.target_chapters}
${characterContext}

Include:
1. Overall plot outline for ALL ${novel.target_chapters} chapters
2. Main characters and roles
3. Core themes and conflicts
4. Story milestones per arc
5. Pacing plan: introduction → rising action → climax → resolution`;
      } else {
        const lastChapterContent = lastChapter ? lastChapter.content : "";
        const earlierSummary = chapters.slice(0, -1).map((c: any) =>
          `Ch${c.chapter_number}: ${c.title} - ${c.content.slice(0, 300)}...`
        ).join("\n");

        const phasePrompt = getPromptForPhase(progress);

        systemPrompt = `${phasePrompt}

Write in ${novel.language}. Min 2000 words.

CRITICAL CONTINUITY RULES:
1. Continue from EXACTLY where the previous chapter ended.
2. Do NOT repeat or retell any previous events.
3. Do NOT restart or re-introduce established characters.
4. Advance the plot with new events and developments.
${genreContext}`;

        userPrompt = `Novel: ${novel.title}
Genres: ${novel.genres.join(", ")}
Synopsis: ${novel.synopsis}
${characterContext}
${novel.master_concept ? `=== MASTER CONCEPT ===\n${novel.master_concept}\n` : ""}
${earlierSummary ? `=== EARLIER CHAPTERS ===\n${earlierSummary}\n` : ""}
${lastChapterContent ? `=== LAST CHAPTER (Ch${lastChapter!.chapter_number}) ===\n${lastChapterContent}\n=== END ===` : "This is the first chapter."}

Write Chapter ${nextChapterNum}. Start with "Chapter ${nextChapterNum}: [Title]".
Continue from where Chapter ${lastChapter?.chapter_number || 0} ended. Min 2000 words.
LONG narration + LONG dialogue. Make the story alive.`;
      }

      if (isChapter) {
        let fullText = "";
        for await (const chunk of ollamaGenerateStream([
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ])) {
          fullText += chunk;
          setStreamText(fullText);
        }

        const titleMatch = fullText.match(/^(?:Chapter\s+\d+[:\s]+)(.+?)(?:\n|$)/i);
        const chapterTitle = titleMatch ? titleMatch[1].trim() : `Chapter ${nextChapterNum}`;
        const wordCount = fullText.split(/\s+/).length;

        await supabase.from("chapters").insert({
          novel_id: id,
          chapter_number: nextChapterNum,
          title: chapterTitle,
          content: fullText,
          word_count: wordCount,
        });

        const totalWords = chapters.reduce((sum: number, c: any) => sum + c.word_count, 0) + wordCount;
        await supabase.from("novels").update({ word_count: totalWords, status: "ongoing" }).eq("id", id);

        toast({ title: `Chapter ${nextChapterNum} berhasil ditempa!` });
        setStreamText("");
      } else {
        let fullText = "";
        for await (const chunk of ollamaGenerateStream([
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ])) {
          fullText += chunk;
        }

        await supabase.from("novels").update({ master_concept: fullText }).eq("id", id);
        toast({ title: "Master concept berhasil ditempa!" });
      }

      fetchNovel();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
      setGeneratingConcept(false);
    }
  };

  const deleteChapter = async (chapterId: string) => {
    if (!confirm("Hapus bab ini?")) return;
    const { error } = await supabase.from("chapters").delete().eq("id", chapterId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Bab dihapus" }); fetchNovel(); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container py-16 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin rune-text" />
          <p className="mt-3 text-muted-foreground font-display">Membuka gulungan...</p>
        </div>
      </div>
    );
  }

  if (!novel) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container py-16 text-center">
          <p className="text-muted-foreground">Gulungan tidak ditemukan.</p>
          <Button asChild className="mt-4 rune-glow"><Link to="/">Kembali</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-4xl py-8 space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" /> Kembali</Link>
        </Button>

        {/* Novel Header - Mythical */}
        <div className="rounded-lg rune-border bg-card overflow-hidden">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
            <div className="flex flex-col sm:flex-row gap-6 p-6">
              <div className="w-full sm:w-48 h-64 rounded-lg overflow-hidden rune-border flex-shrink-0">
                {novel.cover_image ? (
                  <img src={novel.cover_image} alt={novel.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col h-full items-center justify-center bg-gradient-to-br from-rune-dark via-card to-rune-dark/50 gap-2">
                    <Shield className="h-10 w-10 rune-text" />
                    <BookOpen className="h-8 w-8 text-primary/40" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h1 className="font-display text-3xl font-bold">{novel.title}</h1>
                  <EditNovelDialog novel={novel} onUpdate={fetchNovel} />
                </div>

                <div className="flex flex-wrap gap-1">
                  {novel.genres?.map((g: string) => (
                    <Badge key={g} variant="outline" className="border-primary/30 rune-text">{g}</Badge>
                  ))}
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>ᛟ {chapters.length}/{novel.target_chapters} Bab</span>
                  <span>ᚱ {novel.word_count?.toLocaleString()} kata</span>
                  <span>ᚹ {novel.language}</span>
                  <Badge variant="secondary">{novel.status}</Badge>
                  <Badge variant="outline" className="border-primary/30 rune-text">{getPhaseLabel()}</Badge>
                </div>

                {novel.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {novel.tags.map((t: string) => (
                      <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  {chapters.length > 0 && (
                    <Button asChild className="rune-glow" size="sm">
                      <Link to={`/novel/${id}/read`}><BookOpen className="mr-1 h-4 w-4" /> Baca</Link>
                    </Button>
                  )}
                  <Button asChild variant="outline" size="sm" className="rune-border">
                    <Link to={`/novel/${id}/world`}><Globe className="mr-1 h-4 w-4" /> Worldbuilding</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Music Player */}
        <MusicPlayer novelId={id!} audioUrl={novel.audio_url} onUpdate={fetchNovel} />

        {/* Synopsis */}
        <CollapsibleSection
          icon={<ScrollText className="h-5 w-5 rune-text" />}
          title="Sinopsis"
          hasContent={!!novel.synopsis}
          emptyText="Sinopsis belum diisi."
        >
          <p className="text-foreground/90 leading-relaxed whitespace-pre-line">{novel.synopsis}</p>
        </CollapsibleSection>

        {/* Writing Style */}
        <CollapsibleSection
          icon={<Feather className="h-5 w-5 rune-text" />}
          title="Gaya Penulisan"
          hasContent={true}
        >
          <div className="space-y-3">
            <div>
              <span className="font-semibold text-foreground">Gaya Manual:</span>{" "}
              <span className="text-foreground/80">{novel.writing_style || "Otomatis"}</span>
            </div>
            {novel.story_styles?.length > 0 && (
              <div>
                <span className="font-semibold text-foreground">Sudut Pandang:</span>{" "}
                <span className="text-foreground/80">{novel.story_styles.join(", ")}</span>
              </div>
            )}
            <div className="border-t border-border pt-3 mt-3">
              <span className="font-semibold text-foreground">Fase Narasi:</span>{" "}
              <Badge variant="outline" className="border-primary/30 rune-text ml-1">{getPhaseLabel()}</Badge>
              <p className="text-foreground/70 mt-1 text-xs">Gaya penulisan otomatis menyesuaikan progres cerita.</p>
            </div>
          </div>
        </CollapsibleSection>

        {/* Master Concept */}
        <CollapsibleSection
          icon={<Sparkles className="h-5 w-5 rune-text" />}
          title="Master Concept"
          hasContent={!!novel.master_concept}
          emptyText="Master concept belum ditempa."
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => generate("concept")}
              disabled={generatingConcept || generating}
              className="rune-border"
            >
              {generatingConcept ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
              {novel.master_concept ? "Regenerate" : "Generate"}
            </Button>
          }
        >
          {generatingConcept ? (
            <div className="flex items-center gap-3 py-8 justify-center">
              <Loader2 className="h-6 w-6 animate-spin rune-text" />
              <span className="text-muted-foreground font-medium animate-pulse">Master concept sedang ditempa...</span>
            </div>
          ) : (
            novel.master_concept && <FormattedContent content={novel.master_concept} />
          )}
        </CollapsibleSection>

        {/* AI Council */}
        <AICouncil council={council} onCouncilChange={handleCouncilChange} />

        {/* Characters */}
        <CharacterList novelId={id!} novel={novel} characters={characters} onRefresh={fetchNovel} />

        {/* Chapters */}
        <div className="rounded-lg rune-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 rune-text" /> Daftar Bab
            </h2>
            <Button onClick={() => generate("chapter")} disabled={generating || generatingConcept} className="rune-glow">
              {generating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
              Tempa Bab Berikutnya
            </Button>
          </div>

          {/* Streaming output */}
          {generating && (
            <div className="rounded-lg bg-parchment dark:bg-secondary p-6 space-y-4 rune-border">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin rune-text flex-shrink-0" />
                <span className="text-sm font-medium rune-text animate-pulse font-display">
                  ᛟ Chapter {(chapters.length > 0 ? chapters[chapters.length - 1].chapter_number : 0) + 1} sedang ditempa...
                </span>
              </div>
              {streamText && (
                <div className="prose-reader max-h-96 overflow-y-auto rounded-lg bg-background/50 p-4 rune-border">
                  <FormattedContent content={streamText} className="text-sm leading-relaxed mystical-typing" />
                  <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5" />
                </div>
              )}
            </div>
          )}

          {chapters.length === 0 && !generating ? (
            <p className="text-sm text-muted-foreground">
              Belum ada bab. Generate master concept terlebih dahulu, lalu tempa bab pertama.
            </p>
          ) : (
            <div className="space-y-2">
              {chapters.map((chapter) => (
                <div
                  key={chapter.id}
                  className="flex items-center justify-between rounded-lg rune-border bg-secondary/30 p-4 transition-all hover:bg-secondary/50 hover:rune-glow"
                >
                  <div className="flex-1">
                    <h3 className="font-display font-medium">
                      Bab {chapter.chapter_number}: {chapter.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {chapter.word_count?.toLocaleString()} kata
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button asChild variant="ghost" size="sm" title="Baca">
                      <Link to={`/novel/${id}/read`}><BookOpen className="h-4 w-4" /></Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm" title="Edit">
                      <Link to={`/novel/${id}/edit?chapter=${chapter.chapter_number}`}><Pencil className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteChapter(chapter.id)} className="text-destructive hover:text-destructive" title="Hapus">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
