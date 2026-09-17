export type AppMode = "demo" | "market";

export function appMode(): AppMode {
  return process.env.NEXT_PUBLIC_ATRIUM_APP === "demo" ? "demo" : "market";
}

export function isDemoApp(): boolean {
  return appMode() === "demo";
}
