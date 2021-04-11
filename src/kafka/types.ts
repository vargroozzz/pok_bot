export type Castle = "🍆" | "🌹" | "🐢" | "🖤" | "☘️" | "🦇" | "🍁"

export type Resource = string

export type Deal = {
    sellerId: string,
    sellerName: string,
    sellerCastle: Castle,
    buyerId: string,
    buyerName: string,
    buyerCastle: Castle,
    item: Resource,
    qty: number,
    price: number
}

export type Offer = {
    sellerId: string,
    sellerName: string,
    sellerCastle: Castle,
    item: Resource,
    qty: number,
    price: number
}

export type StoreKind = "⚗️" | "⚒"

export type StoreOffer = {
    item: string,
    price: number,
    mana: number
}

export type QualityCraftSpecialization = {
    coat?: string,
    helmet?: string,
    armor?: string,
    gloves?: string,
    boots?: string,
}
export type AlchemySpecialization = {
    apothecary?: string,
    dreamweaving?: string,
    // armor?: string,
}

export type Store = {
    link: string,
    name: string,
    ownerTag?: string,
    ownerName: string,
    ownerCastle: Castle,
    kind: StoreKind,
    mana: number,
    offers?: StoreOffer[],
    specialization?: QualityCraftSpecialization | null,
    qualityCraftLevel?: number,
    specializations?: {
        quality_craft?: {
            "level": number,
            "values": QualityCraftSpecialization
        },
        alchemy?: {
            level: number,
            values: AlchemySpecialization
        }
    },
    maintenanceEnabled?: boolean,
    maintenanceCost?: number, // gold per 100 mana spent
    guildDiscount?: number,
    castleDiscount?: number,
}

export type Maintenance = {
    link: string,
    ownerCastle: Castle,
    mana: number,
    maintenanceCost: number, // gold per 100 mana spent
    castleDiscount: number,
}