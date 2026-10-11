"use client";
// React context exposing the signed-in portal actor and a capability check.
import { createContext, useContext } from "react";
import { can as roleCan, type Capability } from "@/lib/access";
import type { PortalSession } from "@/lib/session";

export interface ActorContextValue {
  actor: PortalSession;
  can: (capability: Capability) => boolean;
}

export const ActorContext = createContext<ActorContextValue | null>(null);

export function useActor(): ActorContextValue {
  const ctx = useContext(ActorContext);
  if (!ctx) throw new Error("useActor must be used within the portal shell");
  return ctx;
}

export function makeActorValue(actor: PortalSession): ActorContextValue {
  return { actor, can: (capability: Capability) => roleCan(actor.role, capability) };
}
