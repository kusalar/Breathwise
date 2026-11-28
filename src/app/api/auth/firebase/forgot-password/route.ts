import { NextRequest } from "next/server";
import { handleForgotPasswordPost } from "@/lib/auth/auth-route-helpers";

export async function POST(request: NextRequest) {
  return handleForgotPasswordPost(request, "auth:firebase:forgot-password", "FirebaseAuthForgotPasswordRoute");
}
