import { FamilyProfile } from "@/types";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function FamilyProtectionPanel() {
  const familyMembers: FamilyProfile[] = [
    {
      id: "f-1",
      name: "Aarav (Son)",
      relation: "child",
      age: 7,
      healthConditions: ["Mild seasonal asthma"],
      vulnerabilityLevel: "high",
      activeAdvisory: "Shift outdoor recess to indoor games; carry bronchodilator in school bag.",
    },
    {
      id: "f-2",
      name: "Grandmother (Dadi)",
      relation: "elderly",
      age: 68,
      healthConditions: ["Cardiovascular sensitivity"],
      vulnerabilityLevel: "critical",
      activeAdvisory: "Strict indoor protocol today; postpone early morning temple walks.",
    },
    {
      id: "f-3",
      name: "Self",
      relation: "self",
      age: 36,
      healthConditions: ["None reported"],
      vulnerabilityLevel: "standard",
      activeAdvisory: "N95 mask recommended during evening two-wheeler commute.",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-emerald-950 bg-white dark:bg-forest-900/60 p-6 shadow-subtle space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-950">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-rose-600 text-white flex items-center justify-center">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Family Protection Mode
            </h3>
            <p className="text-xs text-muted-foreground">Tailored safeguards for sensitive family members</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800">
          Active Profiles
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {familyMembers.map((member) => (
          <div
            key={member.id}
            className="p-4 rounded-xl border border-slate-100 dark:border-emerald-950 bg-slate-50/60 dark:bg-forest-950/40 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {member.name}
                </span>
                <Badge
                  variant={
                    member.vulnerabilityLevel === "critical"
                      ? "destructive"
                      : member.vulnerabilityLevel === "high"
                      ? "warning"
                      : "default"
                  }
                  className="text-xs px-1.5 py-0"
                >
                  {member.vulnerabilityLevel}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                Age {member.age} • {member.healthConditions.join(", ")}
              </span>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-emerald-950 text-xs text-slate-700 dark:text-slate-300">
              <span className="font-semibold block text-xs text-slate-900 dark:text-slate-200 mb-0.5">
                Current Protocol:
              </span>
              <p className="text-xs leading-relaxed">{member.activeAdvisory}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

