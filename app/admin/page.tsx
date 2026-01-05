import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import KpiStrip from "@/components/admin/KpiStrip";
import CommunityCard from "@/components/admin/CommunityCard";
import PastEventsList from "@/components/admin/PastEventsList";
import { kpis, community, pastEvents } from "@/lib/admin/mock";

export default function AdminPage() {
  return (
    <AdminShell>
      <h1 className="text-4xl font-light text-gray-dark mb-12">
        Your Events
      </h1>
      <KpiStrip kpis={kpis} />
      <CommunityCard members={community} />
      <PastEventsList events={pastEvents} />
    </AdminShell>
  );
}
