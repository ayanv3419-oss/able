import {
  ArrowRight,
  CheckCircle2,
  Cloud,
  Laptop,
  MessageSquareText,
  MonitorSmartphone,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wifi,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { DownloadInstall } from "@/components/install/download-install";

export const metadata: Metadata = {
  description:
    "Install Able on Windows, macOS, Android, iPhone, or iPad and keep your study chats close.",
  title: "Download Able",
};

const deviceGuides = [
  {
    description: "Open in Chrome or Edge, then choose Install Able.",
    icon: Laptop,
    label: "Windows & macOS",
    step: "Desktop",
  },
  {
    description: "Open in Chrome, tap the menu, then Add to Home screen.",
    icon: Smartphone,
    label: "Android",
    step: "Mobile",
  },
  {
    description: "Open in Safari, tap Share, then Add to Home Screen.",
    icon: MonitorSmartphone,
    label: "iPhone & iPad",
    step: "Mobile",
  },
];

const benefits = [
  {
    description:
      "Open Able from your desktop or home screen without hunting for a browser tab.",
    icon: Zap,
    title: "One-tap access",
  },
  {
    description:
      "Your chats, projects, and plan stay connected to the same secure account.",
    icon: Cloud,
    title: "Everything stays synced",
  },
  {
    description:
      "Get the full focused Able experience with less browser chrome and distraction.",
    icon: Sparkles,
    title: "Made to feel native",
  },
];

const questions = [
  {
    answer:
      "Yes. Able installs directly from a supported browser and does not require an app-store download.",
    question: "Is the Able app free to install?",
  },
  {
    answer:
      "Yes. Able uses online AI, authentication, and chat syncing, so an internet connection is required.",
    question: "Does Able work offline?",
  },
  {
    answer:
      "Yes. Sign in with the same Google account and your chats and projects remain available across devices.",
    question: "Will my chats sync?",
  },
];

export default function DownloadPage() {
  return (
    <main className="min-h-dvh overflow-hidden bg-[#fafafa] text-[#151515]">
      <header className="relative z-10 border-b border-black/6 bg-[#fafafa]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Logo />
          <nav
            aria-label="Download page navigation"
            className="flex items-center gap-5"
          >
            <Link
              className="hidden text-sm text-[#6c6c6c] transition-colors hover:text-black sm:block"
              href="#devices"
            >
              Devices
            </Link>
            <Link
              className="hidden text-sm text-[#6c6c6c] transition-colors hover:text-black sm:block"
              href="/pricing"
            >
              Pricing
            </Link>
            <Link
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#151515] px-5 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
              href="/"
            >
              Open Able
              <ArrowRight className="size-4" />
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative">
        <div className="pointer-events-none absolute left-1/2 top-8 h-96 w-96 -translate-x-1/2 rounded-full bg-[#dbe8ff] opacity-55 blur-[110px] sm:h-[32rem] sm:w-[32rem]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.05fr_0.75fr] lg:items-center lg:gap-20 lg:pb-28 lg:pt-32">
          <div>
            <p className="mb-5 text-xs font-semibold tracking-[0.22em] text-[#6a6a6a]">
              ABLE FOR YOUR DEVICE
            </p>
            <h1 className="max-w-2xl text-balance text-[clamp(2.7rem,7vw,5.8rem)] font-medium leading-[0.95] tracking-[-0.055em]">
              Your best study space, one tap away.
            </h1>
            <p className="mt-7 max-w-xl text-pretty text-lg leading-8 text-[#696969] sm:text-xl">
              Install Able on your home screen for a focused, app-like
              experience. Your conversations and projects follow you across
              devices.
            </p>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#555]">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-[#151515]" /> No app store
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="size-4 text-[#151515]" /> Secure sign-in
              </span>
              <span className="inline-flex items-center gap-2">
                <Wifi className="size-4 text-[#151515]" /> Internet required
              </span>
            </div>
          </div>

          <DownloadInstall />
        </div>
      </section>

      <section className="border-y border-black/6 bg-white">
        <div className="mx-auto grid max-w-6xl gap-px bg-black/6 sm:grid-cols-3">
          {benefits.map(({ description, icon: Icon, title }) => (
            <article className="bg-white px-6 py-10 sm:px-8" key={title}>
              <Icon className="size-5" />
              <h2 className="mt-6 text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#707070]">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white" id="devices">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#777]">
              INSTALL GUIDE
            </p>
            <h2 className="mt-4 text-3xl font-medium tracking-[-0.035em] sm:text-5xl">
              Able, wherever you learn.
            </h2>
            <p className="mt-5 text-base leading-7 text-[#707070] sm:text-lg">
              Pick your device and add Able in a few taps. Updates arrive
              automatically.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {deviceGuides.map(({ description, icon: Icon, label, step }) => (
              <article
                className="rounded-[1.6rem] border border-black/8 bg-[#fafafa] p-6 sm:p-7"
                key={label}
              >
                <div className="flex items-center justify-between">
                  <div className="flex size-11 items-center justify-center rounded-xl border border-black/8 bg-white">
                    <Icon className="size-5" />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#969696]">
                    {step}
                  </span>
                </div>
                <h3 className="mt-10 text-lg font-semibold">{label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6d6d6d]">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-black/6 bg-[#f4f4f1]">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.8fr_1fr] lg:items-center lg:gap-20">
          <div>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#151515] text-white">
              <MessageSquareText className="size-5" />
            </div>
            <h2 className="mt-7 text-3xl font-medium tracking-[-0.035em] sm:text-5xl">
              Start here. Continue anywhere.
            </h2>
          </div>
          <div className="rounded-[2rem] border border-black/8 bg-white p-7 shadow-sm sm:p-9">
            <p className="text-lg leading-8 text-[#4f4f4f]">
              Ask a question on your phone, organize it into a project on your
              laptop, and pick up from the same conversation later. Able keeps
              your learning workspace connected to your account.
            </p>
            <Link
              className="mt-7 inline-flex items-center gap-2 text-sm font-semibold hover:underline"
              href="/"
            >
              Start using Able <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#777]">
              QUESTIONS
            </p>
            <h2 className="mt-4 text-3xl font-medium tracking-[-0.035em] sm:text-4xl">
              Good to know.
            </h2>
          </div>
          <div className="mt-12 divide-y divide-black/8 border-y border-black/8">
            {questions.map(({ answer, question }) => (
              <article
                className="grid gap-3 py-7 sm:grid-cols-[0.8fr_1.2fr] sm:gap-10"
                key={question}
              >
                <h3 className="font-semibold">{question}</h3>
                <p className="text-sm leading-6 text-[#6d6d6d]">{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#151515] px-5 py-20 text-center text-white sm:px-8 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-balance text-3xl font-medium tracking-[-0.04em] sm:text-5xl">
            Put Able on your home screen.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/60">
            Faster access to your AI study companion, with your work synced and
            ready.
          </p>
          <div className="mt-8">
            <DownloadInstall compact />
          </div>
        </div>
      </section>

      <footer className="border-t border-black/6 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-[#777] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo />
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link className="hover:text-black" href="/privacy">
              Privacy
            </Link>
            <Link className="hover:text-black" href="/terms">
              Terms
            </Link>
            <Link className="hover:text-black" href="/refunds">
              Refunds
            </Link>
            <Link className="hover:text-black" href="/contact">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
