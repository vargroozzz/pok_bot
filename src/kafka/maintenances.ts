import {flow, pipe} from "fp-ts/lib/function";
import * as N from "fp-ts/lib/number";
import * as S from "fp-ts/lib/string"
import {contramap} from "fp-ts/lib/Ord";
import {filter, foldMap, sortBy} from "fp-ts/lib/Array";
import {Store} from "./types";

const getPriceMultiplier = (store: Store) => (store.castleDiscount ? 100 - store.castleDiscount : 0) * (0.01) * (store.ownerCastle === "🍆" ? 1 : 0)
// @ts-ignore
const byPrice = pipe(N.Ord, contramap((s: Store) => s.maintenanceCost * getPriceMultiplier(s)))
const byMana = pipe(N.Ord, contramap((s: Store) => s.mana))
const sortByNameByAge = sortBy([byPrice, byMana])

const isMaintenanceEnabled = (store: Store) => store.maintenanceEnabled === true
const hasMana = (store: Store) => store.mana > 0

export const maintenancePrinter = (store: Store) =>
    `-----------------------------------------------------
    ${store.ownerCastle}${store.ownerName} /ws_${store.link}
    ${store.maintenanceCost} ${store.castleDiscount ?? ""}
    `
export const maintenancesPrinter = foldMap(S.Monoid)(maintenancePrinter)

export const getMaintenances = flow(filter(isMaintenanceEnabled),  filter(hasMana), sortByNameByAge)
export const printMaintenances = flow(getMaintenances, maintenancesPrinter)