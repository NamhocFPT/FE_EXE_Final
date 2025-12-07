// apiBase.js
import Constants from "expo-constants";
import { Platform } from "react-native";

let overrideBase = null; // runtime override shared across screens

export function setOverrideBase(url) {
  const v = (url || "").trim();
  overrideBase = v.length ? v : null;
}

export function getOverrideBase() {
  return overrideBase;
}

export function detectDefaultBase() {
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
  } catch {}

  if (Platform.OS === "android") return "http://10.0.2.2:8090";
  // default to user's dev LAN IP (from ipconfig screenshot)
  return "http://192.168.1.12:8090";
}

export function getBase() {
  return overrideBase || detectDefaultBase();
}
