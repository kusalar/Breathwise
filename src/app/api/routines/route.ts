import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server-auth";
import { dataService } from "@/services/data-provider";
import { z } from "zod";

const RoutineItemSchema = z.object({
  id: z.string(),
  timeSlot: z.string(),
  title: z.string(),
  recommendation: z.string(),
  status: z.enum(["recommended", "caution", "avoid"]),
  impactScore: z.enum(["low_emission", "protective", "neutral"]),
});

const SaveRoutineSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  targetDate: z.string().optional(),
  routinePayload: z.array(RoutineItemSchema).min(1, "At least one routine item is required"),
});

const UpdateRoutineSchema = z.object({
  id: z.string().min(1, "Routine ID is required"),
  title: z.string().optional(),
  targetDate: z.string().optional(),
  routinePayload: z.array(RoutineItemSchema).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const routines = await dataService.getSavedRoutines(user.id);
    return NextResponse.json({ routines });
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
    const parsed = SaveRoutineSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await dataService.saveRoutine(
      user.id,
      parsed.data.title,
      parsed.data.routinePayload,
      parsed.data.targetDate
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, routine: result.data }, { status: 201 });
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
    const parsed = UpdateRoutineSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id, ...updates } = parsed.data;
    const result = await dataService.updateRoutine(user.id, id, updates);

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
    const routineId = searchParams.get("id");

    if (!routineId) {
      return NextResponse.json({ error: "Routine ID is required" }, { status: 400 });
    }

    const result = await dataService.deleteRoutine(user.id, routineId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

