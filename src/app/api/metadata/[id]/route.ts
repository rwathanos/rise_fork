import { NextResponse } from "next/server";

import { getMetadata } from "@/lib/metadata-store";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const metadata = await getMetadata(id);
  if (!metadata) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(metadata);
}
