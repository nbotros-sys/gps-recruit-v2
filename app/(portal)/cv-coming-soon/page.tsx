"use client"

import Link from "next/link"

// Branded "Coming Soon" page for the AI CV Builder / CV review experience.
// Candidate-facing pages (/cv-builder and /send-cv) redirect here while the
// feature is being developed. On-brand with GPS identity: deep petrol/teal,
// soft mint accents, hexagon motif echoing the logo.

export default function CvComingSoonPage() {
  return (
    <div
      style={{
        minHeight: "calc(100vh - 72px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        background:
          "radial-gradient(120% 120% at 50% -10%, #0f2e33 0%, #0a1f24 55%, #071619 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient hexagon glow motifs (brand shape) */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "-120px",
          right: "-80px",
          width: "420px",
          height: "420px",
          background:
            "radial-gradient(circle, rgba(2,128,144,0.28) 0%, rgba(2,128,144,0) 70%)",
          filter: "blur(10px)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: "-140px",
          left: "-100px",
          width: "460px",
          height: "460px",
          background:
            "radial-gradient(circle, rgba(168,213,209,0.18) 0%, rgba(168,213,209,0) 70%)",
          filter: "blur(10px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          maxWidth: "620px",
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* Logo mark */}
        <div style={{ marginBottom: "34px" }}>
          <img
            src="/gps-logo.png"
            alt="GPS"
            style={{ width: "72px", height: "72px", objectFit: "contain", margin: "0 auto" }}
          />
        </div>

        {/* Eyebrow pill */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "7px 16px",
            borderRadius: "999px",
            background: "rgba(168,213,209,0.12)",
            border: "1px solid rgba(168,213,209,0.25)",
            color: "#A8D5D1",
            fontSize: "12.5px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "28px",
          }}
        >
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: "#028090",
              boxShadow: "0 0 0 4px rgba(2,128,144,0.25)",
            }}
          />
          In development
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: "clamp(30px, 5vw, 46px)",
            lineHeight: 1.1,
            fontWeight: 800,
            color: "#ffffff",
            margin: "0 0 20px",
            letterSpacing: "-0.02em",
          }}
        >
          Your AI CV Builder is
          <br />
          <span style={{ color: "#A8D5D1" }}>almost here</span>
        </h1>

        {/* Subcopy */}
        <p
          style={{
            fontSize: "clamp(15px, 2.2vw, 17px)",
            lineHeight: 1.65,
            color: "rgba(255,255,255,0.72)",
            maxWidth: "480px",
            margin: "0 auto 38px",
          }}
        >
          We&rsquo;re putting the finishing touches on a smarter way to build and
          review your CV &mdash; polished, professional, and tailored to help you
          stand out to employers across the region. It&rsquo;s coming very soon.
        </p>

        {/* CTA — browse jobs */}
        <div
          style={{
            display: "flex",
            gap: "14px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/jobs"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "9px",
              background: "#028090",
              color: "#ffffff",
              padding: "14px 30px",
              borderRadius: "12px",
              fontWeight: 700,
              fontSize: "15px",
              textDecoration: "none",
              boxShadow: "0 10px 30px rgba(2,128,144,0.35)",
              transition: "transform .2s, box-shadow .2s",
            }}
          >
            Browse open roles
            <span aria-hidden style={{ fontSize: "17px", lineHeight: 1 }}>
              &rarr;
            </span>
          </Link>
        </div>

        {/* Footer tagline */}
        <div
          style={{
            marginTop: "56px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            color: "rgba(168,213,209,0.55)",
            fontSize: "12.5px",
            letterSpacing: "0.05em",
          }}
        >
          <span
            style={{
              height: "1px",
              width: "34px",
              background: "rgba(168,213,209,0.3)",
            }}
          />
          Your Trusted HR Partner
          <span
            style={{
              height: "1px",
              width: "34px",
              background: "rgba(168,213,209,0.3)",
            }}
          />
        </div>
      </div>
    </div>
  )
}
