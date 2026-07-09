import type { ReactNode } from "react";
import { getInstantAdminDb } from "@/lib/instant-admin";
import { verifyMiraWebToken } from "@/lib/mira-web-links";
import { getStyleMemory } from "@/lib/style-profiles";

type HomeProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

type TelegramUserSummary = {
  firstName?: string;
  username?: string;
};

const PROFILE_SECTIONS = [
  ["vibe", "Vibe"],
  ["budget", "Budget"],
  ["values", "Values"],
  ["preferredBrands", "Preferred brands"],
  ["avoidedBrands", "Avoided brands"],
  ["sizingNotes", "Sizing notes"],
  ["lifestyle", "Lifestyle"],
] as const;

export default async function Home({ searchParams }: HomeProps) {
  const { token } = await searchParams;
  const tokenValue = Array.isArray(token) ? token[0] : token;

  if (!tokenValue) {
    return <AccessScreen />;
  }

  let auth;

  try {
    auth = verifyMiraWebToken(tokenValue);
  } catch {
    return <AccessScreen state="misconfigured" />;
  }

  if (!auth) {
    return <AccessScreen state="invalid" />;
  }

  const [memory, telegramUser] = await Promise.all([
    getStyleMemory(auth.telegramId),
    getTelegramUserSummary(auth.telegramId),
  ]);

  return (
    <main className="min-h-screen bg-[#f5f0e8] px-4 py-6 text-[#211b15] sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-[2rem] border border-[#211b15]/10 bg-[#fffaf2] p-5 shadow-[0_18px_80px_rgba(33,27,21,0.08)] sm:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-[#9b5f2d]">
                Mira web
              </p>
              <h1 className="mt-4 text-balance font-mono text-4xl font-bold uppercase tracking-[-0.06em] text-[#211b15] sm:text-6xl">
                Your style workspace
              </h1>
              <p className="mt-5 max-w-2xl text-balance text-sm leading-6 text-[#5f554b] sm:text-base">
                This private page is opened from a secure link Mira sends in
                chat. It brings your saved style profile, recent notes, and next
                steps into a browser-friendly view.
              </p>
            </div>
            <div className="rounded-3xl border border-[#211b15]/10 bg-[#211b15] p-4 text-[#fffaf2]">
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-[#d9c7ac]">
                Signed in as
              </p>
              <p className="mt-2 text-lg font-semibold">
                {displayName(telegramUser, auth.telegramId)}
              </p>
              <p className="mt-1 text-xs text-[#d9c7ac]">
                Link expires {formatDate(auth.exp * 1000)}
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-[2rem] border border-[#211b15]/10 bg-[#fffaf2] p-5 sm:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-[#9b5f2d]">
                  Style profile
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                  What Mira knows so far
                </h2>
              </div>
              <span className="w-fit rounded-full border border-[#211b15]/10 px-3 py-1 text-xs font-medium text-[#5f554b]">
                {memory.profile?.onboardingComplete
                  ? "Onboarding complete"
                  : "Still learning"}
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {PROFILE_SECTIONS.map(([field, label]) => (
                <ProfileField
                  key={field}
                  label={label}
                  value={memory.profile?.[field]}
                />
              ))}
            </div>

            <div className="mt-3">
              <ProfileField
                label="Notes"
                value={memory.profile?.notes}
                variant="wide"
              />
            </div>
          </div>

          <aside className="flex flex-col gap-6">
            <Panel title="Next with Mira" eyebrow="Assistant">
              <ul className="space-y-3 text-sm leading-6 text-[#5f554b]">
                <li>Send outfit photos in Telegram for fit and color reads.</li>
                <li>Ask Mira to update any profile detail after it changes.</li>
                <li>Request a fresh web link anytime this one expires.</li>
              </ul>
            </Panel>

            <Panel title="Private by link" eyebrow="Access">
              <p className="text-sm leading-6 text-[#5f554b]">
                This page only loads with a signed token generated from your
                Telegram session. Keep the link private, and ask Mira for a new
                one if it is shared accidentally.
              </p>
            </Panel>
          </aside>
        </section>

        <section className="rounded-[2rem] border border-[#211b15]/10 bg-[#fffaf2] p-5 sm:p-8">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-[#9b5f2d]">
              Recent memory
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
              Notes from photos and chat
            </h2>
          </div>

          {memory.recentRefs.length > 0 ? (
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {memory.recentRefs.map((ref) => (
                <article
                  className="rounded-3xl border border-[#211b15]/10 bg-[#f8efe2] p-5"
                  key={ref.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-[#211b15] px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#fffaf2]">
                      {ref.source ?? "note"}
                    </span>
                    <time className="text-xs text-[#7d7166]">
                      {formatDate(ref.createdAt)}
                    </time>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[#3a3028]">
                    {ref.summary}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No saved notes yet"
              description="When Mira learns from your photos or preferences, those durable takeaways will show up here."
            />
          )}
        </section>
      </div>
    </main>
  );
}

function AccessScreen({
  state = "missing",
}: {
  state?: "missing" | "invalid" | "misconfigured";
}) {
  const copy = {
    missing: {
      title: "Open Mira from a private link",
      description:
        "This web UI is token-gated. Ask Mira in Telegram to send your app link, then open that URL here.",
    },
    invalid: {
      title: "This Mira link is not valid",
      description:
        "The token is expired or malformed. Ask Mira for a fresh app link from Telegram.",
    },
    misconfigured: {
      title: "Web access is not configured yet",
      description:
        "The app needs MIRA_WEB_LINK_SECRET set before signed Mira links can be verified.",
    },
  }[state];

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#211b15] px-4 py-10 text-[#fffaf2]">
      <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.24)] sm:p-10">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-[#d8a05f]">
          Mira web
        </p>
        <h1 className="mt-5 text-balance font-mono text-4xl font-bold uppercase tracking-[-0.06em] sm:text-5xl">
          {copy.title}
        </h1>
        <p className="mt-5 text-balance text-sm leading-6 text-[#d9c7ac] sm:text-base">
          {copy.description}
        </p>
        <div className="mt-8 rounded-3xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-[#efe2ce]">
          Example: ask Mira, "send me my web app link" or "open my style
          dashboard."
        </div>
      </section>
    </main>
  );
}

function ProfileField({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value?: string;
  variant?: "default" | "wide";
}) {
  return (
    <article
      className={`rounded-3xl border border-[#211b15]/10 bg-[#f8efe2] p-5 ${
        variant === "wide" ? "min-h-36" : "min-h-32"
      }`}
    >
      <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#9b5f2d]">
        {label}
      </p>
      {value?.trim() ? (
        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#3a3028]">
          {value}
        </p>
      ) : (
        <p className="mt-3 text-sm leading-6 text-[#8b8177]">
          Mira has not saved this yet.
        </p>
      )}
    </article>
  );
}

function Panel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-[#211b15]/10 bg-[#fffaf2] p-5 sm:p-6">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-[#9b5f2d]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mt-6 rounded-3xl border border-dashed border-[#211b15]/20 bg-[#f8efe2] p-8">
      <h3 className="text-lg font-semibold tracking-[-0.02em]">{title}</h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[#5f554b]">
        {description}
      </p>
    </div>
  );
}

async function getTelegramUserSummary(
  telegramId: string,
): Promise<TelegramUserSummary | null> {
  const database = getInstantAdminDb();
  const result = await database.query({
    telegramUsers: { $: { where: { telegramId } } },
  });
  const user = result.telegramUsers[0];

  if (!user) {
    return null;
  }

  return {
    firstName: typeof user.firstName === "string" ? user.firstName : undefined,
    username: typeof user.username === "string" ? user.username : undefined,
  };
}

function displayName(user: TelegramUserSummary | null, telegramId: string) {
  if (user?.firstName) {
    return user.firstName;
  }

  if (user?.username) {
    return `@${user.username}`;
  }

  return `Telegram ${telegramId}`;
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
