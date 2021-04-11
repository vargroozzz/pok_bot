
type WantToBuy = {
    token: string,
    action: "wantToBuy",
    payload: {
        itemCode: string, // the code of an item
        quantity: number,
        price: number, // desired price
        exactPrice: boolean // try to buy exactly for given price, fail otherwise
    }
}

export const createAuthCode = (id: number) => ({
    action: "createAuthCode",
    payload: {
        userId: id // subjects Telegram userId
    }
})

export const grantToken = (id: number, authCode: string) => ({
    action: "grantToken",
    payload: {
        userId: id, // subjects Telegram userId
        authCode: authCode // authorization code, entered by user
    }
})

export const authAdditionalOperation = (operation: string) => (token: string) => ({
    token: token, // target user access token
    action: "authAdditionalOperation",
    payload: {
        operation: operation // requested operation
    }
})

export const grantAdditionalOperation = (token: string, requestId: string, authCode: string) => ({
    token: token, // target user access token
    action: "grantAdditionalOperation",
    payload: {
        requestId: requestId, // requestId of parent authAdditionalOperation
        authCode: authCode // code supplied by user for this requestId
    }
})

export const requestProfile = (token: string) => ({
    token: token, // access token
    action: "requestProfile"
})

export const wantToBuy = (token: string) => (code: string, quantity: number, price: number): WantToBuy => ({
    token: token,
    action: "wantToBuy",
    payload: {
        itemCode: code, // the code of an item
        quantity: quantity,
        price: price, // desired price
        exactPrice: true // try to buy exactly for given price, fail otherwise
    }
})