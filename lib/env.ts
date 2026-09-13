import "server-only";

import { isProductionRuntime, parseProductionEnv, type ProductionEnv } from "@/lib/env-schema";

let cachedProductionEnv: ProductionEnv | undefined;

export function assertRuntimeEnvironment(): void {
  if (!isProductionRuntime()) return;
  cachedProductionEnv ??= parseProductionEnv(process.env);
}

export function requireServerEnv(name: keyof ProductionEnv): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function productionEnv(): ProductionEnv {
  cachedProductionEnv ??= parseProductionEnv(process.env);
  return cachedProductionEnv;
}
