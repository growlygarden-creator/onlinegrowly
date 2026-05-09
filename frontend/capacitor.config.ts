import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.growlygarden.app",
  appName: "Growly Garden",
  webDir: "dist",
  bundledWebRuntime: false,
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: "DARK",
      backgroundColor: "#0f1711",
    },
  },
  server: {
    androidScheme: "https"
  }
};

export default config;
