import { useRef, useState } from "react";
import { learningRequest } from "@/features/learning/api";
import { HostingerApiError } from "@/lib/hostingerApi";
import type { Receipt } from "./api";
type Pending = { body: Record<string, unknown>; missing?: boolean };
function read(key: string): Pending | null {
  try {
    const value = JSON.parse(
      sessionStorage.getItem(key) || "null",
    ) as Pending | null;
    return value &&
      typeof value.body?.request_id === "string" &&
      /^[a-f0-9-]{36}$/i.test(value.body.request_id) &&
      ["start", "save", "transfer", "adopt", "evaluate"].includes(
        String(value.body.action),
      )
      ? value
      : null;
  } catch {
    return null;
  }
}
/** One exact owned request; receipt lookup precedes any repeat dispatch. */
export function useStudioSave(
  user: string,
  confirmed: (receipt: Receipt) => void,
) {
  const key = `cssvista:skills:pending:v1:${user}`;
  const [pending, setPending] = useState<Pending | null>(() => read(key));
  const lock = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function clear() {
    setPending(null);
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* Recovery remains idempotent. */
    }
  }
  function finish(receipt: Receipt) {
    clear();
    setError("");
    confirmed(receipt);
  }
  async function dispatch(body: Record<string, unknown>) {
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const receipt = await learningRequest<Receipt>(user, "skills.php", body);
      finish(receipt);
      return receipt;
    } catch (cause) {
      if (
        cause instanceof HostingerApiError &&
        [403, 409, 422].includes(cause.status)
      )
        clear();
      setError(
        cause instanceof Error
          ? cause.message
          : "Check the saved request before retrying. Your draft remains here.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function save(body: Record<string, unknown>) {
    if (lock.current || busy || pending) return;
    const next = { body: { ...body, request_id: crypto.randomUUID() } };
    try {
      sessionStorage.setItem(key, JSON.stringify(next));
    } catch {
      setError(
        "Browser storage is unavailable. Your response has not been sent; enable storage to preserve recovery.",
      );
      return;
    }
    setPending(next);
    return dispatch(next.body);
  }
  async function recover() {
    if (!pending || lock.current || busy) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      finish(
        await learningRequest<Receipt>(
          user,
          `skills.php?request_id=${encodeURIComponent(String(pending.body.request_id))}`,
        ),
      );
    } catch (cause) {
      if (cause instanceof HostingerApiError && cause.status === 404) {
        const next = { ...pending, missing: true };
        setPending(next);
        try {
          sessionStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* No dispatch occurs. */
        }
        setError(
          "No accepted result was found. Retry this same request or discard it before editing.",
        );
      } else
        setError(
          cause instanceof Error
            ? cause.message
            : "Saved status could not be checked.",
        );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return {
    pending,
    busy,
    error,
    save,
    recover,
    retry: () => {
      if (pending?.missing && !lock.current && !busy)
        void dispatch(pending.body);
    },
    discard: () => {
      if (pending?.missing && !lock.current && !busy) {
        clear();
        setError("");
      }
    },
  };
}
