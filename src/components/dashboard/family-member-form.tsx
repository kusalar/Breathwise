"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { HouseholdMember } from "@/types";

export interface FamilyMemberFormProps {
  editingId: string | null;
  name: string;
  setName: (v: string) => void;
  relation: HouseholdMember["relation"];
  setRelation: (v: HouseholdMember["relation"]) => void;
  ageYears: number;
  setAgeYears: (v: number) => void;
  vulnerabilityLevel: HouseholdMember["vulnerabilityLevel"];
  setVulnerabilityLevel: (v: HouseholdMember["vulnerabilityLevel"]) => void;
  respiratorySensitivity: boolean;
  setRespiratorySensitivity: (v: boolean) => void;
  notes: string;
  setNotes: (v: string) => void;
  submitting: boolean;
  formError: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

/**
 * Reusable form card for adding or editing a household member profile.
 */
export function FamilyMemberForm({
  editingId,
  name,
  setName,
  relation,
  setRelation,
  ageYears,
  setAgeYears,
  vulnerabilityLevel,
  setVulnerabilityLevel,
  respiratorySensitivity,
  setRespiratorySensitivity,
  notes,
  setNotes,
  submitting,
  formError,
  onSubmit,
  onCancel,
}: FamilyMemberFormProps) {
  return (
    <Card className="border-emerald-600/30 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
          {editingId ? "Edit Family Member Profile" : "Register Dependent Profile"}
        </CardTitle>
        <CardDescription className="text-xs">
          Provide medical sensitivities so BreatheWise AI can issue targeted warnings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {formError && (
            <Alert variant="destructive" className="text-xs">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="member-name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Full Name / Identifier
              </label>
              <input
                id="member-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aarav, Grandma, Priya"
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-forest-700 bg-white dark:bg-forest-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="member-relation" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Relationship
              </label>
              <select
                id="member-relation"
                value={relation}
                onChange={(e) => setRelation(e.target.value as HouseholdMember["relation"])}
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-forest-700 bg-white dark:bg-forest-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="self">Self</option>
                <option value="child">Child (Under 18)</option>
                <option value="elderly">Elderly / Senior (65+)</option>
                <option value="partner">Partner / Spouse</option>
                <option value="other">Other Dependent</option>
              </select>
            </div>

            <div>
              <label htmlFor="member-age" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Age (Years)
              </label>
              <input
                id="member-age"
                type="number"
                min={0}
                max={120}
                value={ageYears}
                onChange={(e) => setAgeYears(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-forest-700 bg-white dark:bg-forest-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="member-vulnerability" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Vulnerability Level
              </label>
              <select
                id="member-vulnerability"
                value={vulnerabilityLevel}
                onChange={(e) => setVulnerabilityLevel(e.target.value as HouseholdMember["vulnerabilityLevel"])}
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-forest-700 bg-white dark:bg-forest-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="standard">Standard (Healthy Adult)</option>
                <option value="high">High (Child / Mild Sensitivity)</option>
                <option value="critical">Critical (Severe Asthma / Cardiac / Senior)</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="respiratoryToggle"
                checked={respiratorySensitivity}
                onChange={(e) => setRespiratorySensitivity(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="respiratoryToggle" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Has Respiratory Sensitivity (Asthma, Wheezing, Bronchitis, Allergy)
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="member-notes" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Special Care / Doctor Notes
            </label>
            <input
              id="member-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Uses inhaler when AQI > 150; keep indoors during morning rush"
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-forest-700 bg-white dark:bg-forest-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              {submitting ? "Saving..." : editingId ? "Save Changes" : "Register Member"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
