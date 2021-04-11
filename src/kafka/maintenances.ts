import {flow, pipe} from "fp-ts/lib/function";
import * as N from "fp-ts/lib/number";
import * as S from "fp-ts/lib/string"
import {contramap, reverse} from "fp-ts/lib/Ord";
import {filter, filterMap, foldMap, map, sortBy} from "fp-ts/lib/Array";
import {Castle, Maintenance, Store} from "./types";
import * as O from "fp-ts/lib/Option";

const getPriceMultiplier = <A extends {ownerCastle: Castle, castleDiscount?: number}>(store: A) =>
    store.ownerCastle === "🍆" ?
        (store.castleDiscount ? 100 - store.castleDiscount : 100) * (0.01) :
        1

// @ts-ignore
const byPrice = pipe(N.Ord, contramap((s: Maintenance) => s.maintenanceCost * getPriceMultiplier(s)))
const byMana = pipe(N.Ord, contramap((s: Maintenance) => s.mana), reverse)
export const sortByPriceByMana = sortBy([byPrice, byMana])

const hasMana = <A extends {mana: number}>(store: A) => store.mana > 0

export const storeToOptionMaintenance: (store: Store) => O.Option<Maintenance> =
    ({ownerCastle, mana, link, maintenanceCost, castleDiscount = 0}) =>
        maintenanceCost === undefined ?
            O.none :
            O.some({ownerCastle, mana, link, maintenanceCost, castleDiscount})

export const storesToMaintenances = filterMap(storeToOptionMaintenance)

export const maintenancePrinter = (store: Maintenance) =>
    `💧${store.mana} 💰${Math.ceil(store.maintenanceCost * getPriceMultiplier(store))} ${store.ownerCastle} /ws_${store.link}
`

export const maintenancesPrinter = foldMap(S.Monoid)(maintenancePrinter)

export const getMaintenances = flow(storesToMaintenances,  filter(hasMana), sortByPriceByMana)
export const printMaintenances = flow(getMaintenances, maintenancesPrinter)