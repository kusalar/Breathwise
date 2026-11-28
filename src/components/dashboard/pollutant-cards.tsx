import { PollutantValues } from "@/types";
import { Badge } from "@/components/ui/badge";

interface PollutantCardsProps {
  pollutants: PollutantValues;
}

export function PollutantCards({ pollutants }: PollutantCardsProps) {
  const getCardStatus = (
    val: number | null,
    elevatedThreshold: number,
    elevatedLabel = "Elevated",
    normalLabel = "Good"
  ): { status: string; statusVariant: "default" | "warning" | "outline" } => {
    if (val === null || val === undefined) {
      return { status: "Unavailable", statusVariant: "outline" };
    }
    return val > elevatedThreshold
      ? { status: elevatedLabel, statusVariant: "warning" }
      : { status: normalLabel, statusVariant: "default" };
  };

  const pm25Status = getCardStatus(pollutants.pm25, 60, "Elevated", "Moderate");
  const pm10Status = getCardStatus(pollutants.pm10, 100, "Moderate", "Good");
  const no2Status = getCardStatus(pollutants.no2, 80, "Elevated", "Acceptable");
  const so2Status = getCardStatus(pollutants.so2, 80, "Elevated", "Good");
  const coStatus = getCardStatus(pollutants.co, 2.0, "Elevated", "Good");
  const o3Status = getCardStatus(pollutants.o3, 100, "Elevated", "Good");

  const cards = [
    {
      code: "PM2.5",
      name: "Fine Particulate Matter",
      value: pollutants.pm25,
      unit: "µg/m³",
      limit: "30 µg/m³",
      description: "Penetrates deep into alveolar air sacs and bloodstream.",
      status: pm25Status.status,
      statusVariant: pm25Status.statusVariant,
    },
    {
      code: "PM10",
      name: "Coarse Particulate Matter",
      value: pollutants.pm10,
      unit: "µg/m³",
      limit: "60 µg/m³",
      description: "Dust, construction debris, road resuspension.",
      status: pm10Status.status,
      statusVariant: pm10Status.statusVariant,
    },
    {
      code: "NO₂",
      name: "Nitrogen Dioxide",
      value: pollutants.no2,
      unit: "µg/m³",
      limit: "40 µg/m³",
      description: "Vehicular exhaust and diesel engine combustion.",
      status: no2Status.status,
      statusVariant: no2Status.statusVariant,
    },
    {
      code: "SO₂",
      name: "Sulphur Dioxide",
      value: pollutants.so2,
      unit: "µg/m³",
      limit: "50 µg/m³",
      description: "Industrial processes and thermal power generation.",
      status: so2Status.status,
      statusVariant: so2Status.statusVariant,
    },
    {
      code: "CO",
      name: "Carbon Monoxide",
      value: pollutants.co,
      unit: "mg/m³",
      limit: "2.0 mg/m³",
      description: "Incomplete fuel combustion in heavy traffic.",
      status: coStatus.status,
      statusVariant: coStatus.statusVariant,
    },
    {
      code: "O₃",
      name: "Surface Ozone",
      value: pollutants.o3,
      unit: "µg/m³",
      limit: "100 µg/m³",
      description: "Photochemical reaction between sunlight and VOCs.",
      status: o3Status.status,
      statusVariant: o3Status.statusVariant,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          Pollutant Breakdown & Thresholds
        </h3>
        <span className="text-xs text-muted-foreground">NAAQS National Baseline</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((card) => (
          <div
            key={card.code}
            className="p-3.5 rounded-xl border border-slate-200/90 dark:border-emerald-950 bg-white dark:bg-forest-900/60 shadow-2xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {card.code}
                </span>
                <Badge variant={card.statusVariant} className="text-xs px-1.5 py-0">
                  {card.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate" title={card.name}>
                {card.name}
              </p>
            </div>

            <div className="my-2.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {card.value !== null ? card.value : "N/A"}
              </span>
              {card.value !== null && (
                <span className="text-xs text-muted-foreground ml-1">{card.unit}</span>
              )}
            </div>

            <span className="text-xs text-muted-foreground font-mono">
              Limit: {card.limit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

