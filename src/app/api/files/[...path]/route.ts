import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Must be logged in
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path } = await params;
  const filePath = path.join("/");

  const { data, error } = await supabaseAdmin.storage
    .from("admission")
    .download(filePath);

  if (error || !data) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const contentTypeMap: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };

  return new NextResponse(data, {
    headers: {
      "Content-Type": contentTypeMap[ext] || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
