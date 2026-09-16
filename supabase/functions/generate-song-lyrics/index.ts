// "Write with AI" — generates completely original worship-song lyrics from
// a topic/style/mood/structure, using Groq (a free, fast inference API,
// OpenAI-compatible). This is the one part of the Song Search & Import
// system that needs a real secret (a Groq API key) — which is exactly why
// it's a Supabase Edge Function and not a client-side call:
// Deno.env.get('GROQ_API_KEY') never reaches the browser, unlike the
// free/keyless iTunes Search integration this sits alongside
// (src/lib/songSearch/).
//
// Deploy: supabase functions deploy generate-song-lyrics
// Configure the secret once: supabase secrets set GROQ_API_KEY=gsk_...
// (A Groq API key, free, from console.groq.com/keys — unrelated to the
// Apple Developer / iTunes confusion earlier in this project's history,
// and to Anthropic, which this function used before switching to Groq's
// free tier. This function is never called by anything unless you deploy
// it — until then, the "Write with AI" button shows a clear "not
// configured yet" message instead of failing mysteriously.)

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface GenerateLyricsRequest {
  topic: string;
  style: string;
  mood: string;
  verseCount: number;
  includeChorus: boolean;
  includePreChorus: boolean;
  includeBridge: boolean;
}

// Groq's free-tier model lineup changes over time — check
// console.groq.com/docs/models for the current list if this one is ever
// retired (the function will otherwise start returning a clean "model
// decommissioned"-style error from Groq, not a silent failure).
const GROQ_MODEL = 'llama-3.3-70b-versatile';

function buildPrompt(req: GenerateLyricsRequest): { system: string; user: string } {
  const sections: string[] = [];
  for (let i = 1; i <= req.verseCount; i++) sections.push(`[Verse ${i}]`);
  if (req.includePreChorus) sections.push('[Pre-Chorus]');
  if (req.includeChorus) sections.push('[Chorus]');
  if (req.includeBridge) sections.push('[Bridge]');

  const system = `You are a worship songwriter helping a church media team draft original song lyrics.

CRITICAL RULES — non-negotiable:
1. Write ENTIRELY ORIGINAL lyrics. Never reproduce, closely paraphrase, or mimic the specific
   distinctive lyrics, title, or melody-implying phrasing of any existing copyrighted song —
   even one with a similar theme or title. If the topic resembles a well-known worship song,
   still write something new in your own words, not a recognizable variation of that song.
2. Keep language congregational and singable: short, clear lines; avoid obscure vocabulary;
   avoid anything doctrinally divisive across mainstream Christian traditions.
3. Output ONLY the lyrics in this exact plain-text format, nothing else — no preamble, no
   explanation, no markdown formatting, no quotation marks around the whole thing:

SUGGESTED TITLE: <a short, original song title>

${sections.join('\n\n')}

Each section label must appear exactly as shown above (e.g. "[Verse 1]", "[Chorus]"), on its
own line, followed by that section's lyrics (multiple short lines is fine). Do not add sections
that weren't requested. Do not number unrequested verses.`;

  const user = `Topic: ${req.topic}\nStyle: ${req.style}\nMood: ${req.mood}`;

  return { system, user };
}

function parseTitleAndLyrics(raw: string): { title: string; lyrics: string } {
  const titleMatch = raw.match(/^SUGGESTED TITLE:\s*(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : '';
  const lyrics = raw.replace(/^SUGGESTED TITLE:\s*.+\n?/m, '').trim();
  return { title, lyrics };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'AI lyric writing is not configured yet — set the GROQ_API_KEY secret for this Supabase project.' }),
      { status: 503, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  let body: GenerateLyricsRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Malformed request.' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  if (!body.topic || !body.topic.trim()) {
    return new Response(JSON.stringify({ error: 'A topic is required.' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const verseCount = Math.min(Math.max(1, body.verseCount || 2), 4);
  const { system, user } = buildPrompt({ ...body, verseCount });

  let response: Response;
  try {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 1200,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
  } catch (err) {
    console.error('Error calling Groq API:', err);
    return new Response(JSON.stringify({ error: 'Could not reach the AI service. Please try again.' }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  if (response.status === 401) {
    return new Response(JSON.stringify({ error: 'The configured Groq API key was rejected — check the GROQ_API_KEY secret.' }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
  if (response.status === 429) {
    return new Response(JSON.stringify({ error: 'The AI service is rate-limited right now. Please try again shortly.' }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
  if (!response.ok) {
    console.error('Groq API error:', response.status, await response.text().catch(() => ''));
    return new Response(JSON.stringify({ error: 'The AI service returned an error. Please try again.' }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const data = await response.json();
  const text: string = data?.choices?.[0]?.message?.content ?? '';

  if (!text.trim()) {
    return new Response(JSON.stringify({ error: 'The AI did not return any lyrics. Please try again.' }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const { title, lyrics } = parseTitleAndLyrics(text);

  return new Response(JSON.stringify({ title, lyrics }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
});
