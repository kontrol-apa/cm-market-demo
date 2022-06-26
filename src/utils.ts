import { Stat, Owner, EmojiPricesList } from "../generated/schema"
import { Address, BigInt, store } from "@graphprotocol/graph-ts"

export function getOrCreateStatistics(): Stat {

    let statistics = Stat.load('stats');
    if (statistics == null) {
        statistics = new Stat('stats');
        statistics.totalOwners = 0;
        statistics.totalVolume = BigInt.zero()
        statistics.totalBlueprint = 0;
        statistics.totalEmojiCount = 0;
        statistics.save();
    }

    return statistics

}


export function addOwnerandUpdateStatistics(ownerAdress: Address, statistics: Stat): void {

    let owner = Owner.load(ownerAdress.toHex())
    if (owner == null) { // if the owner doesnt exist already, statistics need to be updated
        owner = new Owner(ownerAdress.toHex()) //TODO Owners should have a reverse look up list of owners
        statistics.totalOwners++;
        owner.numberOfBlueprints = 1;
    }
    else {
        owner.numberOfBlueprints++;
    }
    owner.save();
}

// combining or transfering doesnt reduce the owner count
export function removeOwner(ownerAdress: Address, statistics: Stat): void {

    let sender = Owner.load(ownerAdress.toHex())
    if (sender != null) {
        sender.numberOfBlueprints--;
        if (sender.numberOfBlueprints == 0) {
            statistics.totalOwners--;
            store.remove('Owner', ownerAdress.toHex())
        }
        else {
            sender.save();
        }
    }

}


export function updateEmojiPricesList(emojis: string[], price: BigInt): void {
    for (let x: u32 = 0; x < u32(emojis.length); ++x) {
        let emojiPricelist = EmojiPricesList.load(emojis[x])
        if (!emojiPricelist) {
            emojiPricelist = new EmojiPricesList(emojis[x]);
            emojiPricelist.prices = [price]
            emojiPricelist.save();
        }
        else {
            let priceList = emojiPricelist.prices
            priceList.push(price)
            emojiPricelist.prices = priceList;
            emojiPricelist.save();
        }


    }
}

export function removeEmojiPricesList(emojis: string[], price: BigInt): void {
    for (let x: u32 = 0; x < u32(emojis.length); ++x) {
        let emojiPricelist = EmojiPricesList.load(emojis[x])
        let prices = emojiPricelist!.prices;
        if (prices.length == 1) {
            emojiPricelist!.prices = [];
            emojiPricelist!.save()
        }
        else {
            if (price.equals(prices[prices.length - 1])) { // if already the last element, dont replace
                let lastelem = prices.pop();
                emojiPricelist!.prices = prices;
                emojiPricelist!.save()
            }
            else {
                let lastelem = prices.pop();
                let index = prices.indexOf(price)
                prices[index] = lastelem;
                emojiPricelist!.prices = prices;
                emojiPricelist!.save()
            }
        }


    }
}





