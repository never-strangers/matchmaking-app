export interface Kpi {
  label: string;
  value: string;
}

export interface CommunityMember {
  name: string;
  meta: string;
}

export interface PastEvent {
  date: string;
  title: string;
}

export const kpis: Kpi[] = [
  { label: "Total Events", value: "24" },
  { label: "Active Users", value: "1,234" },
  { label: "This Month", value: "8" },
];

export const community: CommunityMember[] = [
  { name: "Sarah Chen", meta: "16 Sept" },
  { name: "Michael Tan", meta: "16 Sent" },
  { name: "Emma Wong", meta: "15 Sept" },
  { name: "James Lee", meta: "15 Sent" },
  { name: "Olivia Kim", meta: "14 Sept" },
];

export const pastEvents: PastEvent[] = [
  { date: "12 Sept 2024", title: "Coffee & Conversation" },
  { date: "5 Sept 2024", title: "Running Club Meetup" },
  { date: "28 Aug 2024", title: "Tech Networking Night" },
  { date: "20 Aug 2024", title: "Book Club Discussion" },
  { date: "15 Aug 2024", title: "Art Gallery Opening" },
];

