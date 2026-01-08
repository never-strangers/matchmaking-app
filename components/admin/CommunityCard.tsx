import { CommunityMember } from "@/lib/admin/mock";
import Card from "./Card";
import Link from "next/link";

interface CommunityCardProps {
  members: CommunityMember[];
}

export default function CommunityCard({ members }: CommunityCardProps) {
  return (
    <Card className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-medium text-gray-dark uppercase tracking-wide">
          Community
        </h2>
        <Link
          href="/admin/followers"
          data-testid="admin-community-all-followers-link"
          className="text-xs text-gray-medium hover:text-gray-dark transition-colors"
        >
          ALL FOLLOWERS →
        </Link>
      </div>
      <div className="space-y-3" data-testid="admin-users-table">
        {members.map((member, index) => (
          <div
            key={index}
            data-testid={`admin-community-member-${index}`}
            className="flex justify-between items-center py-2 border-b border-beige-frame last:border-0"
          >
            <span className="text-sm text-gray-dark">{member.name}</span>
            <span className="text-xs text-gray-medium">{member.meta}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

