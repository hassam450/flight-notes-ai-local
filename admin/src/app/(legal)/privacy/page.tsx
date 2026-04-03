import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Flight Notes AI",
};

export default function PrivacyPolicyPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-muted-foreground mb-1">Flight Notes AI</p>
      <p className="text-sm text-muted-foreground mb-10">
        Effective Date: April 1, 2026
      </p>

      <p className="text-muted-foreground leading-relaxed mb-6">
        Flight Notes AI (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;)
        operates the Flight Notes AI mobile application (the
        &quot;App&quot;). This Privacy Policy explains how we collect, use,
        store, and protect your personal information when you use our App.
      </p>

      <Section title="1. Information We Collect">
        <p className="text-muted-foreground leading-relaxed mb-3">
          We collect the following types of information:
        </p>
        <SubSection title="Account Information">
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Email address</li>
            <li>Full name (if provided)</li>
            <li>Profile avatar (if provided)</li>
            <li>Authentication credentials (securely hashed)</li>
          </ul>
        </SubSection>
        <SubSection title="Study Content">
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Audio recordings of flight training notes</li>
            <li>AI-generated transcriptions and summaries</li>
            <li>Flashcards and study materials</li>
            <li>Categories and topics you select</li>
          </ul>
        </SubSection>
        <SubSection title="Learning & Assessment Data">
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Quiz and multiple-choice question responses and scores</li>
            <li>Oral exam practice sessions and results</li>
            <li>Learning session history, including time spent and progress</li>
            <li>Strengths and weaknesses identified by the AI</li>
          </ul>
        </SubSection>
        <SubSection title="Chat & Conversation Data">
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Messages sent to the aviation AI chatbot</li>
            <li>AI-generated responses</li>
          </ul>
        </SubSection>
        <SubSection title="Subscription Information">
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Subscription status and plan type</li>
            <li>Purchase and transaction records (managed by your app store)</li>
          </ul>
        </SubSection>
      </Section>

      <Section title="2. How We Use Your Information">
        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
          <li>
            To provide and operate the App, including AI-powered transcription,
            summarization, flashcard generation, quizzes, oral exams, and chat
          </li>
          <li>To personalize your learning experience and track your progress</li>
          <li>To manage your account and authenticate your identity</li>
          <li>To process and manage your subscription</li>
          <li>To improve our services and develop new features</li>
          <li>To communicate with you about your account or support requests</li>
        </ul>
      </Section>

      <Section title="3. Third-Party Services">
        <p className="text-muted-foreground leading-relaxed mb-3">
          We use the following third-party services to operate the App:
        </p>
        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
          <li>
            <strong className="text-foreground">Supabase</strong> &mdash;
            Backend infrastructure, authentication, database, and file storage
          </li>
          <li>
            <strong className="text-foreground">Google Sign-In</strong> &mdash;
            Optional authentication method
          </li>
          <li>
            <strong className="text-foreground">Apple Sign-In</strong> &mdash;
            Optional authentication method (iOS)
          </li>
          <li>
            <strong className="text-foreground">RevenueCat</strong> &mdash;
            Subscription and in-app purchase management
          </li>
          <li>
            <strong className="text-foreground">OpenAI</strong> &mdash; AI
            processing for transcription, summarization, and chat features
            (accessed via our secure server-side functions; your data is not
            shared directly with OpenAI by the App)
          </li>
        </ul>
        <p className="text-muted-foreground leading-relaxed mt-3">
          Each of these services has its own privacy policy governing how they
          handle data. We encourage you to review their policies.
        </p>
      </Section>

      <Section title="4. Data Storage and Security">
        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
          <li>
            Your data is stored on secure servers managed by Supabase with
            encryption at rest and in transit
          </li>
          <li>
            Audio recordings are stored in secure cloud storage with
            access restricted to your account
          </li>
          <li>
            Authentication tokens are stored using your device&apos;s secure
            storage (Keychain on iOS, Keystore on Android)
          </li>
          <li>
            AI processing occurs through server-side edge functions; your raw
            data is not exposed to third-party AI services from the client
          </li>
          <li>
            Local data (e.g., in-progress recordings) is stored on your device
            in an encrypted SQLite database
          </li>
        </ul>
      </Section>

      <Section title="5. Your Rights">
        <p className="text-muted-foreground leading-relaxed mb-3">
          You have the right to:
        </p>
        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
          <li>
            <strong className="text-foreground">Access</strong> your personal
            data stored in the App
          </li>
          <li>
            <strong className="text-foreground">Correct</strong> inaccurate
            information in your profile
          </li>
          <li>
            <strong className="text-foreground">Delete</strong> your account and
            all associated data (see our{" "}
            <Link
              href="/account-deletion"
              className="text-primary hover:underline"
            >
              Account Deletion
            </Link>{" "}
            page)
          </li>
          <li>
            <strong className="text-foreground">Export</strong> your data by
            contacting us at the email below
          </li>
        </ul>
      </Section>

      <Section title="6. Children's Privacy">
        <p className="text-muted-foreground leading-relaxed">
          Flight Notes AI is not directed at children under the age of 13. We do
          not knowingly collect personal information from children under 13. If
          you believe we have inadvertently collected such information, please
          contact us and we will promptly delete it.
        </p>
      </Section>

      <Section title="7. Changes to This Policy">
        <p className="text-muted-foreground leading-relaxed">
          We may update this Privacy Policy from time to time. We will notify
          you of any material changes by posting the updated policy within the
          App or by sending you an email. Your continued use of the App after
          any changes constitutes acceptance of the updated policy.
        </p>
      </Section>

      <Section title="8. Contact Us">
        <p className="text-muted-foreground leading-relaxed">
          If you have any questions about this Privacy Policy or your data,
          please contact us at:{" "}
          <a
            href="mailto:support@flightnotesai.com"
            className="text-primary hover:underline"
          >
            support@flightnotesai.com
          </a>
        </p>
      </Section>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      {children}
    </section>
  );
}

function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <h3 className="text-base font-medium mb-1">{title}</h3>
      {children}
    </div>
  );
}
