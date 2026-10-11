// Active client registry. Providers, pipelines and scenes read the active
// profile through getClient(); App sets it from ?client= or the stored choice.

import type { ClientId, ClientProfile } from "./types"
import { AURELIA } from "./aurelia"
import { ASIAN_PAINTS } from "./asianpaints"
import { BIKAJI } from "./bikaji"
import { HALDIRAM } from "./haldiram"
import { TENNECO } from "./tenneco"

export const CLIENTS: Record<ClientId, ClientProfile> = {
  tenneco: TENNECO,
  asianpaints: ASIAN_PAINTS,
  bikaji: BIKAJI,
  haldiram: HALDIRAM,
  aurelia: AURELIA,
}

export const DEFAULT_CLIENT: ClientId = "tenneco"

let active: ClientProfile = CLIENTS[DEFAULT_CLIENT]

export function getClient(): ClientProfile {
  return active
}

export function setActiveClient(id: ClientId | string | null | undefined): ClientProfile {
  active = (id && CLIENTS[id as ClientId]) || CLIENTS[DEFAULT_CLIENT]
  return active
}

// This copy of esgOS runs inside the Tenneco walkthrough, so only Tenneco is offered.
export function availableClients(): ClientProfile[] {
  return [CLIENTS.tenneco]
}

export function isClientId(id: string | null | undefined): id is ClientId {
  return !!id && id in CLIENTS
}

export type { ClientId, ClientProfile } from "./types"
