import { Bid, Blueprint, Statistics, Owner, Emoji, Activity, ScoreSalesVolume, BurnedBlueprint, EmojiPrice, ClassLeaderBoard} from "../generated/schema"
import { ethereum, Address, BigInt, Bytes, log, store, BigDecimal } from "@graphprotocol/graph-ts"

export function getOrCreateStatistics() : Statistics{
    
    let statistics = Statistics.load('stats') as Statistics;
    if(statistics == null){ 
        statistics = new Statistics('stats');
        statistics.totalOwners = 0;
        statistics.totalVolume = BigInt.fromI32(0);
        statistics.totalBlueprint = 0;
        statistics.totalEmojiCount = 0;
        statistics.save();
    }

    return statistics

}

function getOrCreateEmoji(emojiString: string) : Emoji{
    let emoji = Emoji.load(emojiString) as Emoji;
    if(emoji == null){ 
        emoji = new Emoji(emojiString);
        emoji.count = 0;
        emoji.save()
    }

    return emoji 
}

export function decreaseEmojiCount(emojiString: string) : void{
    let emoji = Emoji.load(emojiString) as Emoji;
    if(emoji != null){ 
        emoji.count--;
        if(emoji.count == 0){
            store.remove('Emoji',emojiString)
        }
        else {
            emoji.save()
        }
    }
}

export function registerEmojis(emojiStringList: string []) : void {
    emojiStringList.forEach(element => {
        let emoji = getOrCreateEmoji(element);
        emoji.count++;
        emoji.save()
    });
}



export function addOwnerandUpdateStatistics(ownerAdress: Address, statistics: Statistics): void {

    let owner = Owner.load(ownerAdress.toHex())
    if(owner == null){ // if the owner doesnt exist already, statistics need to be updated
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
export function removeOwner(ownerAdress: Address, statistics: Statistics): void {

    let sender = Owner.load(ownerAdress.toHex())
    if(sender != null){
    sender.numberOfBlueprints--;
        if(sender.numberOfBlueprints == 0){
            statistics.totalOwners--;
            store.remove('Owner',ownerAdress.toHex())
        }  
    }
    
}


export function UpdateSaleVolumePerScorePoint(scorePoint: number, salePrice: BigInt): void {
    let saleVolumePerScore =  ScoreSalesVolume.load(scorePoint.toString())
    if(!saleVolumePerScore){
        saleVolumePerScore = new ScoreSalesVolume(scorePoint.toString())
        saleVolumePerScore.totalVolume = salePrice
    }
    else {
        saleVolumePerScore.totalVolume = saleVolumePerScore.totalVolume.plus(salePrice)
    }
    saleVolumePerScore.save()

}

export function flagBurnedBlueprintForRefund(blueprint: Blueprint): void {
    if(blueprint.bids){
        let burnedBlueprint = new BurnedBlueprint(blueprint.id)
        burnedBlueprint.count = blueprint.bids!.length
    }
    
}

export function updateBurnedBlueprintBids(tokenId: string): void{
    let burnedBlueprint =  BurnedBlueprint.load(tokenId)
    if(burnedBlueprint){
        burnedBlueprint.count--;
        if(burnedBlueprint.count == 0){
            store.remove('BurnedBlueprint',tokenId)
            // the bids are deleted with the events sent by refund
        }
    }
}

export function updateEmojiPrices(emojis: string [], price: BigInt, tokenId: BigInt): void {
    for (let x: u32 = 0; x < u32(emojis.length); ++x) {
        let emojiPrice =  new EmojiPrice(emojis[x] + tokenId.toHex())
        emojiPrice.price = price;
        emojiPrice.emoji = emojis[x];
    }
}


export function removeEmojiPrices(emojis: string [], tokenId: BigInt) : void {
    for (let x: u32 = 0; x < u32(emojis.length); ++x) {
        store.remove('EmojiPrice',emojis[x] + tokenId.toHex());
    } 

    
}



