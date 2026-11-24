"use client";

import * as React from "react";
import {
  Users,
  Shield,
  Heart,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  Lock,
  CheckCircle2,
  Baby,
  User,
  HeartPulse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { HouseholdMember } from "@/types";

export function FamilyProtectionView() {
  const [members, setMembers] = React.useState<HouseholdMember[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // Form State
  const [name, setName] = React.useState("");
  const [relation, setRelation] = React.useState<HouseholdMember["relation"]>("child");
  const [ageYears, setAgeYears] = React.useState<number>(8);
  const [vulnerabilityLevel, setVulnerabilityLevel] = React.useState<HouseholdMember["vulnerabilityLevel"]>("high");
  const [respiratorySensitivity, setRespiratorySensitivity] = React.useState(true);
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const fetchMembers = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user/household");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const resetForm = () => {
    setName("");
    setRelation("child");
    setAgeYears(8);
    setVulnerabilityLevel("high");
    setRespiratorySensitivity(true);
    setNotes("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleEditClick = (m: HouseholdMember) => {
    setName(m.name);
    setRelation(m.relation);
    setAgeYears(m.ageYears || 10);
    setVulnerabilityLevel(m.vulnerabilityLevel);
    setRespiratorySensitivity(m.respiratorySensitivity);
    setNotes(m.notes || "");
    setEditingId(m.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        // PUT update
        const res = await fetch("/api/user/household", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            name,
            relation,
            ageYears: Number(ageYears),
            vulnerabilityLevel,
            respiratorySensitivity,
            notes,
          }),
        });
        if (res.ok) {
          await fetchMembers();
          resetForm();
        }
      } else {
        // POST create
        const res = await fetch("/api/user/household", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            relation,
            ageYears: Number(ageYears),
            vulnerabilityLevel,
            respiratorySensitivity,
            notes,
          }),
        });
        if (res.ok) {
          await fetchMembers();
          resetForm();
        }
      }
    } catch {
      // error
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this family profile?")) return;
    try {
      const res = await fetch(`/api/user/household?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== id));
      }
    } catch {
      // error
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-forest-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Family Protection & Vulnerability Profiles
            </h1>
            <Badge variant="outline" className="text-xs border-emerald-600/30 text-emerald-800 dark:text-emerald-300">
              RLS Secured
            </Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Tailor environmental alerts and exposure guidance to infants, children, seniors, and asthmatic dependents.
          </p>
        </div>

        <Button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          {showForm ? "Cancel" : "Add Family Member"}
        </Button>
      </div>

      {/* Privacy Guarantee Banner */}
      <Alert className="border-emerald-200 dark:border-emerald-950/70 bg-emerald-50/50 dark:bg-emerald-950/20">
        <Lock className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
        <AlertDescription className="text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed">
          <strong>Privacy Guarantee:</strong> Dependent health conditions and age profiles are encrypted and protected under strict PostgreSQL Row Level Security (<code>auth.uid() = user_id</code>). We will never sell or share medical indicators with third-party advertising brokers.
        </AlertDescription>
      </Alert>

      {/* Inline Form */}
      {showForm && (
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Full Name / Identifier
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Aarav, Grandma, Priya"
                    className="mt-1 w-full rounded-md border border-slate-300 dark:border-forest-700 bg-white dark:bg-forest-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Relationship
                  </label>
                  <select
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
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Age (Years)
                  </label>
                  <input
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
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Vulnerability Level
                  </label>
                  <select
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
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Special Care / Doctor Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Uses inhaler when AQI > 150; keep indoors during morning rush"
                  className="mt-1 w-full rounded-md border border-slate-300 dark:border-forest-700 bg-white dark:bg-forest-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>
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
      )}

      {/* Household Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-sm text-slate-500">
            Loading family profiles...
          </div>
        ) : members.length === 0 ? (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 dark:border-forest-800 rounded-xl p-8">
            <Users className="h-10 w-10 mx-auto text-slate-400 mb-2" />
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              No family members registered yet
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Add children, seniors, or family members with asthma to unlock tailored exposure warnings during winter smog inversions.
            </p>
            <Button
              onClick={() => setShowForm(true)}
              size="sm"
              className="mt-4 bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              Add First Member
            </Button>
          </div>
        ) : (
          members.map((m) => (
            <Card key={m.id} className="border-slate-200 dark:border-forest-800 shadow-sm relative overflow-hidden">
              <div
                className={`h-1.5 w-full ${
                  m.vulnerabilityLevel === "critical"
                    ? "bg-red-500"
                    : m.vulnerabilityLevel === "high"
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
              />
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      {m.relation === "child" ? (
                        <Baby className="h-5 w-5" />
                      ) : m.relation === "elderly" ? (
                        <HeartPulse className="h-5 w-5" />
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">
                        {m.name}
                      </h3>
                      <div className="text-xs text-slate-500 capitalize">
                        {m.relation} {m.ageYears !== undefined ? `• ${m.ageYears} yrs` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      onClick={() => handleEditClick(m)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-600"
                      title="Edit Profile"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(m.id)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                      title="Delete Profile"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Badge
                    className={
                      m.vulnerabilityLevel === "critical"
                        ? "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border-none"
                        : m.vulnerabilityLevel === "high"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-none"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-none"
                    }
                  >
                    {m.vulnerabilityLevel.toUpperCase()} RISK
                  </Badge>

                  {m.respiratorySensitivity && (
                    <Badge variant="outline" className="border-red-300 text-red-700 dark:text-red-300 text-[10px]">
                      Respiratory Sensitive
                    </Badge>
                  )}
                </div>

                {m.notes && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-forest-900/40 p-2.5 rounded border border-slate-100 dark:border-forest-800">
                    &ldquo;{m.notes}&rdquo;
                  </p>
                )}

                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-forest-800">
                  {m.vulnerabilityLevel === "critical"
                    ? "Alert threshold: AQI > 150 (Immediate indoor air filtration)"
                    : m.vulnerabilityLevel === "high"
                    ? "Alert threshold: AQI > 200 (Mask required outdoors)"
                    : "Standard public health advisories apply"}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Vulnerability Guidelines */}
      <Card className="border-slate-200 dark:border-forest-800 shadow-sm mt-8">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500" />
            Physiological Smog Impact Matrix
          </CardTitle>
          <CardDescription className="text-xs">
            Why vulnerable family members require distinct protective thresholds during pollution episodes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-forest-800 bg-slate-50/50 dark:bg-forest-900/30 space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Baby className="h-4 w-4 text-amber-600" />
                Infants & Children
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Children breathe 50% more air per pound of body weight than adults, and their lungs are actively developing. PM2.5 can permanently reduce lung capacity.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-forest-800 bg-slate-50/50 dark:bg-forest-900/30 space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <HeartPulse className="h-4 w-4 text-red-600" />
                Seniors & Heart Patients
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Fine particulates cross into the alveolar-capillary barrier into the bloodstream, triggering systemic arterial inflammation, arrhythmia, and elevated stroke risk.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-forest-800 bg-slate-50/50 dark:bg-forest-900/30 space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                Asthma & Allergies
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Ozone and nitrogen oxides cause hyper-reactive bronchial constriction. Always maintain access to prescribed bronchodilators before stepping into peak traffic.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

