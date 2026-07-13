"use server";
import { cookies as nextCookies } from "next/headers";
import { redirect } from "next/navigation";

export async function resetOnboardingState(orderId: string) {
  if (
    process.env.NODE_ENV === "production" ||
    !/^[A-Za-z0-9_:-]{1,128}$/.test(orderId)
  ) {
    throw new Error("Onboarding action is unavailable");
  }
  const cookies = await nextCookies();
  cookies.set("_medusa_onboarding", "false", { maxAge: -1 });
  const backendUrl = process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000";
  redirect(`${backendUrl}/backend/orders/${orderId}`);
}
