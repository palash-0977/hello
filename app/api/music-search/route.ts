import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''

    if (!q.trim()) {
      return NextResponse.json({ results: [] })
    }

    const upstream = await fetch(
      `https://api.jiosaavn.com/searchSongs?q=${encodeURIComponent(q)}`
    )

    const text = await upstream.text()

    if (!text) {
      return NextResponse.json({ results: [] })
    }

    try {
      const json = JSON.parse(text)
      return NextResponse.json(json, { status: upstream.status })
    } catch {
      return NextResponse.json({ results: [] }, { status: 200 })
    }
  } catch (err) {
    return NextResponse.json({ results: [] }, { status: 200 })
  }
}