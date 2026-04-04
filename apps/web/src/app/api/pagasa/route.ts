import { NextResponse } from "next/server";
import { fetchPagasaAdvisories } from "@/lib/pagasa-advisories";

export async function GET() {
  try {
    const advisories = await fetchPagasaAdvisories();
    return NextResponse.json(advisories);
  } catch (error) {
    console.error("PAGASA fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch PAGASA alerts" }, { status: 500 });
  }
}