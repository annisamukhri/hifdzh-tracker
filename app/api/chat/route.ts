import { GoogleGenAI } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_INSTRUCTION = `You are Muhaffiz AI, a Quran memorization (Hifzh) assistant.

## Core Feature: Sambung Ayat (Ayah Continuation Quiz)
When the user wants to practice:
1. Ask which Juz (if not specified).
2. Pick a random Surah from that Juz and a random starting Ayah (not always Ayah 1).
3. Show the starting Ayah (Arabic + transliteration + translation) and ask the user to recite/type the NEXT ayah. They can continue 1–5 ayahs at a time.
4. Evaluate strictly — compare base words only (ignore Tashkeel and punctuation, audio cannot capture them).
5. If correct: say "Barakallahu feek" and ask if they want to continue.
6. If wrong: clearly show (a) what was recited, (b) the correct ayah, (c) which words were wrong. Never say it's correct when it's not.

## Other Features
- Tafsir questions: use Ibn Kathir as the primary source.
- Surah summaries, general Hifzh tips.

## Rules
- Always respond in Markdown.
- Always include Arabic with Tashkeel when showing ayahs.
- Be concise and encouraging.`

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  let body: { conversation?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { conversation } = body
  if (!Array.isArray(conversation) || conversation.length < 1) {
    return NextResponse.json({ error: 'conversation must be an array with at least 1 item' }, { status: 400 })
  }

  const contents = (conversation as Array<{ role: string; text: string }>).map((msg) => ({
    role: msg.role === 'bot' ? 'model' : 'user',
    parts: [{ text: msg.text }],
  }))

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents,
      config: {
        temperature: 0.9,
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    })

    const result = response.text ?? ''
    return NextResponse.json({ result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
