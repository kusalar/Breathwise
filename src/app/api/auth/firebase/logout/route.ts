import { NextRequest } from "next/server";
import { handleLogoutPost } from "@/lib/auth/auth-route-helpers";

export async function POST(request: NextRequest) {
  return handleLogoutPost(request, "auth:firebase:logout");
}
