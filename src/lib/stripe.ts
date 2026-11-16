import "server-only";
import Stripe from "stripe";
import { requireEnv } from "./env";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!client) client = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  return client;
}

export function isStripeTestMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? "sk_test").startsWith("sk_test") ||
    (process.env.STRIPE_SECRET_KEY ?? "").startsWith("rk_test");
}
