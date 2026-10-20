"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Plus, Sparkles } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { NewBookModal } from "@/components/ai-studio/new-book-modal";
import { Button } from "@/components/ui/button";

type AiBookPlanSummary = {
  id: string;
  title: string;
  niche: string;
  pageCount: number;
  status: string;
  updatedAt: string;
};

export function AiStudioClient({ plans }: { plans: AiBookPlanSummary[] }) {
  const [newBookOpen, setNewBookOpen] = useState(false);

  return (
    <main className="p-4 sm:p-6">
      <DashboardPageHeader
        title="AI Studio"
        description="Plan your next book with AI-assisted content and puzzle ideas."
        className="mb-8"
        actions={
          <Button type="button" onClick={() => setNewBookOpen(true)}>
            <Plus />
            New AI Book
          </Button>
        }
      />

      {plans.length === 0 ? (
        <section className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 p-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles aria-hidden="true" className="size-7" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Start your first AI book</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Create a plan with your book idea, print specs, and the activities
            you want to include.
          </p>
          <Button
            type="button"
            className="mt-5"
            onClick={() => setNewBookOpen(true)}
          >
            <BookOpen />
            New AI Book
          </Button>
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <Link
              key={plan.id}
              href={`/dashboard/ai-studio/plan/${plan.id}`}
              className="group rounded-xl border bg-card p-5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles aria-hidden="true" className="size-5" />
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs capitalize text-muted-foreground">
                  {plan.status}
                </span>
              </div>
              <h2 className="mt-4 truncate font-semibold group-hover:text-primary">
                {plan.title}
              </h2>
              <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">
                {plan.niche || "AI book plan"} · {plan.pageCount} pages
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                Updated {new Date(plan.updatedAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </section>
      )}

      <NewBookModal
        key={newBookOpen ? "open" : "closed"}
        open={newBookOpen}
        onOpenChange={setNewBookOpen}
      />
    </main>
  );
}
