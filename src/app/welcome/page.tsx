import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/OnboardingFlow";

export const metadata: Metadata = { title: "Welcome" };

/**
 * First-run setup (not in SPEC.md; added by owner request, see BUILDLOG.md).
 * Static shell; every answer is handled on the device by the client flow.
 * The app header is hidden here (ChromeGate).
 */
export default function WelcomePage() {
  return <OnboardingFlow />;
}
