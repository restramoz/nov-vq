import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Music, Play, Pause, Volume2, VolumeX, X, ChevronUp, ChevronDown } from "lucide-react";

interface GlobalMusicPlayerProps {
  audioUrl: string | null;
  novelTitle?: string;
}

export function GlobalMusicPlayer({ audioUrl, novelTitle }: GlobalMusicPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(50);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume / 100;
    }
  }, [volume, muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setProgress(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!audioUrl) { setPlaying(false); setVisible(true); }
  }, [audioUrl]);

  if (!audioUrl || !visible) return null;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
    setPlaying(!playing);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-[70] flex flex-col items-end gap-1">
      <audio ref={audioRef} src={audioUrl} preload="metadata" loop />

      {expanded && (
        <div className="rounded-xl rune-border bg-card/95 backdrop-blur-md p-4 w-72 space-y-3 shadow-2xl animate-fade-in">
          {novelTitle && (
            <p className="text-xs text-muted-foreground truncate font-display">♪ {novelTitle}</p>
          )}
          <Slider
            value={[progress]}
            max={duration || 100}
            step={1}
            onValueChange={(v) => { if (audioRef.current) audioRef.current.currentTime = v[0]; }}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setMuted(!muted)} className="h-7 w-7 p-0">
              {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </Button>
            <Slider
              value={[muted ? 0 : volume]}
              max={100}
              step={1}
              onValueChange={(v) => { setVolume(v[0]); setMuted(false); }}
              className="flex-1"
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full rune-border rune-glow shadow-lg bg-card/95 backdrop-blur-md"
          onClick={togglePlay}
        >
          {playing ? (
            <Pause className="h-4 w-4 rune-text" />
          ) : (
            <Play className="h-4 w-4 rune-text" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full text-muted-foreground"
          onClick={() => { setVisible(false); if (audioRef.current) audioRef.current.pause(); setPlaying(false); }}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
