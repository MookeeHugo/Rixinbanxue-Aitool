"use client";
import { useSearchParams, usePathname, useRouter } from "next/navigation";

export function useApiParam() {
  const sp = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const useApi = sp.get("useApi") === "1";
  function withApi(path: string) {
    if (!useApi) return path;
    const hasQ = path.includes("?");
    return path + (hasQ ? "&" : "?") + "useApi=1";
  }
  function toggleApi() {
    const params = new URLSearchParams(sp.toString());
    if (useApi) params.delete("useApi"); else params.set("useApi", "1");
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
  }
  return { useApi, withApi, toggleApi };
}

