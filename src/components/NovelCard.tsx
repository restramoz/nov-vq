import { Link } from "react-router-dom";
import { BookOpen, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NovelCardProps {
  id: string;
  title: string;
  genres: string[];
  synopsis: string;
  chapterCount: number;
  wordCount: number;
  status: string;
  coverImage?: string | null;
  onDelete: (id: string) => void;
}

export function NovelCard({
  id, title, genres, synopsis, chapterCount, wordCount, status, coverImage, onDelete,
}: NovelCardProps) {
  return (
    <div className="novel-card-hover group relative overflow-hidden rounded-lg border border-border bg-card">
      {/* Cover */}
      <div className="relative h-48 overflow-hidden bg-secondary">
        {coverImage ? (
          <img src={coverImage} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-gold-dark to-gold">
            <BookOpen className="h-16 w-16 text-primary-foreground/60" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-xs">
            {status}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-display text-lg font-semibold text-card-foreground line-clamp-1">{title}</h3>
        
        <div className="flex flex-wrap gap-1">
          {genres.slice(0, 3).map((genre) => (
            <Badge key={genre} variant="outline" className="text-xs border-primary/30 text-primary">
              {genre}
            </Badge>
          ))}
          {genres.length > 3 && (
            <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground">
              +{genres.length - 3}
            </Badge>
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">{synopsis}</p>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{chapterCount} Bab</span>
          <span>•</span>
          <span>{wordCount.toLocaleString()} kata</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button asChild size="sm" className="flex-1">
            <Link to={`/novel/${id}`}>
              <BookOpen className="mr-1 h-3 w-3" /> Baca
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to={`/novel/${id}`}>
              <Pencil className="h-3 w-3" />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(id)}
            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
