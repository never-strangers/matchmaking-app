import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface HealthCheck {
  name: string;
  status: "pass" | "fail";
  message?: string;
  latencyMs?: number;
}

export async function GET() {
  const checks: HealthCheck[] = [];
  let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

  // Check 1: Environment variables
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    checks.push({
      name: "env_vars",
      status: "fail",
      message: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    });
    overallStatus = "unhealthy";
  } else {
    checks.push({
      name: "env_vars",
      status: "pass",
      message: `Supabase URL configured: ${url}`,
    });

    // Check 2: Supabase connection (only if env vars exist)
    const supabase = createClient(url, anonKey);
    const start = Date.now();

    try {
      // Use a simple auth check that doesn't require any tables
      const { error } = await supabase.auth.getSession();
      const latencyMs = Date.now() - start;

      if (error) {
        checks.push({
          name: "supabase_connection",
          status: "fail",
          message: error.message,
          latencyMs,
        });
        overallStatus = "degraded";
      } else {
        checks.push({
          name: "supabase_connection",
          status: "pass",
          message: "Connected successfully",
          latencyMs,
        });
      }
    } catch (err) {
      const latencyMs = Date.now() - start;
      checks.push({
        name: "supabase_connection",
        status: "fail",
        message: err instanceof Error ? err.message : "Unknown error",
        latencyMs,
      });
      overallStatus = "unhealthy";
    }

    // Check 3: Database query test (optional - table may not exist)
    const dbStart = Date.now();
    try {
      const { error: dbError } = await supabase
        .from("profiles")
        .select("id")
        .limit(1);
      const latencyMs = Date.now() - dbStart;

      if (dbError) {
        // Table might not exist yet - this is just informational
        checks.push({
          name: "database_profiles_table",
          status: "fail",
          message: dbError.message,
          latencyMs,
        });
        // Don't change overall status - table might not be set up yet
      } else {
        checks.push({
          name: "database_profiles_table",
          status: "pass",
          message: "Profiles table accessible",
          latencyMs,
        });
      }
    } catch (err) {
      const latencyMs = Date.now() - dbStart;
      checks.push({
        name: "database_profiles_table",
        status: "fail",
        message: err instanceof Error ? err.message : "Unknown error",
        latencyMs,
      });
    }
  }

  // Add metadata
  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "dev",
    checks,
    config: {
      demoMode: process.env.NEXT_PUBLIC_DEMO_MODE === "true",
      chatEnabled: process.env.NEXT_PUBLIC_ENABLE_CHAT !== "false",
      chatMode: process.env.NEXT_PUBLIC_CHAT_MODE || "mock",
    },
  };

  const statusCode = overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503;

  return NextResponse.json(response, { status: statusCode });
}
