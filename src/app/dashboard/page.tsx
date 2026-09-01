"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

export default function DashboardRedirect() {
  const { company } = useStore();
  const router = useRouter();

  useEffect(() => {
    router.replace(company.role === "seller" ? "/sell" : "/buy");
  }, [company.role, router]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 text-[14px] text-muted">
      Открываем кабинет {company.role === "seller" ? "поставщика" : "закупщика"}…
    </div>
  );
}
