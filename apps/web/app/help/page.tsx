import Link from "next/link";
import { ArrowLeft, Mail, MessageCircle, Github } from "lucide-react";

export const metadata = {
  title: "Help & Support | Cruxsee",
  description: "Get help and support for Cruxsee",
};

export default function HelpSupport() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-900 px-6 py-12 md:py-24">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Help & Support</h1>
          <p className="text-zinc-500 text-lg">We're here to help you get the most out of Cruxsee.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <a href="mailto:support@cruxsee.in" className="flex flex-col items-center justify-center p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors text-center group">
            <Mail className="w-10 h-10 mb-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
            <h3 className="text-xl font-semibold mb-2">Email Support</h3>
            <p className="text-sm text-zinc-500">Reach out to our team at support@cruxsee.in. We typically reply within 24 hours.</p>
          </a>
          
          <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors text-center group cursor-pointer">
            <MessageCircle className="w-10 h-10 mb-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
            <h3 className="text-xl font-semibold mb-2">Community Discord</h3>
            <p className="text-sm text-zinc-500">Join our community to ask questions, share workflows, and get tips from other users.</p>
          </div>
        </div>

        <div className="mt-16 prose prose-zinc dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-400">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Frequently Asked Questions</h2>
          
          <div className="space-y-6 mt-8">
            <div>
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">How do I revoke access to my Google Account?</h3>
              <p>You can revoke Cruxsee's access to your Google Account at any time by visiting your Google Account settings under <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Security &gt; Third-party apps with account access</a> and removing Cruxsee.</p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">Does Cruxsee read all my emails?</h3>
              <p>No. Cruxsee only accesses emails when you specifically ask the AI to perform a task (like summarizing unread emails or drafting a reply). We do not continuously read or store your emails in our database.</p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">Is my data used to train AI models?</h3>
              <p>Absolutely not. We use enterprise-grade AI APIs that guarantee your personal data is never used to train public models.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
