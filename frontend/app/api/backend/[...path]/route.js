import { NextResponse } from "next/server";
import { proxyRequest } from "../../../../lib/proxy.mjs";

export const dynamic = "force-dynamic";
async function handle(request, context) {
  const { path } = await context.params;
  return proxyRequest(request, path, NextResponse);
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
