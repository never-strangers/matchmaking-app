export default function Custom500() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" }}>
      <div style={{ maxWidth: "400px", width: "100%", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.875rem", fontWeight: 700, marginBottom: "1rem" }}>
          Something went wrong
        </h1>
        <p style={{ color: "#6b6b60", marginBottom: "1.5rem" }}>
          An unexpected error occurred. Please refresh the page or try again in a moment.
        </p>
      </div>
    </div>
  );
}
