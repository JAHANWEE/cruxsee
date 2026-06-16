import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | Cruxsee",
  description: "Privacy Policy for Cruxsee",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-900 px-6 py-12 md:py-24">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-zinc-500">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="prose prose-zinc dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-400 space-y-6">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mt-8">1. Introduction</h2>
            <p>Welcome to Cruxsee. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, and share your data when you use our application.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mt-8">2. Information We Collect</h2>
            <p>We collect information that you voluntarily provide to us when you register on the application, express an interest in obtaining information about us or our products and services, or otherwise contact us.</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Personal Information:</strong> We collect names, email addresses, and profile pictures provided by your authentication provider (e.g., Google).</li>
              <li><strong>Third-Party Integrations:</strong> When you connect external services like Gmail or Google Calendar, we receive OAuth tokens to perform actions on your behalf. We do not store your emails or calendar events permanently on our servers unless required for a specific workflow you authorized.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mt-8">3. How We Use Your Information</h2>
            <p>We use personal information collected via our application for a variety of business purposes described below:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>To facilitate account creation and logon process.</li>
              <li>To provide the core functionality of our AI assistant, including managing your emails and calendar.</li>
              <li>To respond to user inquiries and offer support.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mt-8">4. Google API Services Usage</h2>
            <p>Cruxsee's use and transfer of information received from Google APIs to any other app will adhere to <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
            <p>We only access your email and calendar data when you actively use the assistant. Your data is never sold to third parties, and it is never used to train public or foundational AI models.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mt-8">5. Contact Us</h2>
            <p>If you have questions or comments about this notice, you may contact us via our Support page or at support@cruxsee.in.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
