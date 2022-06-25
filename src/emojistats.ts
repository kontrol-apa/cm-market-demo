import {EmojiLeaderBoard, EmojiPricesList } from "../generated/schema"
import { BigInt, log } from "@graphprotocol/graph-ts"

/**
 * Does a standart minimum search in a unsorted list
 * @param emojiName : Emoji name (FEOF stripped) 
 * @returns new floor price of the given emoji.
 */
function findFloor(emojiName: string): BigInt {
    let emojiPricelist = EmojiPricesList.load(emojiName);
    const priceList = emojiPricelist!.prices
    let floor = BigInt.fromString("10000000000000000000000"); // 1000 eth
    if (priceList) {
        for (let x: u32 = 0; x < u32(priceList.length); ++x) {
            if (priceList[x] < floor) {
                floor = priceList[x];
            }
        }
    }
    else {
        log.error("{}",["pricesList is empty!"])
    }
    if (floor.equals(BigInt.fromString("10000000000000000000000"))) {
        floor = BigInt.zero();
    }
    return floor;

}
function createEmojiLeaderBoardAfterMint(emojiName: string): void {
    let emojiStats = EmojiLeaderBoard.load(emojiName)
    if (emojiStats == null) {
        emojiStats = new EmojiLeaderBoard(emojiName);
        emojiStats.suply = 1;
        emojiStats.floor = BigInt.fromI32(0);
        emojiStats.available = 0;
        emojiStats.avarageSale = BigInt.fromI32(0);
        emojiStats.totalVolume = BigInt.fromI32(0);
        emojiStats.totalSold = 0;
        emojiStats.save();

    }
    else { // another bp with the same emoji exists
        emojiStats.suply += 1;
        emojiStats.save();
    }
}

function updateEmojiLeaderBoardAfterCombine(emojiName: string): void {
    let emojiStats = EmojiLeaderBoard.load(emojiName);
    if (emojiStats) {
        emojiStats.suply -= 1;
        emojiStats.save();
    }
    else {
        log.error('{}', ['unexpected null @ updateEmojiLeaderBoardAfterCombine']);

    }
    // all of the other stats are not affected since something combinbed can not be on the market hence no floor etc

}

function updateEmojiLeaderBoardUpdateListing(emojiName: string, price: BigInt): void {
    let emojiStats = EmojiLeaderBoard.load(emojiName) as EmojiLeaderBoard;
    if (price < emojiStats.floor) { // you have a new floor
        emojiStats.floor = price;
    }
    else if (price == emojiStats.floor) { // now you will need a correction, find second lowest -> necessary for Update & Cancel
        emojiStats.floor = findFloor(emojiName);
    }
    emojiStats.save();

}


function updateEmojiLeaderBoardUpCancelListing(emojiName: string, price: BigInt): void {
    let emojiStats = EmojiLeaderBoard.load(emojiName) as EmojiLeaderBoard;
    if (price == emojiStats.floor) { // now you will need a correction, find second lowest -> necessary for Update & Cancel
        emojiStats.floor = findFloor(emojiName);
    }
    emojiStats.available -= 1;
    emojiStats.save();

}


function updateEmojiLeaderBoardAddListing(emojiName: string, price: BigInt): void {
    let emojiStats = EmojiLeaderBoard.load(emojiName) as EmojiLeaderBoard;
    if (price < emojiStats.floor || emojiStats.floor.equals(BigInt.zero())) { // new floor, relevant for add
        emojiStats.floor = price;
    }
    emojiStats.available += 1;
    emojiStats.save();

}


function updateEmojiLeaderBoardAfterSale(emojiName: string, price: BigInt): void {
    let emojiStats = EmojiLeaderBoard.load(emojiName) as EmojiLeaderBoard;
    if (price == emojiStats.floor) { // now you will need a correction, find second lowest
        emojiStats.floor = findFloor(emojiName);
    }
    emojiStats.totalVolume = emojiStats.totalVolume.plus(price);
    emojiStats.totalSold++;
    emojiStats.avarageSale = emojiStats.totalVolume.div(BigInt.fromI32(emojiStats.totalSold));
    emojiStats.available -=1;

    emojiStats.save();

}


function updateEmojiLeaderBoardAfterAcceptBid(emojiName: string, price: BigInt): void {
    let emojiStats = EmojiLeaderBoard.load(emojiName) as EmojiLeaderBoard;
    emojiStats.totalVolume = emojiStats.totalVolume.plus(price);
    emojiStats.totalSold++;
    emojiStats.avarageSale = emojiStats.totalVolume.div(BigInt.fromI32(emojiStats.totalSold));
    emojiStats.save();

}

export function updateEmojiLeaderBoardsAfterCombine(emojis: string[]): void {
    for (let x: u32 = 0; x < u32(emojis.length); ++x) {
        updateEmojiLeaderBoardAfterCombine(emojis[x]);
    }
}


export function updateEmojiLeaderBoardsCancelListing(emojis: string[], price: BigInt): void {
    for (let x: u32 = 0; x < u32(emojis.length); ++x) {
        updateEmojiLeaderBoardUpCancelListing(emojis[x], price);
    }
}

export function updateEmojiLeaderBoardsUpdateListing(emojis: string[], price: BigInt): void {
    for (let x: u32 = 0; x < u32(emojis.length); ++x) {
        updateEmojiLeaderBoardUpdateListing(emojis[x], price);
    }
}

export function updateEmojiLeaderBoardsAddListing(emojis: string[], price: BigInt): void {
    for (let x: u32 = 0; x < u32(emojis.length); ++x) {
        updateEmojiLeaderBoardAddListing(emojis[x], price);
    }
}
// has to be called after removeEmojiPricesList
export function updateEmojiLeaderBoardsAfterSale(emojis: string[], price: BigInt): void {
    for (let x: u32 = 0; x < u32(emojis.length); ++x) {
        updateEmojiLeaderBoardAfterSale(emojis[x], price);
    }
}

export function updateEmojiLeaderBoardsAfterAcceptBid(emojis: string[], price: BigInt): void {
    for (let x: u32 = 0; x < u32(emojis.length); ++x) {
        updateEmojiLeaderBoardAfterAcceptBid(emojis[x], price);
    }
}


export function updateEmojiLeaderBoardsAfterMint(emojis: string[]): void {
    for (let x: u32 = 0; x < u32(emojis.length); ++x) {
        createEmojiLeaderBoardAfterMint(emojis[x]);
    }
}