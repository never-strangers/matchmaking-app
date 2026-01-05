import { Kpi } from "@/lib/admin/mock";
import Card from "./Card";

interface KpiStripProps {
  kpis: Kpi[];
}

export default function KpiStrip({ kpis }: KpiStripProps) {
  return (
    <Card className="mb-8">
      <div className="grid grid-cols-3 gap-6">
        {kpis.map((kpi, index) => (
          <div key={index} className="text-center">
            <p className="text-2xl font-semibold text-gray-dark mb-1">
              {kpi.value}
            </p>
            <p className="text-xs text-gray-medium uppercase tracking-wide">
              {kpi.label}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

