import { NextRequest } from "next/server";
import { handleRegisterPost } from "@/lib/auth/auth-route-helpers";

export async function POST(request: NextRequest) {
  return handleRegisterPost(request, "auth:register", "AuthRegisterRoute");
}
