export type User = {
    id: number,
    token: string | null,
    gold: number,
    rights: {
        basic: boolean,
        profile: boolean,
        gear: boolean,
        stock: boolean,
        trade: boolean,
        guild: boolean,
    },
    offersList: [string, string][]
}