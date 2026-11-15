"use client";
import dynamic from "next/dynamic";

// Client-only: all state lives in localStorage.
const App = dynamic(() => import("@/components/App"), { ssr: false });

export default function Page() {
  return <App />;
}
