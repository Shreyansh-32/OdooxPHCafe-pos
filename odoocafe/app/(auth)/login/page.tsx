"use client";

import { useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { staffLoginSchema, type StaffLoginInput } from "@/lib/validations/auth";
import Image from "next/image";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<StaffLoginInput>({
    resolver: zodResolver(staffLoginSchema),
  });

  const fillCredentials = (email: string, pass: string) => {
    setValue("email", email, { shouldValidate: true });
    setValue("password", pass, { shouldValidate: true });
  };

  const onSubmit = async (data: StaffLoginInput) => {
    setLoading(true);

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      toast.error("Invalid email or password. Please try again.");
      return;
    }

    toast.success("Signed in successfully!");

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
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Image src="/CafePOS.png" alt="CafePOS Logo" width={90} height={90} style={{ objectFit: "contain" }} />
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
          <p style={{ fontSize: "12px", color: "#8a8a9a", margin: "0 0 12px", fontWeight: "600", textAlign: "center" }}>
            Quick Demo Login
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            {[
              { role: "Admin", email: "admin@cafeodoo.com", pass: "admin123" },
              { role: "Cashier", email: "cashier@cafeodoo.com", pass: "cashier123" },
              { role: "Kitchen", email: "kitchen@cafeodoo.com", pass: "kitchen123" },
            ].map((cred) => (
              <button
                key={cred.role}
                type="button"
                id={`demo-btn-${cred.role.toLowerCase()}`}
                onClick={() => fillCredentials(cred.email, cred.pass)}
                style={{
                  flex: 1,
                  padding: "8px 4px",
                  borderRadius: "8px",
                  border: "1px solid rgba(200, 121, 65, 0.2)",
                  background: "rgba(200, 121, 65, 0.08)",
                  color: "#c87941",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textAlign: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(200, 121, 65, 0.15)";
                  e.currentTarget.style.borderColor = "rgba(200, 121, 65, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(200, 121, 65, 0.08)";
                  e.currentTarget.style.borderColor = "rgba(200, 121, 65, 0.2)";
                }}
              >
                {cred.role}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
