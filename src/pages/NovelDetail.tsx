import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, BookOpen, Trash2, Loader2, Sparkles, RefreshCw,
  FileText, Feather, Palette, ScrollText, Info,
} from "lucide-react";
import { FormattedContent } from "@/components/FormattedContent";
import { CharacterList } from "@/components/CharacterList";
import { CollapsibleSection } from "@/components/CollapsibleSection";

export default function NovelDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [novel, setNovel] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingConcept, setGeneratingConcept] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [streamType, setStreamType] = useState<"chapter" | "concept" | null>(null);
  const streamRef = useRef<AbortController | null>(null);

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
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { fetchNovel(); }, [fetchNovel]);

  // Build dynamic writing style instructions from premise
  const buildWritingStylePrompt = () => {
    const chapterCount = chapters.length;
    const totalChapters = novel?.target_chapters || 10;
    const progress = chapterCount / totalChapters;

    // Phase-based narrative pacing
    let phaseInstruction = "";
    if (progress < 0.15) {
      phaseInstruction = `This is the INTRODUCTION phase. Focus on:
- Rich world-building with vivid, detailed descriptions of settings and atmosphere
- Introduce the protagonist through their daily life, inner thoughts, and personality
- Plant subtle foreshadowing and hooks for the main conflict
- Use long, immersive narration to establish the tone and mood
- Include meaningful dialogue that reveals character personalities and relationships`;
    } else if (progress < 0.35) {
      phaseInstruction = `This is the RISING ACTION phase. Focus on:
- Escalate conflicts and introduce new challenges
- Deepen character relationships through extended dialogue exchanges
- Show character growth through their reactions and decisions
- Balance action sequences with emotional/reflective moments
- Use longer dialogue scenes with subtext and tension`;
    } else if (progress < 0.65) {
      phaseInstruction = `This is the MIDDLE/DEVELOPMENT phase. Focus on:
- Major plot developments and turning points
- Complex character interactions with layered dialogue
- Reveal hidden truths, betrayals, or alliances
- Mix intense action with deep emotional scenes
- Characters should face moral dilemmas and internal conflicts`;
    } else if (progress < 0.85) {
      phaseInstruction = `This is the CLIMAX BUILD-UP phase. Focus on:
- Rapidly escalating stakes and tension
- Confrontations with long, impactful dialogue exchanges
- Characters making critical decisions
- Bring storylines together toward the climax
- Emotional peaks with powerful narrative descriptions`;
    } else {
      phaseInstruction = `This is the CLIMAX/RESOLUTION phase. Focus on:
- The ultimate confrontation or resolution
- Emotionally charged dialogue and narrative
- Tie up major plot threads satisfyingly
- Show the final transformation of characters
- End with impact — either hopeful, bittersweet, or dramatic`;
    }

    // Core style defaults
    const coreStyle = `
WRITING STYLE RULES (MANDATORY):
1. LONG NARRATION: Write rich, detailed narrative paragraphs. Describe environments, emotions, physical sensations, and inner thoughts extensively. Each narrative paragraph should be at least 3-5 sentences.
2. LONG DIALOGUE: Write extended, natural dialogue exchanges. Characters should have back-and-forth conversations of 6-10+ lines minimum per dialogue scene. Dialogue must feel alive with personality, emotion, and subtext.
3. SHOW, DON'T TELL: Use sensory details, body language, and actions to convey emotions rather than stating them directly.
4. PACING: Alternate between narrative description and dialogue. After a dialogue scene, follow with narrative reflection or action. After narration, transition into dialogue naturally.
5. SCENE STRUCTURE: Each chapter should have at least 2-3 distinct scenes with clear transitions.
6. CHARACTER VOICE: Each character should have a distinct speaking pattern and vocabulary.`;

    return `${coreStyle}\n\n${phaseInstruction}`;
  };

  const streamGenerate = async (type: "chapter" | "concept") => {
    if (!novel) return;
    const isChapter = type === "chapter";
    if (isChapter) setGenerating(true);
    else setGeneratingConcept(true);
    setStreamType(type);
    setStreamContent("");

    const abortController = new AbortController();
    streamRef.current = abortController;

    try {
      const apiKey = localStorage.getItem("cerebras_api_key") || "";
      const host = localStorage.getItem("cerebras_host") || "https://api.cerebras.ai";

      if (!apiKey) {
        toast({ title: "API Key belum diset", description: "Silakan atur di halaman Settings", variant: "destructive" });
        return;
      }

      const lastChapter = chapters.length > 0 ? chapters[chapters.length - 1] : null;
      const nextChapterNum = (lastChapter?.chapter_number || 0) + 1;

      const genreTerms: Record<string, string> = {
        "Cultivation": "Qi, Dao, Sect, Dantian, Spirit Root, Meridian, Spirit Beast, Alchemy, Formation Array, Nascent Soul, Immortal Realm, Tribulation Lightning, Cultivation Base",
        "Western Fantasy": "Mana, Spell, Knight, Dragon, Dungeon, Elf, Dwarf, Holy Magic, Dark Magic, Guild, Enchantment, Rune, Quest, King",
        "RPG": "Level, Stats, Skill Tree, HP/MP, System Window, Item Drop, Boss Monster, EXP, Class, Rank-Up, Party, Inventory, Passive/Active Skill, Status Screen",
      };

      const genreContext = novel.genres
        .map((g: string) => genreTerms[g] ? `For ${g} genre, use these terms: ${genreTerms[g]}` : "")
        .filter(Boolean)
        .join("\n");

      // Character context for prompts
      const characterContext = characters.length > 0
        ? `=== ESTABLISHED CHARACTERS ===\n${characters.map((c: any) =>
            `- ${c.name} (${c.role}): ${c.description}${c.traits?.length ? ` | Traits: ${c.traits.join(", ")}` : ""}`
          ).join("\n")}\n`
        : "";

      let systemPrompt: string;
      let userPrompt: string;

      if (type === "concept") {
        systemPrompt = `You are a master novel architect. Create a comprehensive master concept for a novel. Write in ${novel.language}. ${genreContext}`;
        userPrompt = `Create a master concept for this novel:
Title: ${novel.title}
Genres: ${novel.genres.join(", ")}
Synopsis: ${novel.synopsis}
Writing Style: ${novel.writing_style || "Auto (long narration + rich dialogue)"}
Target Chapters: ${novel.target_chapters}

${characterContext}

Include:
1. Overall plot outline for ALL ${novel.target_chapters} chapters with high precision and creativity
2. Main characters and their roles
3. Core themes and main conflicts
4. Story milestones per arc/chapter block
5. Narrative pacing plan: introduction → rising action → climax → resolution
6. Use genre-specific terminology throughout`;
      } else {
        const lastChapterContent = lastChapter ? lastChapter.content : "";
        const earlierChaptersSummary = chapters.slice(0, -1).map((c: any) =>
          `Chapter ${c.chapter_number}: ${c.title} (${c.word_count} words) - ${c.content.slice(0, 300)}...`
        ).join("\n");

        const writingStylePrompt = buildWritingStylePrompt();

        systemPrompt = `You are a masterful novel writer. Write the next chapter of a novel. Write in ${novel.language}. The chapter MUST be at minimum 2000 words.

${writingStylePrompt}

CRITICAL CONTINUITY RULES:
1. You MUST continue the story from EXACTLY where the previous chapter ended. Read the last chapter carefully and pick up the narrative from its final scene.
2. Do NOT repeat, rephrase, or retell any events that already happened in previous chapters.
3. Do NOT restart the story or re-introduce characters that have already been introduced.
4. Advance the plot forward with new events, dialogue, and developments.
5. Maintain consistency with all established characters, settings, and plot points.
${genreContext}`;

        userPrompt = `Novel: ${novel.title}
Genres: ${novel.genres.join(", ")}
Synopsis: ${novel.synopsis}

${characterContext}

${novel.master_concept ? `=== MASTER CONCEPT (use as story guide) ===\n${novel.master_concept}\n` : ""}

${earlierChaptersSummary ? `=== EARLIER CHAPTERS SUMMARY ===\n${earlierChaptersSummary}\n` : ""}

${lastChapterContent ? `=== LAST CHAPTER (Chapter ${lastChapter!.chapter_number}) - FULL CONTENT ===\n${lastChapterContent}\n\n=== END OF LAST CHAPTER ===` : "This is the first chapter of the novel."}

Now write Chapter ${nextChapterNum}. Start with a chapter title in format "Chapter ${nextChapterNum}: [Title]".
The chapter MUST continue from where Chapter ${(lastChapter?.chapter_number || 0)} ended. Do NOT repeat any previous content. Minimum 2000 words.
Remember: LONG narration + LONG dialogue. Make the story feel alive.`;
      }

      const response = await fetch(`${host}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: novel.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: true,
          max_completion_tokens: 8192,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`API Error ${response.status}: ${err}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || "";
            fullContent += content;
            setStreamContent(fullContent);
          } catch {}
        }
      }

      if (type === "concept") {
        await supabase.from("novels").update({ master_concept: fullContent }).eq("id", id);
        toast({ title: "Master concept berhasil di-generate!" });
      } else {
        const titleMatch = fullContent.match(/^(?:Chapter\s+\d+[:\s]+)(.+?)(?:\n|$)/i);
        const chapterTitle = titleMatch ? titleMatch[1].trim() : `Chapter ${nextChapterNum}`;
        const wordCount = fullContent.split(/\s+/).length;

        await supabase.from("chapters").insert({
          novel_id: id,
          chapter_number: nextChapterNum,
          title: chapterTitle,
          content: fullContent,
          word_count: wordCount,
        });

        const totalWords = chapters.reduce((sum: number, c: any) => sum + c.word_count, 0) + wordCount;
        await supabase.from("novels").update({
          word_count: totalWords,
          status: "ongoing",
        }).eq("id", id);

        toast({ title: `Chapter ${nextChapterNum} berhasil di-generate!` });
      }

      fetchNovel();
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    } finally {
      setGenerating(false);
      setGeneratingConcept(false);
      setStreamType(null);
      setStreamContent("");
      streamRef.current = null;
    }
  };

  const deleteChapter = async (chapterId: string) => {
    if (!confirm("Hapus bab ini?")) return;
    const { error } = await supabase.from("chapters").delete().eq("id", chapterId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Bab dihapus" }); fetchNovel(); }
  };

  // Compute current writing phase label
  const getPhaseLabel = () => {
    if (!novel) return "";
    const progress = chapters.length / (novel.target_chapters || 10);
    if (progress < 0.15) return "📖 Pengenalan";
    if (progress < 0.35) return "📈 Rising Action";
    if (progress < 0.65) return "⚔️ Development";
    if (progress < 0.85) return "🔥 Klimaks Build-up";
    return "🏁 Klimaks & Resolusi";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container py-16 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!novel) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container py-16 text-center">
          <p className="text-muted-foreground">Novel tidak ditemukan.</p>
          <Button asChild className="mt-4"><Link to="/">Kembali</Link></Button>
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

        {/* Novel Header - Compact */}
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="w-full sm:w-48 h-64 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
            {novel.cover_image ? (
              <img src={novel.cover_image} alt={novel.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-gold-dark to-gold">
                <BookOpen className="h-16 w-16 text-primary-foreground/60" />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3">
            <h1 className="font-display text-3xl font-bold">{novel.title}</h1>

            <div className="flex flex-wrap gap-1">
              {novel.genres?.map((g: string) => (
                <Badge key={g} variant="outline" className="border-primary/30 text-primary">{g}</Badge>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>📚 {chapters.length}/{novel.target_chapters} Bab</span>
              <span>📝 {novel.word_count?.toLocaleString()} kata</span>
              <span>🌐 {novel.language}</span>
              <span>🤖 {novel.model}</span>
              <Badge variant="secondary">{novel.status}</Badge>
              <Badge variant="outline" className="border-primary/30 text-primary">{getPhaseLabel()}</Badge>
            </div>

            {novel.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {novel.tags.map((t: string) => (
                  <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {chapters.length > 0 && (
                <Button asChild>
                  <Link to={`/novel/${id}/read`}><BookOpen className="mr-1 h-4 w-4" /> Baca</Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Synopsis */}
        <CollapsibleSection
          icon={<ScrollText className="h-5 w-5 text-primary" />}
          title="Sinopsis"
          hasContent={!!novel.synopsis}
          emptyText="Sinopsis belum diisi."
        >
          <p className="text-foreground/90 leading-relaxed whitespace-pre-line">{novel.synopsis}</p>
        </CollapsibleSection>

        {/* Writing Style & Narrative Phase */}
        <CollapsibleSection
          icon={<Feather className="h-5 w-5 text-primary" />}
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
              <span className="font-semibold text-foreground">Fase Narasi Saat Ini:</span>{" "}
              <Badge variant="outline" className="border-primary/30 text-primary ml-1">{getPhaseLabel()}</Badge>
              <p className="text-foreground/70 mt-1 text-xs leading-relaxed">
                Gaya penulisan otomatis menyesuaikan dengan progres cerita. Narasi panjang & dialog mendalam diutamakan di setiap fase.
              </p>
            </div>
            <div className="border-t border-border pt-3">
              <span className="font-semibold text-foreground">Prinsip Otomatis:</span>
              <ul className="list-disc list-inside text-foreground/70 mt-1 space-y-1 text-xs">
                <li>Narasi deskriptif panjang (min. 3-5 kalimat per paragraf)</li>
                <li>Dialog hidup & mendalam (min. 6-10+ baris per adegan dialog)</li>
                <li>Show, don't tell — emosi via detail sensorik</li>
                <li>Setiap bab minimal 2-3 adegan dengan transisi jelas</li>
                <li>Setiap karakter punya gaya bicara unik</li>
              </ul>
            </div>
          </div>
        </CollapsibleSection>

        {/* Master Concept */}
        <CollapsibleSection
          icon={<Sparkles className="h-5 w-5 text-primary" />}
          title="Master Concept"
          hasContent={!!(novel.master_concept || (streamType === "concept" && streamContent))}
          emptyText="Master concept belum di-generate. Klik tombol Generate untuk membuat."
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => streamGenerate("concept")}
              disabled={generatingConcept || generating}
            >
              {generatingConcept ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-4 w-4" />
              )}
              {novel.master_concept ? "Regenerate" : "Generate"}
            </Button>
          }
        >
          {streamType === "concept" && streamContent ? (
            <>
              <FormattedContent content={streamContent} />
              <span className="animate-pulse">▊</span>
            </>
          ) : (
            novel.master_concept && <FormattedContent content={novel.master_concept} />
          )}
        </CollapsibleSection>

        {/* Characters */}
        <CharacterList
          novelId={id!}
          novel={novel}
          characters={characters}
          onRefresh={fetchNovel}
        />

        {/* Chapters */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Daftar Bab
            </h2>
            <Button
              onClick={() => streamGenerate("chapter")}
              disabled={generating || generatingConcept}
            >
              {generating ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-4 w-4" />
              )}
              Generate Bab Berikutnya
            </Button>
          </div>

          {streamType === "chapter" && streamContent && (
            <div className="text-sm bg-parchment dark:bg-secondary rounded-lg p-4 max-h-96 overflow-y-auto">
              <FormattedContent content={streamContent} />
              <span className="animate-pulse">▊</span>
            </div>
          )}

          {chapters.length === 0 && !generating ? (
            <p className="text-sm text-muted-foreground">
              Belum ada bab. Generate master concept terlebih dahulu, lalu generate bab pertama.
            </p>
          ) : (
            <div className="space-y-2">
              {chapters.map((chapter) => (
                <div
                  key={chapter.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-4 transition-colors hover:bg-secondary/50"
                >
                  <div className="flex-1">
                    <h3 className="font-display font-medium">
                      Bab {chapter.chapter_number}: {chapter.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {chapter.word_count?.toLocaleString()} kata
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/novel/${id}/read`}><BookOpen className="h-4 w-4" /></Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteChapter(chapter.id)}
                      className="text-destructive hover:text-destructive"
                    >
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
