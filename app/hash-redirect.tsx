"use client";

import { useEffect } from "react";

// Links shared before the website existed looked like "/#/trip/abc12345". They now live under /app.
export default function HashRedirect() {
  useEffect(() => {
    const go = () => {
      if (window.location.hash.startsWith("#/")) window.location.replace(`/app${window.location.hash}`);
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, []);
  return null;
}
