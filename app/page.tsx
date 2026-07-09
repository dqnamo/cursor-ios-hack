import {
  GitForkIcon,
  GithubLogoIcon,
  HexagonIcon,
  MusicNotesSimpleIcon,
  TriangleIcon,
} from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import { DqnamoPanel } from "@/components/DqnamoPanel";
import { Footer } from "@/components/Footer";
import MobileHeader from "@/components/MobileHeader";
import Button from "@/components/public/Button";
import { cn } from "@/helpers/classname-helper";

const STACK_ITEMS = [
  {
    name: "Next.js",
    logo: "/logos/nextjs.png",
    logoClassName: "dark:invert w-6",
    description:
      "App Router foundation for routing, server components, API routes, and production builds.",
  },
  {
    name: "InstantDB",
    logo: "/logos/instantdb.png",
    logoClassName: "dark:invert",
    description:
      "Realtime data, auth, permissions, and storage without hand-rolled sync plumbing.",
  },
  {
    name: "Chord",
    Icon: MusicNotesSimpleIcon,
    description:
      "Local UI layer with Radix color tokens, Base UI primitives, and copy-paste components.",
  },
  {
    name: "Trigger.dev",
    logo: "/logos/trigger-dev.png",
    description:
      "Durable background jobs, retries, queues, schedules, and observability in TypeScript.",
  },
  {
    name: "PostHog",
    logo: "/logos/posthog.png",
    logoClassName: "dark:invert",
    description:
      "Product analytics, event capture, feature flags, funnels, and session recordings.",
  },
  {
    name: "Upstash",
    logo: "/logos/upstash.png",
    logoClassName: "dark:invert",
    description:
      "Serverless Redis and messaging primitives for queues, rate limits, and fast app state.",
  },
];

const GITHUB_REPO_URL = "https://github.com/dqnamo/base";
const VERCEL_DEPLOY_URL = `https://vercel.com/new/clone?repository-url=${encodeURIComponent(
  GITHUB_REPO_URL,
)}`;

export default function Home() {
  return (
    <main className="flex w-full flex-col divide-y divide-grayscale-3 dark:divide-grayscale-2">
      <MobileHeader />
      <DqnamoPanel />

      <div className="relative mx-auto max-w-4xl flex w-full flex-col border-x border-grayscale-3 p-4 pt-[4.5rem] dark:border-grayscale-2 md:p-8 lg:p-16">
        <div className="flex flex-col gap-px p-2">
          <div className="flex aspect-square w-8 shrink-0 flex-col items-center justify-center overflow-hidden rounded-md border border-grayscale-3 bg-grayscale-1 dark:border-grayscale-4 dark:bg-grayscale-3">
            <HexagonIcon size={20} weight="fill" className="text-accent-9" />
          </div>
          <div className="mt-3 flex flex-row items-center gap-1">
            <h1 className="font-mono text-2xl font-bold uppercase text-grayscale-12">
              Base
            </h1>
          </div>
          <p className="max-w-xl text-balance text-sm leading-6 text-grayscale-11">
            A personal web app boilerplate with Next.js, Chord UI tokens,
            InstantDB, Trigger.dev jobs, analytics, and serverless primitives
            already lined up.
          </p>
          <div className="mt-4 flex flex-row flex-wrap items-center gap-2">
            <Button
              className="text-xs"
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              variant="primary"
            >
              <GithubLogoIcon size={16} weight="bold" />
              Github
            </Button>
            <Button
              className="text-xs"
              href={VERCEL_DEPLOY_URL}
              target="_blank"
              rel="noreferrer"
              variant="secondary"
            >
              <TriangleIcon
                size={16}
                weight="fill"
                className="text-black dark:text-white"
              />
              Deploy on Vercel
            </Button>
            <Button
              className="text-xs"
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              variant="secondary"
            >
              <GitForkIcon size={16} weight="bold" />
              Clone Repo
            </Button>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-1 p-2">
          <h2 className="font-medium text-grayscale-11">The Stack</h2>
          <p className="max-w-md text-balance text-xs text-grayscale-10">
            FYI: this is my actual stack, so pieces may change when the
            boilerplate changes.
          </p>
        </div>

        <div className="mt-4 grid w-full grid-cols-1 gap-1.5 rounded-xl border border-grayscale-3 bg-grayscale-2 p-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {STACK_ITEMS.map((item) => {
            const StackIcon = "Icon" in item ? item.Icon : null;
            const logo = "logo" in item ? item.logo : null;
            const logoClassName =
              "logoClassName" in item ? item.logoClassName : undefined;

            return (
              <div
                className="small-shadow min-w-0 rounded-lg border border-grayscale-3 bg-grayscale-1 p-5"
                key={item.name}
              >
                {StackIcon ? (
                  <div className="flex aspect-square w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-grayscale-3 bg-grayscale-1 dark:border-grayscale-4 dark:bg-grayscale-3">
                    <StackIcon
                      aria-label={`${item.name} logo`}
                      className="text-grayscale-12"
                      size={24}
                      weight="fill"
                    />
                  </div>
                ) : logo ? (
                  <Image
                    alt={`${item.name} logo`}
                    className={cn("w-6", logoClassName ?? "")}
                    height={32}
                    src={logo}
                    width={32}
                  />
                ) : (
                  <div className="size-8" />
                )}
                <div className="mt-3 flex min-w-0 flex-col gap-px">
                  <p className="text-sm font-medium text-grayscale-11">
                    {item.name}
                  </p>
                  <p className="text-balance text-xs text-grayscale-10">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <Footer className="p-2 mt-8" />
      </div>
    </main>
  );
}
