"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "choose" | "create" | "join";

function autoSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function OnboardingPanel() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [joinSlug, setJoinSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  async function submit(path: string, payload: Record<string, unknown>) {
    setError(null);
    setIsMutating(true);

    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Unable to complete onboarding.");
      setIsMutating(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full">
      {step === "choose" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <button
            className="rounded-[1.5rem] border border-[#182748] bg-[#101a30] px-6 py-7 text-left shadow-[0_18px_50px_rgba(2,8,23,0.35)] transition hover:border-[#2857cc]"
            onClick={() => {
              setError(null);
              setStep("create");
            }}
            type="button"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#4f96ff]">
              Create
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-[#e5eeff]">Create Organization</h2>
            <p className="mt-3 text-lg leading-8 text-[#7283a9]">
              Set up a new team and become the admin for your Argos workspace.
            </p>
          </button>
          <button
            className="rounded-[1.5rem] border border-[#182748] bg-[#101a30] px-6 py-7 text-left shadow-[0_18px_50px_rgba(2,8,23,0.35)] transition hover:border-[#2857cc]"
            onClick={() => {
              setError(null);
              setStep("join");
            }}
            type="button"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#4f96ff]">
              Join
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-[#e5eeff]">Join Organization</h2>
            <p className="mt-3 text-lg leading-8 text-[#7283a9]">
              Enter your org slug to join the existing team as a rep.
            </p>
          </button>
        </div>
      ) : null}

      {step === "create" ? (
        <div className="rounded-[1.75rem] border border-[#182748] bg-[#101a30] px-6 py-7 shadow-[0_18px_50px_rgba(2,8,23,0.35)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#4f96ff]">
            Create Organization
          </p>
          <div className="mt-6 space-y-4">
            <label className="block text-left">
              <span className="text-sm font-medium text-[#a8b8da]">Organization Name</span>
              <input
                className="mt-2 w-full rounded-[1rem] border border-[#1f335d] bg-[#0b1428] px-4 py-3 text-lg text-white outline-none transition placeholder:text-[#4c5d85] focus:border-[#4f96ff]"
                onChange={(event) => {
                  const nextName = event.target.value;
                  setName(nextName);
                  setSlug(autoSlug(nextName));
                }}
                placeholder="Acme Corp"
                type="text"
                value={name}
              />
            </label>

            <label className="block text-left">
              <span className="text-sm font-medium text-[#a8b8da]">Organization Slug</span>
              <input
                className="mt-2 w-full rounded-[1rem] border border-[#1f335d] bg-[#0b1428] px-4 py-3 text-lg text-white outline-none transition placeholder:text-[#4c5d85] focus:border-[#4f96ff]"
                onChange={(event) => setSlug(autoSlug(event.target.value))}
                placeholder="acme-corp"
                type="text"
                value={slug}
              />
            </label>
          </div>

          {error ? <p className="mt-4 text-sm text-[#ff7f7f]">{error}</p> : null}

          <div className="mt-6 flex gap-3">
            <button
              className="flex-1 rounded-[1.1rem] border border-[#1f335d] px-4 py-3 text-base font-medium text-[#a8b8da] transition hover:border-[#4f96ff] hover:text-white"
              onClick={() => {
                setError(null);
                setStep("choose");
              }}
              type="button"
            >
              Back
            </button>
            <button
              className="flex-1 rounded-[1.1rem] bg-[#2c63f6] px-4 py-3 text-base font-semibold text-white transition hover:bg-[#4476ff] disabled:opacity-50"
              disabled={!name.trim() || !slug.trim() || isMutating}
              onClick={() => {
                void submit("/api/organizations", { name, slug });
              }}
              type="button"
            >
              {isMutating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      ) : null}

      {step === "join" ? (
        <div className="rounded-[1.75rem] border border-[#182748] bg-[#101a30] px-6 py-7 shadow-[0_18px_50px_rgba(2,8,23,0.35)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#4f96ff]">
            Join Organization
          </p>
          <div className="mt-6 space-y-4">
            <label className="block text-left">
              <span className="text-sm font-medium text-[#a8b8da]">Organization Slug</span>
              <input
                className="mt-2 w-full rounded-[1rem] border border-[#1f335d] bg-[#0b1428] px-4 py-3 text-lg text-white outline-none transition placeholder:text-[#4c5d85] focus:border-[#4f96ff]"
                onChange={(event) => setJoinSlug(event.target.value.toLowerCase())}
                placeholder="acme-corp"
                type="text"
                value={joinSlug}
              />
            </label>
          </div>

          {error ? <p className="mt-4 text-sm text-[#ff7f7f]">{error}</p> : null}

          <div className="mt-6 flex gap-3">
            <button
              className="flex-1 rounded-[1.1rem] border border-[#1f335d] px-4 py-3 text-base font-medium text-[#a8b8da] transition hover:border-[#4f96ff] hover:text-white"
              onClick={() => {
                setError(null);
                setStep("choose");
              }}
              type="button"
            >
              Back
            </button>
            <button
              className="flex-1 rounded-[1.1rem] bg-[#2c63f6] px-4 py-3 text-base font-semibold text-white transition hover:bg-[#4476ff] disabled:opacity-50"
              disabled={!joinSlug.trim() || isMutating}
              onClick={() => {
                void submit("/api/organizations/join", { slug: joinSlug });
              }}
              type="button"
            >
              {isMutating ? "Joining..." : "Join"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
