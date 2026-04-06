import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, BookOpen, Sparkles, Shield, Sword } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { NovelCard } from "@/components/NovelCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_GENRES = [
  "Cultivation", "Western Fantasy", "RPG", "Romance", "Sci-Fi",
  "Horror", "Mystery", "Adventure", "Slice of Life", "Action",
];

const ITEMS_PER_PAGE = 12;

export default function Index() {
  const { toast } = useToast();
  const [novels, setNovels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [allGenres, setAllGenres] = useState<string[]>(DEFAULT_GENRES);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchNovels = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from("novels").select("*", { count: "exact" }).order("created_at", { ascending: false });
      if (search) query = query.or(`title.ilike.%${search}%,synopsis.ilike.%${search}%`);
      if (selectedGenres.length > 0) query = query.overlaps("genres", selectedGenres);
      const from = (page - 1) * ITEMS_PER_PAGE;
      query = query.range(from, from + ITEMS_PER_PAGE - 1);

      const { data, count, error } = await query;
      if (error) throw error;
      setNovels(data || []);
      setTotalCount(count || 0);

      if (data) {
        const genres = new Set<string>(DEFAULT_GENRES);
        data.forEach((n: any) => n.genres?.forEach((g: string) => genres.add(g)));
        setAllGenres(Array.from(genres).sort());
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [search, selectedGenres, page, toast]);

  useEffect(() => { fetchNovels(); }, [fetchNovels]);

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus novel ini?")) return;
    const { error } = await supabase.from("novels").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Novel dihapus" }); fetchNovels(); }
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) => prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]);
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Hero Section - Mythical */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5L35 25H55L39 35L44 55L30 43L16 55L21 35L5 25H25L30 5Z' fill='none' stroke='currentColor' stroke-width='0.5'/%3E%3C/svg%3E")`,
        }} />
        <div className="container relative py-16 text-center space-y-4">
          <div className="flex justify-center gap-3 items-center mb-2">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-primary/40" />
            <Shield className="h-5 w-5 rune-text" />
            <span className="text-3xl rune-text" style={{ fontFamily: 'MedievalSharp, serif' }}>ᛟ</span>
            <Sword className="h-5 w-5 rune-text" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-primary/40" />
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground">
            Perpustakaan <span className="rune-text">Novel AI</span>
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Tempa legenda dan kisah epik dengan kekuatan Ollama AI
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button asChild className="rune-glow">
              <Link to="/create"><Sparkles className="mr-1 h-4 w-4" /> Tempa Novel Baru</Link>
            </Button>
          </div>
        </div>
      </section>

      <main className="container py-8 space-y-6">
        {/* Search & Filters */}
        <div className="space-y-4">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari judul atau sinopsis..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10 rune-border"
            />
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {allGenres.map((genre) => (
              <Badge
                key={genre}
                variant={selectedGenres.includes(genre) ? "default" : "outline"}
                className={`cursor-pointer transition-all ${selectedGenres.includes(genre) ? "rune-glow" : "hover:border-primary/50"}`}
                onClick={() => toggleGenre(genre)}
              >
                {genre}
              </Badge>
            ))}
            {selectedGenres.length > 0 && (
              <Badge variant="outline" className="cursor-pointer text-destructive border-destructive" onClick={() => { setSelectedGenres([]); setPage(1); }}>
                Reset
              </Badge>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-80 rounded-lg bg-muted animate-pulse rune-border" />
            ))}
          </div>
        ) : novels.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="inline-block p-6 rounded-full bg-primary/5 rune-border">
              <BookOpen className="mx-auto h-16 w-16 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground font-display text-lg">
              {search || selectedGenres.length > 0 ? "Tidak ada novel yang ditemukan." : "Gulungan kosong. Mulai tempa novel pertamamu!"}
            </p>
            <Button asChild className="rune-glow">
              <Link to="/create"><Plus className="mr-1 h-4 w-4" /> Tempa Novel Baru</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {novels.map((novel) => (
                <NovelCard
                  key={novel.id}
                  id={novel.id}
                  title={novel.title}
                  genres={novel.genres || []}
                  synopsis={novel.synopsis}
                  chapterCount={0}
                  wordCount={novel.word_count}
                  status={novel.status}
                  coverImage={novel.cover_image}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rune-border">
                  ᚱ Sebelumnya
                </Button>
                <span className="flex items-center px-4 text-sm text-muted-foreground font-display">
                  {page} / {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rune-border">
                  Berikutnya ᚱ
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-8">
        <div className="container text-center">
          <span className="text-xl rune-text" style={{ fontFamily: 'MedievalSharp, serif' }}>ᛟ ᚱ ᛟ</span>
          <p className="text-xs text-muted-foreground mt-2">Novel AI — Ditempa dengan kekuatan Rune</p>
        </div>
      </footer>
    </div>
  );
}
