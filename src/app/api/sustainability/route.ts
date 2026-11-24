import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server-auth";
import { dataService } from "@/services/data-provider";
import { z } from "zod";

const SustainabilityActionSchema = z.object({
  category: z.enum(["commute", "waste", "energy", "home"]),
  actionDescription: z.string().min(1, "Description is required").max(300),
  estimatedCo2SavedKg: z.number().min(0).max(1000),
  estimatedParticulateAvoidedPct: z.number().min(0).max(100),
  recordedAt: z.string().optional(),
});

const UpdateActionSchema = SustainabilityActionSchema.partial().extend({
  id: z.string().min(1, "Action ID is required"),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actions = await dataService.getSustainabilityActions(user.id);
    return NextResponse.json({ actions });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = SustainabilityActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await dataService.addSustainabilityAction(user.id, {
      ...parsed.data,
      recordedAt: parsed.data.recordedAt || new Date().toISOString(),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, action: result.data }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = UpdateActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id, ...updates } = parsed.data;
    const result = await dataService.updateSustainabilityAction(user.id, id, updates);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const actionId = searchParams.get("id");

    if (!actionId) {
      return NextResponse.json({ error: "Action ID is required" }, { status: 400 });
    }

    const result = await dataService.deleteSustainabilityAction(user.id, actionId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
