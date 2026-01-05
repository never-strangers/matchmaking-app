"use client";

import { useState, useMemo } from "react";
import AdminShell from "@/components/admin/AdminShell";
import Card from "@/components/admin/Card";
import { allFollowers } from "@/lib/admin/mock";

export default function FollowersPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFollowers = useMemo(() => {
    if (!searchQuery.trim()) return allFollowers;
    const query = searchQuery.toLowerCase();
    return allFollowers.filter((follower) =>
      follower.name.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <AdminShell>
      <div className="mb-8">
        <h1 className="text-4xl font-light text-gray-dark mb-2">Followers</h1>
      </div>

      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-gray-dark">Followers</h2>
          <button
            type="button"
            className="text-gray-medium hover:text-gray-dark transition-colors"
            aria-label="Download followers"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-white border border-beige-frame rounded-lg text-sm text-gray-dark placeholder-gray-medium focus:outline-none focus:ring-2 focus:ring-red-accent focus:border-transparent"
          />
        </div>

        <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
          {filteredFollowers.length === 0 ? (
            <p className="text-sm text-gray-medium text-center py-8">
              No followers found
            </p>
          ) : (
            <div className="space-y-0">
              {filteredFollowers.map((follower, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center py-3 border-b border-beige-frame last:border-0 hover:bg-beige-light transition-colors group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-sm text-gray-dark truncate">
                      {follower.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-medium font-mono whitespace-nowrap">
                      {follower.meta}
                    </span>
                    <button
                      type="button"
                      className="text-gray-medium hover:text-gray-dark opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="More options"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </AdminShell>
  );
}

