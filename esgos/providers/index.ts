// Provider registry. Every adapter in this build is a mock (mode: "mock").
// To go live, implement the interface in providers/types.ts and swap it here.

import { ergosMock } from "./ergos.mock"
import { corporateRegistryMock, gstMock, siteListMock } from "./registry.mock"
import { ehsMock, erpMock, hrmsMock, vaultMock } from "./sources.mock"

export const providers = {
  ergos: ergosMock,
  gst: gstMock,
  mca: corporateRegistryMock,
  siteList: siteListMock,
  hrms: hrmsMock,
  erp: erpMock,
  ehs: ehsMock,
  vault: vaultMock,
}

export type Providers = typeof providers

export function isMock(key: keyof Providers): boolean {
  return providers[key].mode === "mock"
}

export * from "./types"
