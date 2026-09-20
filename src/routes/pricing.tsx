import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Sparkles, Zap, ShieldCheck, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing & Plans — MAH MCA CET 2027" },
      {
        name: "description",
        content:
          "Unlock the ultimate exam simulation toolkit, full-length weightage-based mock tests, and AI performance reports with PrepIQ Premium.",
      },
      { property: "og:title", content: "Pricing & Plans — MAH MCA CET 2027" },
      {
        property: "og:description",
        content: "Choose your plan and crack MAH MCA CET with high-yield practice sets and mocks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

interface PricingTier {
  name: string;
  priceKey: string;
  priceValue: number; // in Rupees
  displayPrice: string;
  subtitle: string;
  description: string;
  badge?: string;
  highlight?: boolean;
  features: string[];
  ctaText: string;
  ctaVariant: "outline" | "royal" | "soft";
}

const PRICING_TIERS: PricingTier[] = [
  {
    name: "Basic Free",
    priceKey: "free",
    priceValue: 0,
    displayPrice: "₹0",
    subtitle: "Free forever",
    description: "Perfect for exploring concepts and getting a feel for the platform.",
    features: [
      "2 Full Mock Tests",
      "4 Subject Mock Tests",
      "Basic Analytics",
      "Community Read-Only",
    ],
    ctaText: "Included Free",
    ctaVariant: "outline",
  },
  {
    name: "3 Months",
    priceKey: "3_months",
    priceValue: 199,
    displayPrice: "₹199",
    subtitle: "₹66/month · one-time payment",
    description: "Ideal for short-term intense preparation just before exams.",
    features: [
      "15 Full Mocks",
      "10 Mocks / Subject",
      "Advanced Analytics",
      "Standard Email Support",
    ],
    ctaText: "Subscribe Now",
    ctaVariant: "soft",
  },
  {
    name: "6 Months",
    priceKey: "6_months",
    priceValue: 349,
    displayPrice: "₹349",
    subtitle: "₹58/month · one-time payment",
    description: "Solid mid-term focus to master multiple subjects and test environments.",
    badge: "Save 12%",
    features: [
      "25 Full Mocks",
      "15 Mocks / Subject",
      "AI Performance Reports",
      "Priority Support",
    ],
    ctaText: "Subscribe Now",
    ctaVariant: "soft",
  },
  {
    name: "1 Year Premium",
    priceKey: "1_year",
    priceValue: 599,
    displayPrice: "₹599",
    subtitle: "₹50/month · best value · one-time payment",
    description: "Complete and unrestricted access for a full year of rigorous cracking.",
    badge: "MOST POPULAR",
    highlight: true,
    features: [
      "UNLIMITED Full Mocks (50+)",
      "UNLIMITED Subject Mocks (200+)",
      "Early Access to New Updates",
      "1-on-1 Admin Chat Support",
    ],
    ctaText: "Get Premium Access",
    ctaVariant: "royal",
  },
];

function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  // Helper function to load Razorpay Checkout script dynamically
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  async function handleAction(tier: PricingTier) {
    if (!user) {
      toast.info("Please log in or register first.");
      void navigate({ to: "/register" });
      return;
    }

    // Free Tier action
    if (tier.priceValue === 0) {
      void navigate({ to: "/practice" });
      return;
    }

    try {
      setLoadingTier(tier.priceKey);

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error("Razorpay SDK failed to load. Check your internet connection.");
        return;
      }

      // 1. Request order creation from your secure backend server
      const orderRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: tier.priceKey,
          amount: tier.priceValue * 100, // Convert to paise
        }),
      });

      const orderData = await orderRes.json();
      if (!orderData.success) {
        throw new Error(orderData.error || "Failed to initialize payment order.");
      }

      // 2. Setup Razorpay popup options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, 
        amount: orderData.order.amount,
        currency: "INR",
        name: "PrepIQ.space",
        description: `${tier.name} Access`,
        order_id: orderData.order.id,
        handler: async function (response: any) {
          try {
            // 3. Send payment proof to backend for cryptographic validation & Firestore update
            const verifyRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/verify-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: user.uid, // Assumes Firebase Auth user object structure (user.uid)
                planTier: tier.priceKey,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              toast.success("Payment successful! Your account has been upgraded to Premium.");
              void navigate({ to: "/dashboard" });
            } else {
              toast.error(verifyData.error || "Payment verification failed.");
            }
          } catch (verifyErr) {
            toast.error("Error communicating with server during verification.");
          }
        },
        prefill: {
          name: user.displayName || user.email || "",
          email: user.email || "",
        },
        theme: {
          color: "#7c3aed", // Royal theme accent color matching app
        },
      };

      const rzpInstance = new (window as any).Razorpay(options);
      rzpInstance.open();
    } catch (error: any) {
      toast.error(error.message || "An unexpected payment error occurred.");
    } finally {
      setLoadingTier(null);
    }
  }

  return (
    <div className="min-h-screen bg-halo flex flex-col">
      <SiteHeader />
      
      <main className="flex-1 mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <Badge variant="secondary" className="px-3 py-1 text-xs font-medium gap-1.5">
            <Sparkles className="size-3.5 text-primary" /> PrepIQ Premium Toolkit
          </Badge>
          <h1 className="font-display text-3xl font-extrabold sm:text-5xl tracking-tight">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Unlock the ultimate exam simulation toolkit. Crack MAH MCA CET 2027 with adaptive practice, previous-year papers, and deep analytics.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="mt-12 grid gap-6 lg:grid-cols-4 sm:grid-cols-2">
          {PRICING_TIERS.map((tier) => {
            const isLoading = loadingTier === tier.priceKey;
            return (
              <div
                key={tier.name}
                className={`relative flex flex-col justify-between rounded-2xl border p-6 shadow-sm transition-all duration-300 ${
                  tier.highlight
                    ? "border-primary bg-primary/[0.04] shadow-xl ring-2 ring-primary/20 scale-[1.02]"
                    : "bg-card hover:border-primary/40 hover:shadow-md"
                }`}
              >
                {/* Top Badge */}
                {tier.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold text-white shadow-sm uppercase tracking-wider">
                      {tier.badge === "MOST POPULAR" && <Crown className="size-3" />}
                      {tier.badge}
                    </span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="font-display text-lg font-bold">{tier.name}</h3>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold tracking-tight font-display">
                        {tier.displayPrice}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{tier.subtitle}</p>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border/50">
                    {tier.description}
                  </p>

                  {/* Feature List */}
                  <ul className="space-y-2.5 pt-2 text-xs">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-foreground/90">
                        <Check className="size-4 shrink-0 text-primary mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <div className="mt-8 pt-4 border-t border-border/50">
                  <Button
                    variant={tier.ctaVariant}
                    className="w-full text-xs font-semibold py-2.5"
                    disabled={isLoading}
                    onClick={() => handleAction(tier)}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-1.5 size-4 animate-spin" /> Processing...
                      </>
                    ) : user && tier.priceValue !== 0 ? (
                      "Upgrade Now"
                    ) : (
                      tier.ctaText
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Guarantee footer section */}
        <div className="mt-16 rounded-2xl border bg-card/50 p-6 text-center max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-muted-foreground shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary shrink-0" />
            <span>Secure one-time payments with instant activation. No auto-renewals.</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="size-5 text-amber-500 shrink-0" />
            <span>Instant access to question bank and full-length mock simulators.</span>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}