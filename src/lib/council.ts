// AI Council Pipeline: Writer → Analyst → Reviewer
import { ollamaGenerate, ollamaGenerateStream, type OllamaMessage } from "./ollama";
import type { CouncilMember } from "@/components/AICouncil";

export interface CouncilResult {
  phase: "idle" | "writing" | "analyzing" | "reviewing" | "done" | "error";
  writerOutput: string;
  analystOutput: string;
  reviewerOutput: string;
  qualityScore: number | null;
  error?: string;
}

export const INITIAL_COUNCIL_RESULT: CouncilResult = {
  phase: "idle",
  writerOutput: "",
  analystOutput: "",
  reviewerOutput: "",
  qualityScore: null,
};

const ANALYST_PROMPT = `
Kamu adalah ANALYST novel profesional. Tugasmu: menganalisis konsistensi plot, karakter, dan lore dari sebuah bab novel.

PROTOKOL ANALISIS:
1. Periksa apakah karakter berperilaku SESUAI kepribadian mereka (In-Character check).
2. Periksa KONSISTENSI PLOT — apakah ada kontradiksi dengan bab sebelumnya?
3. Periksa PACING — apakah ritme cerita tepat untuk fase ini?
4. Periksa LORE CONSISTENCY — apakah ada pelanggaran aturan dunia?
5. Berikan daftar MASALAH yang ditemukan beserta SARAN PERBAIKAN spesifik.

FORMAT OUTPUT:
## Analisis Konsistensi
### Karakter: [OK/MASALAH]
- [detail]
### Plot: [OK/MASALAH]  
- [detail]
### Pacing: [OK/MASALAH]
- [detail]
### Lore: [OK/MASALAH]
- [detail]

## Saran Perbaikan
1. [saran spesifik]
2. [saran spesifik]
`.trim();

const REVIEWER_PROMPT = `
Kamu adalah REVIEWER novel profesional. Tugasmu: memberikan skor kualitas dan rekomendasi perbaikan final.

PROTOKOL REVIEW:
1. Baca bab yang ditulis Writer dan analisis dari Analyst.
2. Nilai kualitas tulisan pada skala 1-100 berdasarkan:
   - Prosa & Diksi (25 poin): kekayaan bahasa, keindahan kalimat
   - Dialog (25 poin): keautentikan, subtext, variasi suara karakter
   - Struktur (25 poin): pacing, hooks, cliffhanger, transisi
   - Imersi (25 poin): show don't tell, detail sensoris, emosi
3. Berikan rekomendasi perbaikan berdasarkan skor terendah.
4. Jika ada masalah dari Analyst, verifikasi apakah masalah tersebut KRITIS atau minor.

FORMAT OUTPUT:
## Skor Kualitas: [ANGKA]/100

### Detail Skor
- Prosa & Diksi: [angka]/25
- Dialog: [angka]/25
- Struktur: [angka]/25
- Imersi: [angka]/25

### Penilaian
[paragraf singkat penilaian keseluruhan]

### Rekomendasi Perbaikan
1. [rekomendasi prioritas tinggi]
2. [rekomendasi prioritas sedang]
3. [rekomendasi minor]
`.trim();

export async function runCouncilPipeline(
  council: CouncilMember[],
  systemPrompt: string,
  userPrompt: string,
  novelContext: string,
  onUpdate: (result: Partial<CouncilResult>) => void,
  onStream: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<CouncilResult> {
  const writerModel = council.find(m => m.role === "writer")?.model;
  const analystModel = council.find(m => m.role === "analyst")?.model;
  const reviewerModel = council.find(m => m.role === "reviewer")?.model;

  const result: CouncilResult = { ...INITIAL_COUNCIL_RESULT };

  try {
    // === PHASE 1: Writer generates ===
    result.phase = "writing";
    onUpdate({ phase: "writing" });

    let writerText = "";
    for await (const chunk of ollamaGenerateStream(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { model: writerModel, signal }
    )) {
      writerText += chunk;
      onStream(chunk);
    }
    result.writerOutput = writerText;
    onUpdate({ writerOutput: writerText });

    // === PHASE 2: Analyst reviews consistency ===
    result.phase = "analyzing";
    onUpdate({ phase: "analyzing" });

    const analystMessages: OllamaMessage[] = [
      { role: "system", content: ANALYST_PROMPT },
      {
        role: "user",
        content: `${novelContext}\n\n=== BAB YANG DITULIS WRITER ===\n${writerText}\n=== END ===\n\nAnalisis konsistensi bab di atas. Periksa karakter, plot, pacing, dan lore.`,
      },
    ];

    const analystText = await ollamaGenerate(analystMessages, { model: analystModel, signal });
    result.analystOutput = analystText;
    onUpdate({ analystOutput: analystText });

    // === PHASE 3: Reviewer scores quality ===
    result.phase = "reviewing";
    onUpdate({ phase: "reviewing" });

    const reviewerMessages: OllamaMessage[] = [
      { role: "system", content: REVIEWER_PROMPT },
      {
        role: "user",
        content: `=== BAB YANG DITULIS ===\n${writerText}\n\n=== ANALISIS DARI ANALYST ===\n${analystText}\n=== END ===\n\nBerikan skor kualitas dan rekomendasi perbaikan.`,
      },
    ];

    const reviewerText = await ollamaGenerate(reviewerMessages, { model: reviewerModel, signal });
    result.reviewerOutput = reviewerText;

    // Extract score
    const scoreMatch = reviewerText.match(/Skor Kualitas[:\s]*(\d+)/i);
    result.qualityScore = scoreMatch ? parseInt(scoreMatch[1]) : null;

    onUpdate({ reviewerOutput: reviewerText, qualityScore: result.qualityScore });

    result.phase = "done";
    onUpdate({ phase: "done" });
  } catch (err: any) {
    result.phase = "error";
    result.error = err.message;
    onUpdate({ phase: "error", error: err.message });
  }

  return result;
}
