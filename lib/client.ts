"use client";
// Small fetch helpers shared by the portal consoles.
// Every request carries the acting actor id so the server can enforce access.
import { getSession } from "./session";

export async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const session = getSession();
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(session ? { "x-wahrden-actor": session.userId } : {}),
      ...(init?.headers ?? {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export function actor(): string {
  return getSession()?.userId ?? "";
}
