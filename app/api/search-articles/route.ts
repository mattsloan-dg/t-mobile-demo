import { NextResponse } from "next/server";
import { loadHelpArticles, searchArticles } from "@/lib/rag";

export async function POST(request: Request) {
  const { query } = await request.json();
  const articles = loadHelpArticles();
  const results = searchArticles(query, articles);
  return NextResponse.json({ results });
}
