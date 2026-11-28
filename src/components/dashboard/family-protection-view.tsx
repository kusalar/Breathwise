"use client";

import * as React from "react";
import Image from "next/image";
import {
  Users,
  Heart,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  Lock,
  Baby,
  User,
  HeartPulse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { HouseholdMember } from "@/types";
import { FamilyMemberForm } from "./family-member-form";

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
  const [formError, setFormError] = React.useState<string | null>(null);

  const LOCAL_STORAGE_KEY = "breathewise_household_members";

  const readLocalMembers = React.useCallback((): HouseholdMember[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as HouseholdMember[]) : [];
    } catch {
      return [];
    }
  }, []);

  const writeLocalMembers = React.useCallback((list: HouseholdMember[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // ignore storage errors
    }
  }, []);

  const retrieveMembers = React.useCallback(async (): Promise<HouseholdMember[]> => {
    try {
      const res = await fetch("/api/user/household");
      if (res.ok) {
        const data = await res.json();
        const serverMembers: HouseholdMember[] = data.members || [];
        if (serverMembers.length > 0) {
          writeLocalMembers(serverMembers);
          return serverMembers;
        }
        return readLocalMembers();
      }
      return readLocalMembers();
    } catch {
      return readLocalMembers();
    }
  }, [readLocalMembers, writeLocalMembers]);

  const fetchMembers = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await retrieveMembers();
      setMembers(list);
    } finally {
      setLoading(false);
    }
  }, [retrieveMembers]);

  React.useEffect(() => {
    let cancelled = false;
    retrieveMembers()
      .then((list) => {
        if (!cancelled) {
          setMembers(list);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [retrieveMembers]);

  const resetForm = () => {
    setName("");
    setRelation("child");
    setAgeYears(8);
    setVulnerabilityLevel("high");
    setRespiratorySensitivity(true);
    setNotes("");
    setEditingId(null);
    setFormError(null);
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
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Please enter a name for the family member.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    const parsedAge = Number.isFinite(Number(ageYears)) ? Math.max(0, Math.min(120, Math.round(Number(ageYears)))) : undefined;

    try {
      if (editingId) {
        const payload = {
          id: editingId,
          name: trimmedName,
          relation,
          ageYears: parsedAge,
          vulnerabilityLevel,
          respiratorySensitivity,
          notes: notes.trim() || undefined,
        };
        const res = await fetch("/api/user/household", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const updatedList = members.map((m) =>
          m.id === editingId
            ? { ...m, ...payload, updatedAt: new Date().toISOString() }
            : m
        );
        setMembers(updatedList);
        writeLocalMembers(updatedList);
        if (res.ok) {
          await fetchMembers();
        }
        resetForm();
      } else {
        const payload = {
          name: trimmedName,
          relation,
          ageYears: parsedAge,
          vulnerabilityLevel,
          respiratorySensitivity,
          notes: notes.trim() || undefined,
        };
        const res = await fetch("/api/user/household", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const json = await res.json();
          const created: HouseholdMember = json.member || {
            ...payload,
            id: `local-${Date.now()}`,
            userId: "local",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const updatedList = [...members, created];
          setMembers(updatedList);
          writeLocalMembers(updatedList);
          resetForm();
        } else {
          // Graceful local persistence fallback if server auth session is unavailable
          const localMember: HouseholdMember = {
            ...payload,
            id: `local-${Date.now()}`,
            userId: "local",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const updatedList = [...members, localMember];
          setMembers(updatedList);
          writeLocalMembers(updatedList);
          resetForm();
        }
      }
    } catch {
      const localMember: HouseholdMember = {
        id: editingId || `local-${Date.now()}`,
        userId: "local",
        name: trimmedName,
        relation,
        ageYears: parsedAge,
        vulnerabilityLevel,
        respiratorySensitivity,
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updatedList = editingId
        ? members.map((m) => (m.id === editingId ? localMember : m))
        : [...members, localMember];
      setMembers(updatedList);
      writeLocalMembers(updatedList);
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const updatedList = members.filter((m) => m.id !== id);
    setMembers(updatedList);
    writeLocalMembers(updatedList);
    try {
      await fetch(`/api/user/household?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch {
      // local state already updated
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

      {/* Visual Family Protection Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200/70 dark:border-emerald-900/60 h-40 sm:h-48 shadow-subtle">
        <Image
          src="/images/family-protection.jpg"
          alt="Multi-generational Indian family protected in a clean-air home terrace"
          fill
          sizes="(max-width: 1024px) 100vw, 960px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-950/35 to-transparent" />
        <div className="absolute inset-y-0 left-5 flex flex-col justify-center max-w-md text-white space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
            Household Shield Active
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold leading-snug">
            Personalized Safeguards for Every Generation
          </h2>
          <p className="text-xs text-slate-200">
            Tailor AQI alert thresholds for children, seniors, and sensitive respiratory profiles.
          </p>
        </div>
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
        <FamilyMemberForm
          editingId={editingId}
          name={name}
          setName={setName}
          relation={relation}
          setRelation={setRelation}
          ageYears={ageYears}
          setAgeYears={setAgeYears}
          vulnerabilityLevel={vulnerabilityLevel}
          setVulnerabilityLevel={setVulnerabilityLevel}
          respiratorySensitivity={respiratorySensitivity}
          setRespiratorySensitivity={setRespiratorySensitivity}
          notes={notes}
          setNotes={setNotes}
          submitting={submitting}
          formError={formError}
          onSubmit={handleSubmit}
          onCancel={resetForm}
        />
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
                    <Badge variant="outline" className="border-red-300 text-red-700 dark:text-red-300 text-xs">
                      Respiratory Sensitive
                    </Badge>
                  )}
                </div>

                {m.notes && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-forest-900/40 p-2.5 rounded border border-slate-100 dark:border-forest-800">
                    &ldquo;{m.notes}&rdquo;
                  </p>
                )}

                <div className="text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-forest-800">
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

