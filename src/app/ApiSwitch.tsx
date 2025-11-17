"use client";
import { useApiParam } from "@/lib/client/useApiParam";

export default function ApiSwitch() {
  const { useApi, toggleApi } = useApiParam();
  return (
    <button onClick={toggleApi} className="rx-badge" title="切换是否使用后端API">
      API 模式：{useApi ? "开" : "关"}
    </button>
  );
}

