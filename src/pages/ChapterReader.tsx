import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight, Menu, X, Music, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { FormattedContent } from "@/components/FormattedContent";


// Reading progress helpers
function saveReadingProgress(novelId: string, chapterNum: number, scrollPercent: number) {
  const key = `reading_progress_${novelId}`;
  localStorage.setItem(key, JSON.stringify({ chapter: chapterNum, scroll: scrollPercent, ts: Date.now() }));
}

function loadReadingProgress(novelId: string): { chapter: number; scroll: number } | null {
  const key = `reading_progress_${novelId}`;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export default function ChapterReader() {
  const { id } = useParams<{ id: string }>();
  const [novel, setNovel] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tocOpen, setTocOpen] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [currentChapter, setCurrentChapter] = useState(0);
  const chapterRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const contentRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef(false);

  // Audio state
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);
      const [novelRes, chaptersRes] = await Promise.all([
        supabase.from("novels").select("*").eq("id", id).single(),
        supabase.from("chapters").select("*").eq("novel_id", id).order("chapter_number"),
      ]);
      setNovel(novelRes.data);
      setChapters(chaptersRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  // Restore reading progress after chapters load
  useEffect(() => {
    if (!id || chapters.length === 0 || restoredRef.current) return;
    restoredRef.current = true;
    const saved = loadReadingProgress(id);
    if (saved) {
      setTimeout(() => {
        const el = chapterRefs.current.get(saved.chapter);
        if (el) {
          el.scrollIntoView({ behavior: "auto", block: "start" });
          // Fine-tune scroll position
          setTimeout(() => {
            const docH = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            if (docH > 0) window.scrollTo(0, (saved.scroll / 100) * docH);
          }, 100);
        }
      }, 200);
    }
  }, [id, chapters]);

  const handleScroll = useCallback(() => {
    const el = document.documentElement;
    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight - el.clientHeight;
    if (scrollHeight > 0) {
      const pct = (scrollTop / scrollHeight) * 100;
      setReadProgress(pct);

      // Determine current chapter
      let current = 0;
      chapterRefs.current.forEach((ref, num) => {
        if (ref.getBoundingClientRect().top < window.innerHeight / 2) current = num;
      });
      if (current > 0) setCurrentChapter(current);

      // Auto-save
      if (id && current > 0) saveReadingProgress(id, current, pct);
    }
  }, [id]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToChapter = (chapterNum: number) => {
    const el = chapterRefs.current.get(chapterNum);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setTocOpen(false);
    }
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (audioPlaying) audioRef.current.pause(); else audioRef.current.play();
    setAudioPlaying(!audioPlaying);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[60]">
        <Progress value={readProgress} className="h-1 rounded-none" />
      </div>

      <AppHeader />

      {/* TOC Toggle */}
      <Button
        variant="outline"
        size="icon"
        className="fixed left-4 top-20 z-50 rounded-full shadow-lg rune-border"
        onClick={() => setTocOpen(!tocOpen)}
      >
        {tocOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Audio Controls (floating) */}
      {novel?.audio_url && (
        <div className="fixed right-4 top-20 z-50 flex items-center gap-1 bg-card/90 backdrop-blur-sm rounded-full rune-border px-2 py-1">
          <audio ref={audioRef} src={novel.audio_url} preload="metadata" loop />
          <Button variant="ghost" size="sm" onClick={toggleAudio} className="h-7 w-7 p-0">
            {audioPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => {
            setAudioMuted(!audioMuted);
            if (audioRef.current) audioRef.current.muted = !audioMuted;
          }} className="h-7 w-7 p-0">
            {audioMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </Button>
          <Music className="h-3.5 w-3.5 rune-text" />
        </div>
      )}

      {/* TOC Sidebar */}
      {tocOpen && (
        <>
          <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40" onClick={() => setTocOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-card border-r border-border p-6 pt-20 overflow-y-auto shadow-xl">
            <h2 className="font-display text-lg font-semibold mb-4 rune-text">ᚱ Daftar Isi</h2>
            <nav className="space-y-1">
              {chapters.map((ch) => (
                <button
                  key={ch.chapter_number}
                  onClick={() => scrollToChapter(ch.chapter_number)}
                  className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    currentChapter === ch.chapter_number
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  Bab {ch.chapter_number}: {ch.title}
                </button>
              ))}
            </nav>
          </aside>
        </>
      )}

      {/* Reader Content */}
      <main className="container max-w-3xl py-8 px-6" ref={contentRef}>
        <Button asChild variant="ghost" size="sm" className="mb-6">
          <Link to={`/novel/${id}`}><ArrowLeft className="mr-1 h-4 w-4" /> Kembali ke Detail</Link>
        </Button>

        {novel && (
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl font-bold mb-2">{novel.title}</h1>
            <p className="text-muted-foreground">{novel.genres?.join(" • ")}</p>
          </div>
        )}

        {chapters.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">Belum ada bab untuk dibaca.</p>
        ) : (
          <div className="space-y-16">
            {chapters.map((chapter, idx) => (
              <article
                key={chapter.id}
                ref={(el: HTMLDivElement | null) => { if (el) chapterRefs.current.set(chapter.chapter_number, el); }}
                className="animate-fade-in"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <h2 className="font-display text-2xl font-bold text-center mb-8 rune-text">
                  Bab {chapter.chapter_number}: {chapter.title}
                </h2>
                <FormattedContent content={chapter.content} className="text-foreground leading-[1.9]" />

                <div className="flex justify-between items-center mt-12 pt-8 border-t border-border">
                  {idx > 0 ? (
                    <Button variant="ghost" size="sm" onClick={() => scrollToChapter(chapters[idx - 1].chapter_number)}>
                      <ChevronLeft className="mr-1 h-4 w-4" /> Bab Sebelumnya
                    </Button>
                  ) : <div />}
                  {idx < chapters.length - 1 ? (
                    <Button variant="ghost" size="sm" onClick={() => scrollToChapter(chapters[idx + 1].chapter_number)}>
                      Bab Berikutnya <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  ) : <div />}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
