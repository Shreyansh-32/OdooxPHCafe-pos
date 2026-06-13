"use client";

import { useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { staffLoginSchema, type StaffLoginInput } from "@/lib/validations/auth";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StaffLoginInput>({
    resolver: zodResolver(staffLoginSchema),
  });

  const onSubmit = async (data: StaffLoginInput) => {
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
      return;
    }

    const session = await getSession();
    const destination = session?.user?.role === "KITCHEN" ? "/kds" : "/pos";

    router.push(destination);
    router.refresh();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f0f13 0%, #1a1a24 50%, #0f0f13 100%)",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background accent */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, rgba(200, 121, 65, 0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          animation: "fadeIn 0.4s ease both",
        }}
        className="animate-fade-in"
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #c87941, #a06030)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              margin: "0 auto 16px",
              boxShadow: "0 0 40px rgba(200, 121, 65, 0.3)",
            }}
          >
            ☕
          </div>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: "700",
              margin: "0 0 8px",
              background: "linear-gradient(135deg, #f0eee8, #c87941)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Café Odoo POS
          </h1>
          <p style={{ color: "#8a8a9a", fontSize: "14px", margin: 0 }}>
            Staff Portal — Sign in to continue
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: "32px" }}>
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Email */}
            <div>
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="staff@cafeodoo.com"
                {...register("email")}
              />
              {errors.email && (
                <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register("password")}
              />
              {errors.password && (
                <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  color: "#f87171",
                  fontSize: "14px",
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              style={{
                background: loading
                  ? "#5a3a20"
                  : "linear-gradient(135deg, #c87941, #a06030)",
                color: "#fff",
                padding: "12px",
                borderRadius: "10px",
                fontWeight: "600",
                fontSize: "15px",
                justifyContent: "center",
                boxShadow: loading ? "none" : "0 4px 16px rgba(200, 121, 65, 0.3)",
                transition: "all 0.2s ease",
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        {/* Demo credentials */}
        <div
          style={{
            marginTop: "24px",
            padding: "16px",
            background: "rgba(26, 26, 36, 0.6)",
            borderRadius: "12px",
            border: "1px solid rgba(42, 42, 58, 0.5)",
          }}
        >
          <p style={{ fontSize: "12px", color: "#8a8a9a", margin: "0 0 8px", fontWeight: "600" }}>
            Demo Credentials
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {[
              { role: "Admin", email: "admin@cafeodoo.com", pass: "admin123" },
              { role: "Cashier", email: "cashier@cafeodoo.com", pass: "cashier123" },
              { role: "Kitchen", email: "kitchen@cafeodoo.com", pass: "kitchen123" },
            ].map((cred) => (
              <div
                key={cred.role}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: "#5a5a6a",
                }}
              >
                <span style={{ color: "#c87941", fontWeight: "500" }}>{cred.role}:</span>
                <span>{cred.email} / {cred.pass}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
