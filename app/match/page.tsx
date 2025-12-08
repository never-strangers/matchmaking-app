const mockMatches = [
  {
    name: "Anna",
    age: 28,
    city: "Singapore",
    interests: ["Running", "Books", "Coffee"],
  },
  {
    name: "James",
    age: 31,
    city: "Hong Kong",
    interests: ["Tech", "Fitness", "Cinema"],
  },
  {
    name: "Sarah",
    age: 26,
    city: "Bangkok",
    interests: ["Coffee", "Books", "Running"],
  },
  {
    name: "Michael",
    age: 29,
    city: "Singapore",
    interests: ["Tech", "Cinema", "Fitness"],
  },
  {
    name: "Emma",
    age: 27,
    city: "Tokyo",
    interests: ["Books", "Coffee", "Running"],
  },
];

export default function MatchPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-dark mb-8">
        Your Matches (Preview)
      </h1>
      <div className="space-y-4">
        {mockMatches.map((match, index) => (
          <div
            key={index}
            className="border border-beige-frame rounded-xl shadow-sm p-6 bg-white"
          >
            <h2 className="text-xl font-semibold text-gray-dark mb-2">
              {match.name}, {match.age}
            </h2>
            <p className="text-gray-medium mb-3">{match.city}</p>
            <p className="text-sm text-gray-dark">
              <span className="font-medium">Interests:</span>{" "}
              {match.interests.join(", ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}


