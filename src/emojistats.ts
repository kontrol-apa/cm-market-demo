import { Emoji, EmojiPrice, EmojiLeaderBoard} from "../generated/schema"
import { BigInt } from "@graphprotocol/graph-ts"


function findFloor(emojiName: string, oldFloorPrice: BigInt): BigInt {
    let emoji = Emoji.load(emojiName);
    let priceList = emoji!.emojiPrices;
    let floor = BigInt.fromString("10000000000000000000000"); // 1000 eth
    for (let x: u32 = 0; x < u32(priceList!.length); ++x) {
        let emojiPrice = EmojiPrice.load(priceList![x]) as EmojiPrice;
        if(emojiPrice.price < floor){
            floor = emojiPrice.price;
        }
    }
    return floor;

}
function updateEmojiLeaderBoardAfterMint(emojiName: string): void {
    let emojiStats = EmojiLeaderBoard.load(emojiName) as EmojiLeaderBoard;
    if(emojiStats == null){ 
        emojiStats = new EmojiLeaderBoard(emojiName);
        emojiStats.suply = 1;
        emojiStats.floor = BigInt.fromI32(0);
        emojiStats.available = 0;
        emojiStats.avarageSale = BigInt.fromI32(0);
        emojiStats.totalVolume = BigInt.fromI32(0);
        emojiStats.save();
    }
    else { // another bp with the same emoji exists
        emojiStats.suply += 1;
        emojiStats.save();
    }   
}

function updateEmojiLeaderBoardAfterCombine(emojiName: string): void { 
    let emojiStats = EmojiLeaderBoard.load(emojiName) as EmojiLeaderBoard;
    emojiStats.suply -= 1;
    emojiStats.save();
    // all of the other stats are not affected since something combinbed can not be on the market hence no floor etc

}

function updateEmojiLeaderBoardUpdateListing(emojiName: string, price: BigInt): void {
    let emojiStats = EmojiLeaderBoard.load(emojiName) as EmojiLeaderBoard;
    if(price < emojiStats.floor) { 
        emojiStats.floor = price;
    }
    else if (price == emojiStats.floor) { // now you will need a correction, find second lowest -> necessary for Update & Cancel
        emojiStats.floor = findFloor(emojiName,price);
    }
    emojiStats.save();
    
}


function updateEmojiLeaderBoardUpCancelListing(emojiName: string, price: BigInt): void {
    let emojiStats = EmojiLeaderBoard.load(emojiName) as EmojiLeaderBoard;
    if (price == emojiStats.floor) { // now you will need a correction, find second lowest -> necessary for Update & Cancel
        emojiStats.floor = findFloor(emojiName,price);
    }
    emojiStats.available -= 1;
    emojiStats.save();
    
}


function updateEmojiLeaderBoardAddListing(emojiName: string, price: BigInt): void {
    let emojiStats = EmojiLeaderBoard.load(emojiName) as EmojiLeaderBoard;
    if(price < emojiStats.floor) { // new floor, relevant for add
        emojiStats.floor = price;
    }
    emojiStats.available +=1;
    emojiStats.save();
    
}


function updateEmojiLeaderBoardAfterSale(emojiName: string, price: BigInt): void {
    let emojiStats = EmojiLeaderBoard.load(emojiName) as EmojiLeaderBoard;
    if(price == emojiStats.floor) { // it was the floor ! now you will need a correction, find second lowest
        emojiStats.floor = findFloor(emojiName,price);
    }
    emojiStats.totalVolume = emojiStats.totalVolume.plus(price);
    emojiStats.avarageSale =  emojiStats.totalVolume.div(BigInt.fromI32(emojiStats.suply));
    emojiStats.save();
    
}

export function updateEmojiLeaderBoardsAfterCombine(emojis: string[]): void {
    for (let x: u32 = 0; x < u32(emojis.length); ++x) {
        updateEmojiLeaderBoardAfterCombine(emojis[x]);
    }
}


export function updateEmojiLeaderBoardsCancelListing(emojis: string[], price: BigInt ): void {
    for (let x: u32 = 0; x < u32(emojis.length); ++x) {
        updateEmojiLeaderBoardUpCancelListing(emojis[x],price);
    }
}

export function updateEmojiLeaderBoardsUpdateListing(emojis: string[], price: BigInt ): void {
    for (let x: u32 = 0; x < u32(emojis.length); ++x) {
        updateEmojiLeaderBoardUpdateListing(emojis[x],price);
    }
}

export function updateEmojiLeaderBoardsAddListing(emojis: string[], price: BigInt ): void {
    for (let x: u32 = 0; x < u32(emojis.length); ++x) {
        updateEmojiLeaderBoardAddListing(emojis[x],price);
    }
}

export function updateEmojiLeaderBoardsAfterSale(emojis: string[], price: BigInt ): void {
    for (let x: u32 = 0; x < u32(emojis.length); ++x) {
        updateEmojiLeaderBoardAfterSale(emojis[x],price);
    }
}


export function updateEmojiLeaderBoardsAfterMint(emojis: string[]): void {
    for (let x: u32 = 0; x < u32(emojis.length); ++x) {
        updateEmojiLeaderBoardAfterMint(emojis[x]);
    }
}