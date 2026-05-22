export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#111111",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#F9FAFB",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: "6rem",
          fontWeight: "700",
          color: "#C6A15B",
          lineHeight: 1,
          margin: 0,
        }}
      >
        404
      </h1>
      <p style={{ color: "#6B7280", marginTop: "1rem", fontSize: "1.125rem" }}>
        Page not found
      </p>
      <a
        href="/"
        style={{
          marginTop: "2rem",
          color: "#C6A15B",
          textDecoration: "underline",
          fontSize: "0.875rem",
        }}
      >
        Return to homepage
      </a>
    </div>
  );
}
