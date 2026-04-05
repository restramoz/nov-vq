import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { FormattedContent } from "@/components/FormattedContent";

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
  const [menuVisible, setMenuVisible] = useState(true);
  const chapterRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const contentRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-hide menu after 3s
  useEffect(() => {
    const resetTimer = () => {
      setMenuVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setMenuVisible(false), 3000);
    };
    resetTimer();
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("touchstart", resetTimer);
    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

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

  useEffect(() => {
    if (!id || chapters.length === 0 || restoredRef.current) return;
    restoredRef.current = true;
    const saved = loadReadingProgress(id);
    if (saved) {
      setTimeout(() => {
        const el = chapterRefs.current.get(saved.chapter);
        if (el) {
          el.scrollIntoView({ behavior: "auto", block: "start" });
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
      let current = 0;
      chapterRefs.current.forEach((ref, num) => {
        if (ref.getBoundingClientRect().top < window.innerHeight / 2) current = num;
      });
      if (current > 0) setCurrentChapter(current);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background mystical-reader">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[60]">
        <Progress value={readProgress} className="h-1 rounded-none" />
      </div>

      {/* Floating controls - auto-hide */}
      <div className={`fixed top-3 left-4 right-4 z-50 flex items-center justify-between transition-opacity duration-500 ${menuVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full shadow-lg rune-border bg-card/90 backdrop-blur-md h-9 w-9"
            onClick={() => setTocOpen(!tocOpen)}
          >
            {tocOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          <Button asChild variant="outline" size="icon" className="rounded-full shadow-lg rune-border bg-card/90 backdrop-blur-md h-9 w-9">
            <Link to={`/novel/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
        </div>

        {currentChapter > 0 && (
          <div className="bg-card/90 backdrop-blur-md rounded-full rune-border px-3 py-1">
            <span className="text-xs text-muted-foreground font-display">
              Bab {currentChapter} • {Math.round(readProgress)}%
            </span>
          </div>
        )}
      </div>

      {/* TOC Sidebar */}
      {tocOpen && (
        <>
          <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40" onClick={() => setTocOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-card border-r border-border p-6 pt-16 overflow-y-auto shadow-xl">
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

      {/* Reader Content - Mythical */}
      <main className="max-w-3xl mx-auto py-16 px-6" ref={contentRef}>
        {novel && (
          <div className="text-center mb-16">
            <div className="inline-block mb-4">
              <span className="text-4xl rune-text" style={{ fontFamily: 'MedievalSharp, serif' }}>ᛟ</span>
            </div>
            <h1 className="font-display text-4xl font-bold mb-3">{novel.title}</h1>
            <p className="text-muted-foreground text-sm">{novel.genres?.join(" • ")}</p>
            <div className="mt-4 flex justify-center">
              <div className="h-px w-32 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            </div>
          </div>
        )}

        {chapters.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">Belum ada bab untuk dibaca.</p>
        ) : (
          <div className="space-y-20">
            {chapters.map((chapter, idx) => (
              <article
                key={chapter.id}
                ref={(el: HTMLDivElement | null) => { if (el) chapterRefs.current.set(chapter.chapter_number, el); }}
                className="animate-fade-in"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                {/* Mythical chapter header */}
                <div className="text-center mb-10">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/40" />
                    <span className="text-xs text-muted-foreground font-display uppercase tracking-widest">Bab {chapter.chapter_number}</span>
                    <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/40" />
                  </div>
                  <h2 className="font-display text-2xl font-bold rune-text">
                    {chapter.title}
                  </h2>
                  <div className="mt-3 flex justify-center">
                    <span className="rune-text text-lg" style={{ fontFamily: 'MedievalSharp, serif' }}>᛫ ᛫ ᛫</span>
                  </div>
                </div>

                <FormattedContent content={chapter.content} className="prose-reader text-foreground" />

                {/* Mythical chapter footer */}
                <div className="mt-12 pt-8">
                  <div className="flex justify-center mb-6">
                    <div className="h-px w-48 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                  </div>
                  <div className="flex justify-between items-center">
                    {idx > 0 ? (
                      <Button variant="ghost" size="sm" onClick={() => scrollToChapter(chapters[idx - 1].chapter_number)} className="text-muted-foreground hover:rune-text">
                        <ChevronLeft className="mr-1 h-4 w-4" /> Sebelumnya
                      </Button>
                    ) : <div />}
                    {idx < chapters.length - 1 ? (
                      <Button variant="ghost" size="sm" onClick={() => scrollToChapter(chapters[idx + 1].chapter_number)} className="text-muted-foreground hover:rune-text">
                        Berikutnya <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    ) : <div />}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* End ornament */}
        <div className="text-center mt-20 mb-8">
          <span className="text-2xl rune-text" style={{ fontFamily: 'MedievalSharp, serif' }}>ᛟ ᚱ ᛟ</span>
          <p className="text-xs text-muted-foreground mt-2">— Akhir —</p>
        </div>
      </main>
    </div>
  );
}
