import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep these server-only Node.js packages out of the client bundle
  serverExternalPackages: [
    "pg",
    "pg-native",
    "ioredis",
    "@prisma/adapter-pg",
    "@prisma/client",
    "prisma",
    "bcryptjs",
    "jose",
    "nodemailer",
    "resend",
  ],

  // Allow images from any HTTPS source (for product images)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
