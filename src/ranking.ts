import { Rank, RankingHelper, RankBPList, Blueprint, RankHelperBP, EmojiScoreInfo } from "../generated/schema"
import { log, TypedMap, TypedMapEntry, store, Address, BigInt } from "@graphprotocol/graph-ts"
import { AlchemyTree } from "../generated/CMBlueprint/AlchemyTree";
let emojiScoreMapping: TypedMap<string, string> = new TypedMap;
const AlchemyTreeAddress = Address.fromString("0x79686Ae9A71a8Bd9589247EC26D1d526BAB67930");

export function updateRankingAfterMint(score: i32): void {
    let helper = createOrGetRankingHelper(score);
    if (score > helper.rankingCount) { // create in between
        for (let i = helper.rankingCount; score >= i; ++i) {
            createRanking(i);
        }
        helper.rankingCount = score;
        helper.save();
    }
    let rank = Rank.load(score.toString());
    if (rank) {
        rank.count += 1;
        rank.save();
    }
    else {
        log.error("Rank empty!", []);
    }

}

export function updateRankingAfterBurn(score: i32): void {
    let rank = Rank.load(score.toString());
    if (rank) {
        rank.count -= 1;
        rank.save();
    }
    else {
        log.error("Rank on burn empty!", []);
    }

}

function createOrGetRankingHelper(score: i32): RankingHelper {
    let helper = RankingHelper.load('rankingHelper');
    if (!helper) {
        helper = new RankingHelper('rankingHelper');
        helper.rankingCount = 0;
        helper.save();
    }
    return helper;
}

function createRanking(score: i32): void {
    let rank = Rank.load(score.toString());
    if (!rank) {
        rank = new Rank(score.toString());
        rank.count = 0;
        rank.score = score;
        rank.save();
    }
}

// There is a two way cashing implemented for this function since we want to avoid contract calls as much as possible.
// For each emoji, we add up the score and the tier (multipled by 7)
// First we check the memory cash emojiScoreMapping if its there, we simply add it.
// If not, we check the store and add it to the cash as well for later use. This case can only happen if there is database migration
// If its not even in the store, we fetch it from the Alchemy contract, put it to the store and the memory cash
// Finally we add the combined score from the bp. This causes isses since there is no distinction between a normal mint and a combined mint. 
// It is unclear which event will be fired first (if the order follows the code order) so the logic is written in an order invariant way
export function getTotalScore(bp: Blueprint): BigInt {
    let totalScore = 0;
    for (let index = 0; index < bp.emojisWithFEOF.length; index++) {
        const emoji = bp.emojisWithFEOF[index];
        if (!emojiScoreMapping.isSet(emoji)) { // not in the memory map cash (removeEmojiPricesList)
            let scoreInfo = EmojiScoreInfo.load(emoji);
            if (!scoreInfo) { // not even in store 
                scoreInfo = new EmojiScoreInfo(emoji);
                let contract = AlchemyTree.bind(AlchemyTreeAddress);
                let element = contract.getElement(emoji);
                scoreInfo.score = element.score.toI32();
                scoreInfo.tier = element.tier.toI32() * 7; 
                emojiScoreMapping.set(emoji, (scoreInfo.score + scoreInfo.tier).toString());
                totalScore += (scoreInfo.score + scoreInfo.tier);
                scoreInfo.save();
            }
            else { // in store but somehow not in cash
                emojiScoreMapping.set(emoji, (scoreInfo.score + scoreInfo.tier).toString());
                totalScore += (scoreInfo.score + scoreInfo.tier);
            }
        }
        else { // in memory mapping cash, directly fetch it
            let emojiTierScore = emojiScoreMapping.get(emoji);
            if (emojiTierScore) {
                totalScore += I32.parseInt(emojiTierScore);
            }

        }
    }
    let totalScoreBigInt =  BigInt.fromI32(totalScore).times(BigInt.fromI32(100000000));
    totalScoreBigInt = totalScoreBigInt.plus(BigInt.fromI32(bp.combined * 1500000)); 
    totalScoreBigInt = totalScoreBigInt.plus(BigInt.fromI32(1000000 / (bp.numericId + 1)))
    return totalScoreBigInt;

}

// The mint call happens before the combined call so 
// there is no way of knowing the combined score of the freshly minted bp
// This means that the combined attribute is not factored in
// So we will have to adjust the whole ranking according to this minimal factor 
// IMOPORTANT : This function has be called after the bp has been saved and the combined score updated
export function fixCombinedScore(bp: Blueprint, id:i32) : void {
    let bpRankList = RankBPList.load(bp.score.toString());
    const totalScore = getTotalScore(bp);
    if (bpRankList) { // if it exists, if it doesnt something is not right
        let tempList = bpRankList.bpList;
        let indexOfCombined = tempList.indexOf(id);
        let newHelper = RankHelperBP.load(id.toString());
         // the new rank in score
        newHelper!.inScoreExtraPoint = totalScore;
        newHelper!.save();
        if(indexOfCombined == 0 ){ // it was first in the ranking and having more points wont change its position
            return; // only update the inScore
        }
        for (let index = indexOfCombined; index > 0; index--) {
            let current = RankHelperBP.load(tempList[index].toString());
            let next = RankHelperBP.load((tempList[index-1]).toString()); 
            if(current!.inScoreExtraPoint > next!.inScoreExtraPoint){ // will keep swapping till we find the right position
                let swap = tempList[index];
                tempList[index] = tempList[index-1];
                tempList[index-1] = swap;
                current!.inScoreRank++;
                next!.inScoreRank--;
                current!.save();
                next!.save(); 

            }
            else { // no need to look furter, the score has been updated but it didnt move
                break;
            }
            
        }
        bpRankList.bpList = tempList;
        bpRankList.save();

    }   
    else {
        log.error("{}", ["it must exist!"])
    }  
}


