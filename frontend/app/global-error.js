"use client";
export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui",
          background: "#f8faf8",
          color: "#16251d",
          padding: 24,
          margin: 0,
        }}
      >
        <main style={{ maxWidth: 560, margin: "10vh auto" }}>
          <h1>Community Help Hub could not load</h1>
          <p>
            Please retry. If the problem continues, contact the project
            maintainer.
          </p>
          <button
            onClick={reset}
            style={{
              minHeight: 44,
              padding: "10px 20px",
              background: "#256647",
              color: "white",
              border: 0,
              borderRadius: 8,
            }}
          >
            Try loading again
          </button>
          <p>
            <a href="/">Return to the home page</a> ·{" "}
            <a href="mailto:parmarshivam247@gmail.com">Email support</a>
          </p>
        </main>
      </body>
    </html>
  );
}
