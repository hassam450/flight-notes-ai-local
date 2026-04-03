import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Account Deletion | Flight Notes AI",
};

export default function AccountDeletionPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold mb-2">Account Deletion</h1>
      <p className="text-muted-foreground mb-10">Flight Notes AI</p>

      <p className="text-muted-foreground leading-relaxed mb-8">
        You can request the deletion of your Flight Notes AI account and all
        associated data at any time. Please follow the steps below.
      </p>

      <section className="rounded-lg border border-border bg-card p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">
          How to Request Account Deletion
        </h2>
        <ol className="list-decimal pl-6 text-muted-foreground space-y-3">
          <li>
            Send an email to{" "}
            <a
              href="mailto:support@flightnotesai.com?subject=Account%20Deletion%20Request"
              className="text-primary hover:underline"
            >
              support@flightnotesai.com
            </a>{" "}
            from the email address associated with your Flight Notes AI account.
          </li>
          <li>
            Use the subject line:{" "}
            <strong className="text-foreground">
              &quot;Account Deletion Request&quot;
            </strong>
          </li>
          <li>
            In the body of the email, confirm that you wish to permanently
            delete your account and all associated data.
          </li>
          <li>
            You will receive a confirmation email within{" "}
            <strong className="text-foreground">48 hours</strong>. Your account
            and data will be fully deleted within{" "}
            <strong className="text-foreground">30 days</strong> of your
            request.
          </li>
        </ol>
      </section>

      <Section title="Data That Will Be Deleted">
        <p className="text-muted-foreground leading-relaxed mb-3">
          When your account is deleted, the following data will be permanently
          removed:
        </p>
        <ul className="list-disc pl-6 text-muted-foreground space-y-1">
          <li>Your account and profile information</li>
          <li>All audio recordings and uploaded files</li>
          <li>AI-generated transcriptions, summaries, and flashcards</li>
          <li>Study notes and categories</li>
          <li>Learning sessions, quiz scores, and exam history</li>
          <li>Aviation chatbot conversation history</li>
        </ul>
      </Section>

      <Section title="Data That May Be Retained">
        <p className="text-muted-foreground leading-relaxed mb-3">
          Certain data may be retained for a limited period after account
          deletion:
        </p>
        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
          <li>
            <strong className="text-foreground">
              Anonymized analytics data
            </strong>{" "}
            &mdash; may be retained for up to 30 days after deletion. This data
            cannot be used to identify you.
          </li>
          <li>
            <strong className="text-foreground">Subscription records</strong>{" "}
            &mdash; purchase and transaction history may be retained as required
            by payment processors (Apple App Store, Google Play, and RevenueCat)
            for financial and legal compliance.
          </li>
        </ul>
      </Section>

      <Section title="Important Notes">
        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
          <li>
            <strong className="text-foreground">
              Account deletion is permanent and irreversible.
            </strong>{" "}
            Once processed, your data cannot be recovered.
          </li>
          <li>
            If you have an active subscription, please cancel it through the{" "}
            <strong className="text-foreground">Apple App Store</strong> or{" "}
            <strong className="text-foreground">Google Play Store</strong>{" "}
            before requesting account deletion. Deleting your account does not
            automatically cancel your subscription.
          </li>
          <li>
            After deletion, you may create a new account using the same email
            address, but none of your previous data will be available.
          </li>
        </ul>
      </Section>

      <Section title="Contact Us">
        <p className="text-muted-foreground leading-relaxed">
          If you have any questions about account deletion or data handling,
          please contact us at:{" "}
          <a
            href="mailto:support@flightnotesai.com"
            className="text-primary hover:underline"
          >
            support@flightnotesai.com
          </a>
        </p>
        <p className="text-muted-foreground leading-relaxed mt-3">
          For information about how we handle your data, please see our{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          .
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
