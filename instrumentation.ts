export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { assertRuntimeEnvironment } = await import("@/lib/env");
  assertRuntimeEnvironment();
}
