"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Coffee, Loader2, LockKeyhole } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("admin@cafeodoo.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push(searchParams.get("callbackUrl") || "/pos");
    router.refresh();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background:
          "linear-gradient(135deg, rgba(79,140,255,0.16), transparent 35%), var(--color-bg)",
      }}
    >
      <form
        onSubmit={onSubmit}
        className="card"
        style={{ width: "min(420px, 100%)", boxShadow: "var(--shadow-lg)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, var(--color-primary), var(--color-info))",
            }}
          >
            <Coffee size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22 }}>CafePOS</h1>
            <p style={{ margin: "2px 0 0", color: "var(--color-text-muted)" }}>
              Sign in to continue
            </p>
          </div>
        </div>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />

        <div style={{ height: 14 }} />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />

        {error && (
          <p style={{ margin: "14px 0 0", color: "#fca5a5", fontSize: 13 }}>{error}</p>
        )}

        <button
          className="app-button"
          disabled={loading}
          style={{ width: "100%", marginTop: 20 }}
          type="submit"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <LockKeyhole size={16} />}
          Sign In
        </button>

        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 8,
            background: "var(--color-bg-overlay)",
            color: "var(--color-text-muted)",
            fontSize: 12,
          }}
        >
          Demo users: admin@cafeodoo.com, cashier@cafeodoo.com, kitchen@cafeodoo.com
        </div>
      </form>
    </main>
  );
}
