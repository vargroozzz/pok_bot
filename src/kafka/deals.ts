import {Deal} from "./types";

export const dealsPrinter = (deal: Deal) =>
    `-----------------------------------------------------
    ${deal.item}: ${deal.qty}шт. по ${deal.price} 
    Продавец: ${deal.sellerCastle}${deal.sellerName} 
    Покупатель: ${deal.buyerCastle}${deal.buyerName}`
