import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
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

  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) {
    return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const audioFile = formData.get('audio') as File | null
  if (!audioFile) {
    return NextResponse.json({ error: 'Missing audio field' }, { status: 400 })
  }

  const historyRaw = formData.get('history') as string | null
  let history: Array<{ role: string; text: string }> = []
  if (historyRaw) {
    try {
      history = JSON.parse(historyRaw)
    } catch {
      history = []
    }
  }

  try {
    // Step 1: Transcribe audio with Groq Whisper (Arabic language, free tier)
    const groq = new OpenAI({
      apiKey: groqKey,
      baseURL: 'https://api.groq.com/openai/v1',
    })
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',
      language: 'ar',
    })
    const transcribedText = transcription.text

    // Step 2: Send transcription + history to Gemini for evaluation
    const contents = [
      ...history.map((msg) => ({
        role: msg.role === 'bot' || msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.text }],
      })),
      {
        role: 'user',
        parts: [{ text: `Here is my recitation (transcribed from audio by Groq Whisper):\n\n${transcribedText}` }],
      },
    ]

    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    })

    const result = response.text ?? ''
    return NextResponse.json({ result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[chat-audio]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
