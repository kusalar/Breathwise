import { NextRequest, NextResponse } from "next/server";
import { firebaseAuthService } from "@/services/firebase/firebase-auth.service";
import { handleSessionPost, handleSessionDelete } from "@/lib/auth/auth-route-helpers";

export async function POST(request: NextRequest) {
  return handleSessionPost(request, "auth:firebase:session", "FirebaseAuthSessionRoute");
}

export async function GET(request: NextRequest) {
  const user = await firebaseAuthService.getUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthenticated", code: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  return NextResponse.json({ success: true, user }, { status: 200 });
}

export async function DELETE(request: NextRequest) {
  return handleSessionDelete(request);
}
