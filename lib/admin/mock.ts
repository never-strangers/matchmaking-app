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

export const allFollowers: CommunityMember[] = [
  { name: "Gautum Vasnani", meta: "16 Sept" },
  { name: "Mathew Quek", meta: "16 Sept" },
  { name: "Pei Tin Ng", meta: "16 Sept" },
  { name: "Jack Tsze", meta: "17 Sept" },
  { name: "Viginiswaran Munusamy", meta: "19 Sept" },
  { name: "Mangeet Kaur Khera Mendar Sin", meta: "13 Nov" },
  { name: "Rocky Dejan", meta: "22 Sept" },
  { name: "Hannah R.", meta: "3 Oct" },
  { name: "Elieser Cruz", meta: "5 Oct" },
  { name: "Lawrence Milton", meta: "7 Oct" },
  { name: "Carlos Fagar", meta: "8 Oct" },
  { name: "Sarah Chen", meta: "16 Sept" },
  { name: "Michael Tan", meta: "16 Sept" },
  { name: "Emma Wong", meta: "15 Sept" },
  { name: "James Lee", meta: "15 Sept" },
  { name: "Olivia Kim", meta: "14 Sept" },
  { name: "David Park", meta: "14 Sept" },
  { name: "Sophia Liu", meta: "13 Sept" },
  { name: "Ryan Zhang", meta: "13 Sept" },
  { name: "Mia Johnson", meta: "12 Sept" },
  { name: "Alex Chen", meta: "12 Sept" },
  { name: "Luna Martinez", meta: "11 Sept" },
  { name: "Noah Brown", meta: "11 Sept" },
  { name: "Isabella Garcia", meta: "10 Sept" },
  { name: "Ethan Wilson", meta: "10 Sept" },
  { name: "Ava Anderson", meta: "9 Sept" },
  { name: "Liam Taylor", meta: "9 Sept" },
  { name: "Charlotte Moore", meta: "8 Sept" },
  { name: "Mason Jackson", meta: "8 Sept" },
];

export const pastEvents: PastEvent[] = [
  { date: "12 Sept 2024", title: "Coffee & Conversation" },
  { date: "5 Sept 2024", title: "Running Club Meetup" },
  { date: "28 Aug 2024", title: "Tech Networking Night" },
  { date: "20 Aug 2024", title: "Book Club Discussion" },
  { date: "15 Aug 2024", title: "Art Gallery Opening" },
];

