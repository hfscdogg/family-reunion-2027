"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppState } from "@/lib/types";

const POLL_INTERVAL = 5000;
const RETRY_DELAYS = [300, 600, 900];

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number[] = RETRY_DELAYS
): Promise<Response> {
  let lastError: Error | null = null;

  // First attempt
  try {
    const res = await fetch(url, options);
    if (res.ok) return res;
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    if (res.status === 400) {
      // Client errors should not be retried
      throw new Error(body.error || "Bad request");
    }
    lastError = new Error(body.error || `Server error (${res.status})`);
  } catch (err) {
    if (err instanceof Error && err.message && !err.message.includes("Server error")) {
      // Re-throw client errors (400s) immediately
      throw err;
    }
    lastError = err instanceof Error ? err : new Error("Request failed");
  }

  // Retry attempts
  for (const delay of retries) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      const body = await res.json().catch(() => ({ error: "Request failed" }));
      lastError = new Error(body.error || `Server error (${res.status})`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Request failed");
    }
  }

  throw lastError || new Error("Request failed after retries");
}

function LoadingSkeleton() {
  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="h-8 bg-white/60 rounded-lg w-3/4 mx-auto mb-3 skeleton-pulse" />
        <div className="h-4 bg-white/40 rounded w-2/3 mx-auto skeleton-pulse" />
      </div>
      <div className="h-12 bg-white rounded-xl mb-6 skeleton-pulse" />
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="bg-white rounded-xl p-4 mb-3 shadow-sm skeleton-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="h-5 bg-gray-100 rounded w-1/2 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-3/4 mb-3" />
          <div className="h-2 bg-gray-100 rounded-full w-full" />
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [state, setState] = useState<AppState | null>(null);
  const [name, setName] = useState("");
  const [writeInDest, setWriteInDest] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [votingFor, setVotingFor] = useState<string | null>(null);
  const [submittingWriteIn, setSubmittingWriteIn] = useState(false);
  const toastIdRef = useRef(0);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  // Load name from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("reunion-voter-name");
    if (saved) setName(saved);
  }, []);

  // Persist name to localStorage
  useEffect(() => {
    if (name.trim()) {
      localStorage.setItem("reunion-voter-name", name.trim());
    }
  }, [name]);

  // Poll for state
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        const data: AppState = await res.json();
        setState(data);
      }
    } catch {
      // Silently fail on poll errors; data will refresh next cycle
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchState]);

  const handleVote = async (optionId: string) => {
    if (!name.trim()) {
      showToast("Please enter your name first.", "error");
      return;
    }

    setVotingFor(optionId);
    try {
      await fetchWithRetry("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), optionId }),
      });
      showToast("Vote saved!", "success");
      await fetchState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save vote";
      showToast(msg, "error");
    } finally {
      setVotingFor(null);
    }
  };

  const handleWriteIn = async () => {
    if (!name.trim()) {
      showToast("Please enter your name first.", "error");
      return;
    }
    if (!writeInDest.trim()) {
      showToast("Please enter a destination name.", "error");
      return;
    }

    setSubmittingWriteIn(true);
    try {
      await fetchWithRetry("/api/writein", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          destination: writeInDest.trim(),
        }),
      });
      showToast("Write-in added and vote saved!", "success");
      setWriteInDest("");
      await fetchState();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to add write-in";
      showToast(msg, "error");
    } finally {
      setSubmittingWriteIn(false);
    }
  };

  const currentUserVote = state?.votes.find(
    (v) => v.voter_name === name.trim().toLowerCase()
  )?.option_id;

  const totalVotes = state
    ? Object.values(state.tallies).reduce((sum, t) => sum + t.count, 0)
    : 0;

  if (!state) {
    return <LoadingSkeleton />;
  }

  const seedOptions = state.options.filter((o) => !o.is_writein);
  const writeIns = state.options.filter((o) => o.is_writein);

  return (
    <main className="max-w-xl mx-auto px-4 py-8 pb-24">
      {/* Toasts */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-animate px-4 py-2 rounded-lg shadow-lg text-white text-sm font-medium ${
              toast.type === "success" ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Nelson Family Reunion 2027
        </h1>
        <p className="text-gray-600 text-sm sm:text-base">
          Where should we meet? Tap to vote. One vote per person, change
          anytime.
        </p>
      </div>

      {/* Name input */}
      <div className="mb-6">
        <label
          htmlFor="voter-name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Your name
        </label>
        <input
          id="voter-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Aunt Linda"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-gray-900 placeholder-gray-400"
        />
      </div>

      {/* Destination cards */}
      <div className="space-y-3 mb-8">
        {seedOptions.map((option) => {
          const tally = state.tallies[option.id];
          const count = tally?.count ?? 0;
          const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
          const isSelected = currentUserVote === option.id;
          const isVoting = votingFor === option.id;

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={isVoting || !name.trim()}
              className={`w-full text-left p-4 rounded-xl shadow-sm transition-all ${
                isSelected
                  ? "bg-blue-50 border-2 border-blue-400 shadow-md"
                  : "bg-white border-2 border-transparent hover:border-gray-200"
              } ${!name.trim() ? "opacity-60 cursor-not-allowed" : "cursor-pointer active:scale-[0.98]"}`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    {option.name}
                    {isSelected && (
                      <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                        YOUR VOTE
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {option.description}
                  </p>
                </div>
                <span className="text-sm font-medium text-gray-600 ml-3 whitespace-nowrap">
                  {count} {count === 1 ? "vote" : "votes"}
                </span>
              </div>
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-400 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              {tally && tally.voters.length > 0 && (
                <p className="text-xs text-gray-400 mt-1.5">
                  {tally.voters.join(", ")}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Write-in options (if any) */}
      {writeIns.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Write-ins
          </h2>
          <div className="space-y-3">
            {writeIns.map((option) => {
              const tally = state.tallies[option.id];
              const count = tally?.count ?? 0;
              const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
              const isSelected = currentUserVote === option.id;
              const isVoting = votingFor === option.id;

              return (
                <button
                  key={option.id}
                  onClick={() => handleVote(option.id)}
                  disabled={isVoting || !name.trim()}
                  className={`w-full text-left p-4 rounded-xl shadow-sm transition-all ${
                    isSelected
                      ? "bg-amber-50 border-2 border-amber-400 shadow-md"
                      : "bg-[#fefce8] border-2 border-transparent hover:border-amber-200"
                  } ${!name.trim() ? "opacity-60 cursor-not-allowed" : "cursor-pointer active:scale-[0.98]"}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        {option.name}
                        <span className="text-xs bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                          WRITE-IN
                        </span>
                        {isSelected && (
                          <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">
                            YOUR VOTE
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {option.description}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-gray-600 ml-3 whitespace-nowrap">
                      {count} {count === 1 ? "vote" : "votes"}
                    </span>
                  </div>
                  <div className="mt-2 h-2 bg-amber-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {tally && tally.voters.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1.5">
                      {tally.voters.join(", ")}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Write-in section */}
      <div className="bg-white rounded-xl shadow-sm p-4 border-2 border-dashed border-gray-200">
        <h2 className="font-semibold text-gray-700 mb-2">
          Suggest a different destination
        </h2>
        <p className="text-sm text-gray-400 mb-3">
          Don&apos;t see your pick? Add it below (60 char max).
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={writeInDest}
            onChange={(e) => setWriteInDest(e.target.value)}
            placeholder="e.g. Destin, FL"
            maxLength={60}
            className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-gray-900 placeholder-gray-400 text-sm"
          />
          <button
            onClick={handleWriteIn}
            disabled={submittingWriteIn || !name.trim() || !writeInDest.trim()}
            className="px-4 py-2.5 bg-amber-500 text-white rounded-lg font-medium text-sm hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {submittingWriteIn ? "Adding..." : "Add & Vote"}
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-gray-400 mt-8">
        {totalVotes} {totalVotes === 1 ? "vote" : "votes"} cast so far.
        Refreshes every 5 seconds.
      </p>
    </main>
  );
}
