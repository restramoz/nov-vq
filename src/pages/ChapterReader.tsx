import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight, Menu, X, Shield } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { FormattedContent } from "@/components/FormattedContent";
import { useMusic } from "@/contexts/MusicContext";

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
  const { setMusic } = useMusic();
  const [novel, setNovel] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tocOpen, setTocOpen] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const chapterRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const contentRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef(false);

  // Toggle menu on tap/click on reading area
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    // Don't toggle if clicking a button, link, or interactive element
    const target = e.target as HTMLElement;
    if (target.closest("button, a, nav, aside")) return;
    setMenuVisible(prev => !prev);
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

      // Persist music across reader
      if (novelRes.data?.audio_url) {
        setMusic(novelRes.data.audio_url, novelRes.data.title);
      }
    };
    fetchData();
  }, [id, setMusic]);

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Shield className="mx-auto h-10 w-10 rune-text animate-pulse" />
          <p className="text-muted-foreground font-display">Membuka gulungan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background mystical-reader">
      {/* Progress bar - rune styled */}
      <div className="fixed top-0 left-0 right-0 z-[60]">
        <Progress value={readProgress} className="h-1 rounded-none" />
      </div>

      {/* Floating controls - auto-hide */}
      <div className={`fixed top-3 left-4 right-4 z-50 flex items-center justify-between transition-all duration-500 ${menuVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"}`}>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full shadow-lg rune-border bg-card/95 backdrop-blur-md h-9 w-9"
            onClick={() => setTocOpen(!tocOpen)}
          >
            {tocOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          <Button asChild variant="outline" size="icon" className="rounded-full shadow-lg rune-border bg-card/95 backdrop-blur-md h-9 w-9">
            <Link to={`/novel/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
        </div>

        {currentChapter > 0 && (
          <div className="bg-card/95 backdrop-blur-md rounded-full rune-border px-4 py-1.5 shadow-lg">
            <span className="text-xs text-muted-foreground font-display">
              <span className="rune-text">ᛟ</span> Bab {currentChapter} • {Math.round(readProgress)}%
            </span>
          </div>
        )}
      </div>

      {/* TOC Sidebar - Mythical */}
      {tocOpen && (
        <>
          <div className="fixed inset-0 bg-rune-dark/60 backdrop-blur-sm z-40" onClick={() => setTocOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-card border-r border-border p-6 pt-16 overflow-y-auto shadow-2xl">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="h-5 w-5 rune-text" />
              <h2 className="font-display text-lg font-semibold rune-text">Daftar Isi</h2>
            </div>
            <div className="h-px w-full bg-gradient-to-r from-primary/30 via-primary/10 to-transparent mb-4" />
            <nav className="space-y-1">
              {chapters.map((ch) => (
                <button
                  key={ch.chapter_number}
                  onClick={() => scrollToChapter(ch.chapter_number)}
                  className={`block w-full text-left px-3 py-2.5 rounded-md text-sm transition-all ${
                    currentChapter === ch.chapter_number
                      ? "bg-primary/10 rune-text font-medium rune-border"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <span className="text-xs rune-text mr-1">ᚱ</span> Bab {ch.chapter_number}: {ch.title}
                </button>
              ))}
            </nav>
          </aside>
        </>
      )}

      {/* Reader Content - Mythical Fantasy */}
      <main className="max-w-3xl mx-auto py-16 px-6" ref={contentRef}>
        {novel && (
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-primary/40" />
              <Shield className="h-8 w-8 rune-text" />
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-primary/40" />
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">{novel.title}</h1>
            <p className="text-muted-foreground text-sm font-display">{novel.genres?.join(" • ")}</p>
            <div className="mt-6 flex justify-center">
              <div className="h-px w-48 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            </div>
          </div>
        )}

        {chapters.length === 0 ? (
          <div className="text-center py-20">
            <Shield className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-display">Belum ada bab untuk dibaca.</p>
          </div>
        ) : (
          <div className="space-y-24">
            {chapters.map((chapter, idx) => (
              <article
                key={chapter.id}
                ref={(el: HTMLDivElement | null) => { if (el) chapterRefs.current.set(chapter.chapter_number, el); }}
                className="animate-fade-in"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                {/* Mythical chapter header */}
                <div className="text-center mb-12">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="h-px w-16 bg-gradient-to-r from-transparent to-primary/40" />
                    <span className="text-xs text-muted-foreground font-display uppercase tracking-[0.25em]">Bab {chapter.chapter_number}</span>
                    <div className="h-px w-16 bg-gradient-to-l from-transparent to-primary/40" />
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold rune-text">
                    {chapter.title}
                  </h2>
                  <div className="mt-4 flex justify-center gap-2">
                    <span className="rune-text text-lg" style={{ fontFamily: 'MedievalSharp, serif' }}>᛫</span>
                    <Shield className="h-4 w-4 rune-text" />
                    <span className="rune-text text-lg" style={{ fontFamily: 'MedievalSharp, serif' }}>᛫</span>
                  </div>
                </div>

                <FormattedContent content={chapter.content} className="prose-reader text-foreground" />

                {/* Mythical chapter footer */}
                <div className="mt-16 pt-8">
                  <div className="flex justify-center mb-8">
                    <div className="h-px w-64 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                  </div>
                  <div className="flex justify-between items-center">
                    {idx > 0 ? (
                      <Button variant="ghost" size="sm" onClick={() => scrollToChapter(chapters[idx - 1].chapter_number)} className="text-muted-foreground hover:rune-text rune-border">
                        <ChevronLeft className="mr-1 h-4 w-4" /> Sebelumnya
                      </Button>
                    ) : <div />}
                    {idx < chapters.length - 1 ? (
                      <Button variant="ghost" size="sm" onClick={() => scrollToChapter(chapters[idx + 1].chapter_number)} className="text-muted-foreground hover:rune-text rune-border">
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
        <div className="text-center mt-24 mb-8 space-y-3">
          <div className="flex justify-center gap-3 items-center">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-primary/30" />
            <Shield className="h-6 w-6 rune-text" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-primary/30" />
          </div>
          <span className="text-xl rune-text" style={{ fontFamily: 'MedievalSharp, serif' }}>ᛟ ᚱ ᛟ</span>
          <p className="text-xs text-muted-foreground font-display">— Akhir Gulungan —</p>
        </div>
      </main>
    </div>
  );
}
