import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, BookOpen } from "lucide-react";
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
      <main className="container py-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-display text-4xl font-bold text-foreground">
            <span className="rune-text" style={{ fontFamily: 'MedievalSharp, serif' }}>ᛟ</span>{" "}
            Perpustakaan <span className="rune-text">Novel AI</span>
          </h1>
          <p className="text-muted-foreground">Buat dan baca novel yang di-generate oleh Ollama AI</p>
        </div>

        <div className="space-y-4">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari judul atau sinopsis..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {allGenres.map((genre) => (
              <Badge key={genre} variant={selectedGenres.includes(genre) ? "default" : "outline"} className="cursor-pointer transition-colors" onClick={() => toggleGenre(genre)}>
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
              <div key={i} className="h-80 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : novels.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <BookOpen className="mx-auto h-16 w-16 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {search || selectedGenres.length > 0 ? "Tidak ada novel yang ditemukan." : "Belum ada novel. Mulai buat novel pertamamu!"}
            </p>
            <Button asChild className="rune-glow">
              <Link to="/create"><Plus className="mr-1 h-4 w-4" /> Buat Novel Baru</Link>
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
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Sebelumnya</Button>
                <span className="flex items-center px-3 text-sm text-muted-foreground">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Berikutnya</Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
