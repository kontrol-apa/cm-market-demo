import { Bid, Blueprint, Stat, Owner, Emoji, ScoreSalesVolume, BurnedBlueprint, EmojiPricesList } from "../generated/schema"
import { ethereum, Address, BigInt, Bytes, log, store, BigDecimal } from "@graphprotocol/graph-ts"

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

export function getOrCreateEmoji(emojiString: string): Emoji {
    let emoji = Emoji.load(emojiString);
    if (emoji == null) {
        emoji = new Emoji(emojiString);
        emoji.count = 0;
        emoji.save()
    }

    return emoji
}

export function decreaseEmojiCount(emojiString: string): void {
    let emoji = Emoji.load(emojiString);
    if (emoji != null) {
        emoji.count--;
        if (emoji.count == 0) {
            store.remove('Emoji', emojiString)
        }
        else {
            emoji.save()
        }
    }
    else {
        log.error("{}", ["decreaseEmojiCount found a null emoji!"])
    }
}

export function registerEmojis(emojiStringList: string[]): void {
    emojiStringList.forEach(element => {
        let emoji = getOrCreateEmoji(element);
        emoji.count++;
        emoji.save()
    });
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
        sender.save();
    }

}

//TODO this function is redundant - get approval
export function UpdateSaleVolumePerScorePoint(scorePoint: number, salePrice: BigInt): void {
    let saleVolumePerScore = ScoreSalesVolume.load(scorePoint.toString())
    if (!saleVolumePerScore) {
        saleVolumePerScore = new ScoreSalesVolume(scorePoint.toString())
        saleVolumePerScore.totalVolume = salePrice
    }
    else {
        saleVolumePerScore.totalVolume = saleVolumePerScore.totalVolume.plus(salePrice)
    }
    saleVolumePerScore.save()

}


// creates a BurnedBlueprint entity
export function flagBurnedBlueprintForRefund(blueprint: Blueprint): void {
    const bidsList = blueprint.bids
    if (bidsList) {
        let burnedBlueprint = new BurnedBlueprint(blueprint.id)
        for (let index = 0; index < bidsList.length; index++) {
            burnedBlueprint.bidder[index] = bidsList[index];

        }
        burnedBlueprint.save();
    }
}





export function updateBurnedBlueprintBids(tokenId: string, bidder: string): void {
    let burnedBlueprint = BurnedBlueprint.load(tokenId)
    if (burnedBlueprint) {
        if (burnedBlueprint.bidder.length == 1) {
            store.remove('BurnedBlueprint', tokenId);
        }
        else {
            const index = burnedBlueprint.bidder.indexOf(bidder);
            burnedBlueprint.bidder.splice(index);
            burnedBlueprint.save();
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
            let index = prices.indexOf(price)
            let lastelem = prices.pop();
            prices[index] = lastelem;
            log.error("ID: {} , Index : {}, last elem {}, price: {}, entitiy prices len {} . original entity: {} ", [emojis[x], index.toString(), lastelem.toString(), prices.toString(), emojiPricelist!.prices.length.toString(), emojiPricelist!.prices.toString()])
            emojiPricelist!.prices = prices;
            emojiPricelist!.save()
        }
    }
}





