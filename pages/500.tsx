export default function Custom500() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-[var(--text)] mb-4">
          Something went wrong
        </h1>
        <p className="text-[var(--text-muted)] mb-6">
          An unexpected error occurred. Please refresh the page, or try again in
          a moment.
        </p>
      </div>
    </div>
  );
}

