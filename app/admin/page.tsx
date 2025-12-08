export default function AdminPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-dark mb-8">
        Admin Dashboard (Preview)
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-beige-frame rounded-lg p-6 shadow-sm">
          <h2 className="text-sm font-medium text-gray-medium mb-2">
            Total Users
          </h2>
          <p className="text-3xl font-bold text-gray-dark">25,000</p>
          <p className="text-xs text-gray-medium mt-1">(WordPress data)</p>
        </div>
        <div className="bg-white border border-beige-frame rounded-lg p-6 shadow-sm">
          <h2 className="text-sm font-medium text-gray-medium mb-2">
            Active Pilots
          </h2>
          <p className="text-lg font-semibold text-gray-dark">
            Singapore, Berlin, Bangkok
          </p>
          <p className="text-xs text-gray-medium mt-1">(static text)</p>
        </div>
        <div className="bg-white border border-beige-frame rounded-lg p-6 shadow-sm">
          <h2 className="text-sm font-medium text-gray-medium mb-2">
            Matching Engine
          </h2>
          <p className="text-lg font-semibold text-gray-medium">
            Not yet connected
          </p>
        </div>
      </div>
    </div>
  );
}


