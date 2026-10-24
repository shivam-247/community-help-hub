"use client";
import { Text as UIMessage } from "../lib/i18n";

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
          <h1><UIMessage>Community Help Hub could not load</UIMessage></h1>
          <p><UIMessage>
            Please retry. If the problem continues, contact the project
            maintainer.
          </UIMessage></p>
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
          ><UIMessage>
            Try loading again
          </UIMessage></button>
          <p>
            <a href="/"><UIMessage>Return to the home page</UIMessage></a> ·{" "}
            <a href="mailto:parmarshivam247@gmail.com"><UIMessage>Email support</UIMessage></a>
          </p>
        </main>
      </body>
    </html>
  );
}
