import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function ChapterReader() {
  const { id } = useParams<{ id: string }>();
  const [novel, setNovel] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tocOpen, setTocOpen] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const chapterRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      setLoading(true);
      const [novelRes, chaptersRes] = await Promise.all([
        supabase.from("novels").select("*").eq("id", id).single(),
        supabase.from("chapters").select("*").eq("novel_id", id).order("chapter_number"),
      ]);
      setNovel(novelRes.data);
      setChapters(chaptersRes.data || []);
      setLoading(false);
    };
    fetch();
  }, [id]);

  const handleScroll = useCallback(() => {
    const el = document.documentElement;
    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight - el.clientHeight;
    if (scrollHeight > 0) {
      setReadProgress((scrollTop / scrollHeight) * 100);
    }
  }, []);

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
        className="fixed left-4 top-20 z-50 rounded-full shadow-lg"
        onClick={() => setTocOpen(!tocOpen)}
      >
        {tocOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* TOC Sidebar */}
      {tocOpen && (
        <>
          <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40" onClick={() => setTocOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-card border-r border-border p-6 pt-20 overflow-y-auto shadow-xl">
            <h2 className="font-display text-lg font-semibold mb-4">Daftar Isi</h2>
            <nav className="space-y-1">
              {chapters.map((ch) => (
                <button
                  key={ch.chapter_number}
                  onClick={() => scrollToChapter(ch.chapter_number)}
                  className="block w-full text-left px-3 py-2 rounded-md text-sm hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
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
                <h2 className="font-display text-2xl font-bold text-center mb-8 text-primary">
                  Bab {chapter.chapter_number}: {chapter.title}
                </h2>
                <div className="prose-reader text-foreground whitespace-pre-wrap leading-[1.9]">
                  {chapter.content}
                </div>

                {/* Chapter navigation */}
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
