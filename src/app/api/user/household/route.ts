import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server-auth";
import { dataService } from "@/services/data-provider";
import { z } from "zod";

const HouseholdMemberSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  relation: z.enum(["self", "child", "elderly", "partner", "other"]),
  ageYears: z.number().int().min(0).max(120).optional(),
  vulnerabilityLevel: z.enum(["standard", "high", "critical"]),
  respiratorySensitivity: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});

const UpdateHouseholdSchema = HouseholdMemberSchema.partial().extend({
  id: z.string().min(1, "Member ID is required"),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const members = await dataService.getHouseholdMembers(user.id);
    return NextResponse.json({ members });
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
    const parsed = HouseholdMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await dataService.addHouseholdMember(user.id, parsed.data);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, member: result.data }, { status: 201 });
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
    const parsed = UpdateHouseholdSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id, ...updates } = parsed.data;
    const result = await dataService.updateHouseholdMember(user.id, id, updates);

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
    const action = searchParams.get("action");
    const memberId = searchParams.get("id");

    // Complete data purge workflow for user privacy
    if (action === "purge_all") {
      const purgeResult = await dataService.deleteAllHouseholdMembers(user.id);
      if (!purgeResult.success) {
        return NextResponse.json({ error: purgeResult.error }, { status: 500 });
      }
      return NextResponse.json({ success: true, purged: true, deletedCount: purgeResult.deletedCount });
    }

    if (!memberId) {
      return NextResponse.json({ error: "Member ID is required" }, { status: 400 });
    }

    const result = await dataService.deleteHouseholdMember(user.id, memberId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

