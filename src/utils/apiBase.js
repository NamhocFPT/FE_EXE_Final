// apiBase.js
import Constants from "expo-constants";
import { Platform } from "react-native";

/** =========================
 * CONFIG
 * ========================= */
const USE_PUBLIC_API = true;

const PUBLIC_API_BASE =
  "https://zv3aepa37pxmacoqx4jih77wzm0hscoc.lambda-url.us-east-1.on.aws";

/** =========================
 * RUNTIME OVERRIDE
 * ========================= */
let overrideBase = null;

export function setOverrideBase(url) {
  const v = (url || "").trim();
  overrideBase = v.length ? v : null;
}

export function getOverrideBase() {
  return overrideBase;
}

/** =========================
 * BASE DETECTION
 * ========================= */
export function detectDefaultBase() {
  // 🔥 ƯU TIÊN API PUBLIC (kể cả khi local)
  if (USE_PUBLIC_API) {
    return PUBLIC_API_BASE;
  }

  // ---------- LOCAL LOGIC (giữ nguyên) ----------
  try {
    const dbg = Constants.manifest && Constants.manifest.debuggerHost;
    if (dbg) {
      const host = String(dbg).split(":")[0];
      if (host) return `http://${host}:8090`;
    }

    const host2 =
      (Constants.manifest2 && Constants.manifest2.debuggerHost) ||
      (Constants.expoConfig && Constants.expoConfig.hostUri);

    if (host2) {
      const h = String(host2).split(":")[0];
      if (h) return `http://${h}:8090`;
    }
  } catch { }

  if (Platform.OS === "android") return "http://10.0.2.2:8090";
  return "http://192.168.137.1:8090";
}

/** =========================
 * FINAL BASE
 * ========================= */
export function getBase() {
  return overrideBase || detectDefaultBase();
}
