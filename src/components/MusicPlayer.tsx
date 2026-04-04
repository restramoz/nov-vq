import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Music, Upload, Play, Pause, Volume2, VolumeX, Trash2, Loader2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface MusicPlayerProps {
  novelId: string;
  audioUrl: string | null;
  onUpdate: () => void;
}

export function MusicPlayer({ novelId, audioUrl, onUpdate }: MusicPlayerProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(50);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume / 100;
    }
  }, [volume, muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [audioUrl]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      toast({ title: "File harus berupa audio (MP3, WAV, dll.)", variant: "destructive" });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "Ukuran file maksimal 20MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "mp3";
      const path = `${novelId}/bgm.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("novel-audio")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("novel-audio").getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("novels")
        .update({ audio_url: urlData.publicUrl })
        .eq("id", novelId);

      if (updateError) throw updateError;

      toast({ title: "Musik berhasil diupload!" });
      onUpdate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!confirm("Hapus musik latar?")) return;
    try {
      const { error } = await supabase.from("novels").update({ audio_url: null }).eq("id", novelId);
      if (error) throw error;
      if (audioRef.current) { audioRef.current.pause(); setPlaying(false); }
      toast({ title: "Musik dihapus" });
      onUpdate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  const handleSeek = (val: number[]) => {
    if (audioRef.current) audioRef.current.currentTime = val[0];
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="rounded-lg rune-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold flex items-center gap-2">
          <Music className="h-4 w-4 rune-text" /> Musik Latar (BGM)
        </h3>
        <div className="flex gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Upload className="mr-1 h-3 w-3" />}
            {audioUrl ? "Ganti" : "Upload"}
          </Button>
          {audioUrl && (
            <Button variant="ghost" size="sm" onClick={handleRemove} className="text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {audioUrl && (
        <>
          <audio ref={audioRef} src={audioUrl} preload="metadata" loop />
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={togglePlay} className="h-8 w-8 p-0">
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            <div className="flex-1 space-y-1">
              <Slider
                value={[progress]}
                max={duration || 100}
                step={1}
                onValueChange={handleSeek}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={() => setMuted(!muted)} className="h-8 w-8 p-0">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>

            <div className="w-20">
              <Slider
                value={[muted ? 0 : volume]}
                max={100}
                step={1}
                onValueChange={(v) => { setVolume(v[0]); setMuted(false); }}
              />
            </div>
          </div>
        </>
      )}

      {!audioUrl && (
        <p className="text-xs text-muted-foreground">Upload file audio (MP3, WAV) sebagai musik latar saat membaca novel.</p>
      )}
    </div>
  );
}
