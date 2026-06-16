import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service | Cruxsee",
  description: "Terms of Service for Cruxsee",
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-900 px-6 py-12 md:py-24">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-zinc-500">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="prose prose-zinc dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-400 space-y-6">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mt-8">1. Acceptance of Terms</h2>
            <p>By accessing or using Cruxsee, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you do not have permission to access the Service.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mt-8">2. Use of the Service</h2>
            <p>Cruxsee provides an AI-powered assistant for managing your digital workflows. You agree to use the service only for lawful purposes and in accordance with these Terms.</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You agree not to use the service to send spam, phishing emails, or malicious content.</li>
              <li>You are responsible for all activities that occur under your account.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mt-8">3. Third-Party Services</h2>
            <p>Cruxsee integrates with third-party services like Google Workspace. Your use of these third-party services is governed by their respective Terms of Service and Privacy Policies. We are not responsible for the availability or functionality of these external services.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mt-8">4. Intellectual Property</h2>
            <p>The Service and its original content, features, and functionality are and will remain the exclusive property of Cruxsee and its licensors. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Cruxsee.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mt-8">5. Termination</h2>
            <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mt-8">6. Disclaimer</h2>
            <p>Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express or implied.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
