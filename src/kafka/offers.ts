import {Offer} from "./types";
import {fromFoldable} from "fp-ts/lib/Map.js";
import * as S from "fp-ts/lib/string.js";
import {Foldable, unzip, zip} from "fp-ts/lib/Array.js";
import {fst, snd} from "fp-ts/lib/Tuple";

const codes = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '13', '15', '16', '17', '18', '19', '20', '21', '22', '23', '31', '33', '34', '35', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '518', '519', '520', '521', 'p01', 'p02', 'p03', 'p04', 'p05', 'p06', 'p07', 'p08', 'p09', 'p10', 'p11', 'p12', 'p13', 'p14', 'p15', 'p16', 'p17', 'p18', 'p19', 'p20', 'p21', 'ch1']
const names = ['Thread',  'Stick',  'Pelt', 'Bone',  'Coal',  'Charcoal',  'Powder',  'Iron ore',  'Cloth',  'Silver ore',  'Magic stone',  'Sapphire',  'Solvent',  'Ruby',  'Hardener',  'Steel',  'Leather',  'Bone powder',  'string',  'Coke',  'Rope',  'Metal plate',  'Metallic fiber',  'Crafted leather',  'Stinky Sumac',  'Mercy Sassafras',  'Cliff Rue',  'Love Creeper',  'Wolf Root',  'Swamp Lavender',  'White Blossom',  'Ilaves',  'Ephijora',  'Storm Hyssop',  'Cave Garlic',  'Yellow Seed',  'Tecceagrass',  'Spring Bay Leaf',  'Ash Rosemary',  'Sanguine Parsley',  'Sun Tarragon',  'Maccunut',  'Dragon Seed',  'Queens Pepper',  'Plasma of abyss',  'Ultramarine dust',  'Ethereal bone',  'Itacory',  'Assassin Vine',  'Kloliarway',  'Hay',  'Corn',  'Hamsters',  'Cheese',  'Vial of Rage',  'Potion of Rage',  'Bottle of Rage',  'Vial of Peace',  'Potion of Peace',  'Bottle of Peace',  'Vial of Greed',  'Potion of Greed',  'Bottle of Greed',  'Vial of Nature',  'Potion of Nature',  'Bottle of Nature',  'Vial of Mana',  'Potion of Mana',  'Bottle of Mana',  'Vial of Twilight',  'Potion of Twilight',  'Bottle of Twilight',  'Vial of Morph',  'Potion of Morph',  'Bottle of Morph',  'Zombie Chest']
const codeToName = fromFoldable(S.Eq, S.Monoid, Foldable)(zip(codes, names))
const nameToCode = fromFoldable(S.Eq, S.Monoid, Foldable)(zip(names, codes))

export const getUserOfferCodesAndPrices = (offersList: [string, string][]) => unzip(offersList)
export const getUserOfferCodes = (offersList: [string, string][]) => fst(unzip(offersList))
export const getUserOfferPrices = (offersList: [string, string][]) => snd(unzip(offersList))

export const getCode = (name: string) => nameToCode.get(name)
export const getName = (code: string) => codeToName.get(code)

export const writeOffer = (offer: Offer) => `${getCode(offer.item)} ${offer.qty} ${offer.price}`
export const writeOfferJSON = ({item, qty, price}: Offer) => ({code: getCode(item), qty, price})

export const offersPrinter = (offer: Offer) =>
    `${offer.item}: ${offer.qty}шт. по ${offer.price} 
    ${offer.sellerCastle}${offer.sellerName}
    `
