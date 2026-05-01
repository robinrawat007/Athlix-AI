import { NextResponse } from "next/server";

export function ok<T>(data: T): NextResponse {
  return NextResponse.json({ success: true, data });
}

export function err(message: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}
