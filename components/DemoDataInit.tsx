"use client";

import { useEffect } from "react";
import { initializeDemoData } from "@/lib/demo/initDemoData";

/**
 * Component that initializes demo data on app load
 * Runs once when the app starts
 */
export default function DemoDataInit() {
  useEffect(() => {
    // Initialize demo data on mount
    initializeDemoData();
  }, []);

  return null; // This component doesn't render anything
}
