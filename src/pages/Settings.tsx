import { useState, useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, TestTube2, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Link } from "react-router-dom";

const FONT_OPTIONS = [
  { value: "Lora", label: "Lora (Serif)" },
  { value: "Georgia", label: "Georgia (Serif)" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Inter", label: "Inter (Sans-serif)" },
  { value: "system-ui", label: "System Default" },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [host, setHost] = useState("https://api.cerebras.ai");
  const [defaultModel, setDefaultModel] = useState("qwen-3-235b-a22b-instruct-2507");
  const [preferredFont, setPreferredFont] = useState("Lora");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    setApiKey(localStorage.getItem("cerebras_api_key") || "");
    setHost(localStorage.getItem("cerebras_host") || "https://api.cerebras.ai");
    setDefaultModel(localStorage.getItem("cerebras_model") || "qwen-3-235b-a22b-instruct-2507");
    setPreferredFont(localStorage.getItem("preferred_font") || "Lora");
  }, []);

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast({ title: "API Key tidak boleh kosong", variant: "destructive" });
      return;
    }
    localStorage.setItem("cerebras_api_key", apiKey);
    localStorage.setItem("cerebras_host", host);
    localStorage.setItem("cerebras_model", defaultModel);
    localStorage.setItem("preferred_font", preferredFont);
    toast({ title: "Pengaturan tersimpan!" });
  };

  const handleTest = async () => {
    if (!apiKey.trim()) {
      toast({ title: "API Key tidak boleh kosong", variant: "destructive" });
      return;
    }
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`${host}/v1/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (response.ok) {
        setTestResult("success");
        toast({ title: "Koneksi berhasil!" });
      } else {
        const err = await response.text();
        setTestResult("error");
        toast({ title: "Koneksi gagal", description: `Status ${response.status}: ${err}`, variant: "destructive" });
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

        <h1 className="font-display text-3xl font-bold">Pengaturan</h1>

        <div className="space-y-6 rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Konfigurasi AI (Cerebras)</h2>

          <div className="space-y-2">
            <Label htmlFor="api-key">API Key *</Label>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="host">Host</Label>
            <Input
              id="host"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="https://api.cerebras.ai"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model Default</Label>
            <Input
              id="model"
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
            />
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

        <div className="space-y-6 rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Tampilan</h2>

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
