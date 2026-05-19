"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser, getToken } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    const u = getStoredUser();
    router.replace(u?.role === "admin" ? "/admin" : "/dashboard");
  }, [router]);
  return null;
}
