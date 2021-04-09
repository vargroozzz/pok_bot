import {Offer} from "./types";

export const offersPrinter = (offer: Offer) =>
    `-----------------------------------------------------
    ${offer.item}: ${offer.qty}шт. по ${offer.price} 
    ${offer.sellerCastle}${offer.sellerName}`
