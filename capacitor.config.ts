import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.lunadrift.app",
  appName: "Luna Drift",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
  plugins: {
    BackgroundMode: {
      title: "Luna Drift",
      subtitle: "Drifting…",
      text: "Your soundscape is playing",
      silent: true,
    },
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
