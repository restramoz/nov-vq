import { useState, useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, TestTube2, Loader2, CheckCircle, XCircle, Key } from "lucide-react";
import { Link } from "react-router-dom";
import { testOllamaConnection } from "@/lib/ollama";

const FONT_OPTIONS = [
  { value: "Lora", label: "Lora (Serif)" },
  { value: "Georgia", label: "Georgia (Serif)" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "MedievalSharp", label: "MedievalSharp (Runic)" },
  { value: "Inter", label: "Inter (Sans-serif)" },
  { value: "system-ui", label: "System Default" },
];

const OLLAMA_MODELS = [
  "deepseek-v3.2:cloud",
  "glm-5:cloud",
  "nemotron-3-super:cloud",
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("deepseek-v3.2:cloud");
  const [ollamaApiKey, setOllamaApiKey] = useState("");
  const [preferredFont, setPreferredFont] = useState("Lora");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    setOllamaUrl(localStorage.getItem("ollama_url") || "http://localhost:11434");
    setOllamaModel(localStorage.getItem("ollama_model") || "deepseek-v3.2:cloud");
    setOllamaApiKey(localStorage.getItem("ollama_api_key") || "");
    setPreferredFont(localStorage.getItem("preferred_font") || "Lora");
  }, []);

  const handleSave = () => {
    localStorage.setItem("ollama_url", ollamaUrl);
    localStorage.setItem("ollama_model", ollamaModel);
    localStorage.setItem("ollama_api_key", ollamaApiKey);
    localStorage.setItem("preferred_font", preferredFont);
    toast({ title: "Pengaturan tersimpan!" });
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const ok = await testOllamaConnection();
      if (ok) {
        setTestResult("success");
        toast({ title: "Koneksi Ollama berhasil!" });
      } else {
        setTestResult("error");
        toast({ title: "Koneksi gagal", description: "Pastikan Ollama berjalan di " + ollamaUrl, variant: "destructive" });
      }
    } catch (err: any) {
      setTestResult("error");
      toast({ title: "Koneksi gagal", description: err.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-xl py-8 space-y-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" /> Kembali</Link>
        </Button>

        <h1 className="font-display text-3xl font-bold rune-text">⚙ Pengaturan</h1>

        <div className="space-y-6 rounded-lg rune-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <span className="rune-text">ᛟ</span> Konfigurasi Ollama
          </h2>

          <div className="space-y-2">
            <Label htmlFor="ollama-url">Ollama URL</Label>
            <Input
              id="ollama-url"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              placeholder="http://localhost:11434"
            />
            <p className="text-xs text-muted-foreground">
              Cloud endpoint: https://ollama.com/api/chat
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ollama-api-key" className="flex items-center gap-1">
              <Key className="h-3.5 w-3.5" /> API Key (opsional)
            </Label>
            <Input
              id="ollama-api-key"
              type="password"
              value={ollamaApiKey}
              onChange={(e) => setOllamaApiKey(e.target.value)}
              placeholder="Masukkan API key jika diperlukan..."
            />
            <p className="text-xs text-muted-foreground">
              Diperlukan untuk cloud endpoint. Header: Authorization: Bearer [key]
            </p>
          </div>

          <div className="space-y-2">
            <Label>Model Default</Label>
            <Select value={ollamaModel} onValueChange={setOllamaModel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OLLAMA_MODELS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleTest} variant="outline" disabled={testing}>
              {testing ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : testResult === "success" ? (
                <CheckCircle className="mr-1 h-4 w-4 text-green-500" />
              ) : testResult === "error" ? (
                <XCircle className="mr-1 h-4 w-4 text-destructive" />
              ) : (
                <TestTube2 className="mr-1 h-4 w-4" />
              )}
              Test Koneksi
            </Button>
            <Button onClick={handleSave}>
              <Save className="mr-1 h-4 w-4" /> Simpan
            </Button>
          </div>
        </div>

        <div className="space-y-6 rounded-lg rune-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <span className="rune-text">ᚱ</span> Tampilan
          </h2>

          <div className="space-y-2">
            <Label>Font Pembaca</Label>
            <Select value={preferredFont} onValueChange={setPreferredFont}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: preferredFont }}>
              Contoh: Ini adalah teks dengan font {preferredFont}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
