import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, synopsis, genres, master_concept, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const genreContext = (genres || []).join(", ");

    const systemPrompt = `You are a character designer for novels. Extract and create detailed characters from the novel premise. Write in ${language || "Indonesia"}.`;

    const userPrompt = `Based on this novel:
Title: ${title}
Genres: ${genreContext}
Synopsis: ${synopsis}
${master_concept ? `Master Concept:\n${master_concept}` : ""}

Extract ALL important characters. For each character provide:
- name: Full name of the character
- role: Their role in the story (e.g. "Protagonist", "Antagonist", "Supporting", "Mentor", "Love Interest", etc.)
- description: A detailed 2-3 sentence description of the character including appearance, personality, and background
- traits: An array of 3-5 key personality/ability traits

Return the characters as structured data.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_characters",
              description: "Extract characters from the novel premise",
              parameters: {
                type: "object",
                properties: {
                  characters: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Character full name" },
                        role: { type: "string", description: "Role in the story" },
                        description: { type: "string", description: "Detailed character description" },
                        traits: {
                          type: "array",
                          items: { type: "string" },
                          description: "3-5 key traits",
                        },
                      },
                      required: ["name", "role", "description", "traits"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["characters"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_characters" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const characters = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(characters), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-characters error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