// Keeps track of the blueprint rankings after a mint with the help of RankBPList entity. 
// RankBPList is a sorted array of blueprint ids kept as integers. 
// If RankBPList is empty, a new list is created with the new item and assigned to rank 0
// If the list is not empty, the new item is appended to the end of the RankBPList and all of the items coming before that are shifted until the new item is at the right place. 
export function organizeRankingsAfterMint(bp: Blueprint, id: i32): void { // do at mint
    let bpRankList = RankBPList.load(bp.score.toString());
    const totalScore = getTotalScore(bp);
    if (bpRankList) { // if it exists
        let tempList = bpRankList.bpList;
        tempList.push(tempList[tempList.length - 1]); // add the last element to the end again
        if (tempList.length == 2) { // 2 elements special case
            let firstBp = RankHelperBP.load(tempList[0].toString())
            let newBleuprint = new RankHelperBP(id.toString());
            if (totalScore > firstBp!.inScoreExtraPoint) {
                tempList[0] = id;
                newBleuprint.inScoreRank = 1;
                firstBp!.inScoreRank = 2;
                firstBp!.save();
            }
            else {
                tempList[1] = id;
                newBleuprint.inScoreRank = 2;
            }
            // the new rank in score
            newBleuprint.inScoreExtraPoint = totalScore;
            newBleuprint.bpId = bp.id;
            newBleuprint.save();
        }
        else {
            for (let index = tempList.length - 2; index >= 0; index--) { // iterate, start from the element before the last element (original last element)
                const currentBpId = tempList[index];
                let currentBp = RankHelperBP.load(currentBpId.toString())
                if (totalScore > currentBp!.inScoreExtraPoint) {
                    currentBp!.inScoreRank++;
                    currentBp!.save();
                    tempList[index + 1] = currentBpId; // shifted, this element is now at the previous position
                }
                else { // we are at the correct place, the bp at the current index has a higher score
                    tempList[index + 1] = id; // put the new one to the  index before
                    let newBlueprint = new RankHelperBP(id.toString());
                    newBlueprint.inScoreRank = index + 2; // the new rank in score
                    newBlueprint.inScoreExtraPoint = totalScore;
                    newBlueprint.bpId = bp.id;
                    newBlueprint.save();
                    break;
                }
            }
            if (tempList[0] == tempList[1]) { // special case: if the correct place is at 0, this algorithm fails, we have to fix it manually. We dont want to check it in the begining because the shift has to be done by the for loop.
                tempList[0] = id;
                let newHelper = new RankHelperBP(id.toString());
                newHelper.inScoreRank = 1; // the new rank in score
                newHelper.inScoreExtraPoint = totalScore;
                newHelper.bpId = bp.id;
                newHelper.save();
                
            }
        }
        bpRankList.bpList = tempList; // reset
        bpRankList.save();
    }
    else {
        bpRankList = new RankBPList(bp.score.toString());
        bpRankList.bpList = [id];
        bpRankList.save();
        let newHelper = new RankHelperBP(id.toString());
        newHelper.inScoreRank = 1;
        newHelper.inScoreExtraPoint = totalScore;
        newHelper.bpId = bp.id;
        newHelper.save();

    }
}
// removes the burned element and updates the rankings accordingly.
// the removed element is removed from the RankBPList

export function organizeRankingsAfterBurn(bp: Blueprint, id: i32): void {
    let bpRankList = RankBPList.load(bp.score.toString());
    if (bpRankList) { // it should be here
        let tempList = bpRankList.bpList;
        if (id === tempList[tempList.length - 1]) { // already last in the list, just remove
            tempList.pop();
            store.remove('RankHelperBP', id.toString());
        }
        else { 
            let indexOfTheBurned = tempList.indexOf(id);
            for (let index = indexOfTheBurned + 1; index < tempList.length; index++) {
                tempList[indexOfTheBurned] = tempList[index];
                indexOfTheBurned = index;
                let helperBp = RankHelperBP.load(tempList[index].toString());
                helperBp!.inScoreRank--; // shift everything
                helperBp!.save();
            }
            tempList.pop(); // the rid of the last element, its a duplicate due to the shift
            store.remove('RankHelperBP', id.toString());
        }
        if (tempList.length == 0) {
            store.remove('RankBPList', bp.score.toString())
            return;
        }
        bpRankList.bpList = tempList; // reset
        bpRankList.save();
    }
    else {
        log.error("{}", ['Bp rank list missing']);

    }

}
