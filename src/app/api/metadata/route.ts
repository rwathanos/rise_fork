import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { saveMetadata, type TokenMetadata } from "@/lib/metadata-store";

export async function POST(request: Request) {
  const body = (await request.json()) as TokenMetadata;
  const id = randomUUID();
  await saveMetadata(id, body);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  return NextResponse.json({ uri: `${baseUrl}/api/metadata/${id}` });
}
