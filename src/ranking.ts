import { Rank, RankingHelper, RankBPList, Blueprint, RankHelperBP, EmojiScoreInfo } from "../generated/schema"
import { log, TypedMap, TypedMapEntry, store, Address } from "@graphprotocol/graph-ts"
import { AlchemyTree } from "../generated/AlchemyTree/AlchemyTree";
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
    if (rank) {
        log.error("Rank already exists", []);
    }
    else {
        rank = new Rank(score.toString());
        rank.count = 0;
        rank.score = score;
        rank.save();
    }
}


export function getTotalScore(bp: Blueprint): i32 {
    let totalScore = 0;
    for (let index = 0; index < bp.emojis.length; index++) {
        const emoji = bp.emojis[index];
        if (!emojiScoreMapping.isSet(emoji)) { // not in the cash
            let scoreInfo = EmojiScoreInfo.load(emoji);
            if (!scoreInfo) { // not even in store 
                scoreInfo = new EmojiScoreInfo(emoji);
                let contract = AlchemyTree.bind(AlchemyTreeAddress);
                let element = contract.getElement(emoji);
                scoreInfo.score = element.score.toI32();
                scoreInfo.tier = element.tier.toI32(); 
                emojiScoreMapping.set(emoji, (scoreInfo.score + scoreInfo.tier).toString());
                totalScore += (scoreInfo.score + scoreInfo.tier);
                scoreInfo.save();
            }
            else { // in store but somehow not in cash
                emojiScoreMapping.set(emoji, (scoreInfo.score + scoreInfo.tier).toString());
                totalScore += (scoreInfo.score + scoreInfo.tier);
            }
        }
        else { // in cash
            let emojiTierScore = emojiScoreMapping.get(emoji);
            if (emojiTierScore) {
                totalScore += I32.parseInt(emojiTierScore);
            }

        }
    }
    totalScore *= 100; // emoji scores are more important than combined 
    totalScore += bp.combined;
    return totalScore;

}

export function fixCombinedScore(bp: Blueprint, id:i32) : void {
    let bpRankList = RankBPList.load(bp.score.toString());
    const totalScore = getTotalScore(bp);
    if (bpRankList) { // if it exists
        let tempList = bpRankList.bpList;
        let indexOfCombined = tempList.indexOf(id);
        let newHelper = RankHelperBP.load(id.toString());
         // the new rank in score
        newHelper!.inScoreExtraPoint = totalScore;
        newHelper!.save();
        if(indexOfCombined == 0 ){
            return; // only update the inScore
        }
        log.error("Before: {}", [tempList.toString()])
        for (let index = indexOfCombined; index > 0; index--) {
            let current = RankHelperBP.load(tempList[index].toString());
            let next = RankHelperBP.load((tempList[index-1]).toString()); // check if 0
            if(current!.inScoreExtraPoint > next!.inScoreExtraPoint){
                let swap = tempList[index];
                tempList[index] = tempList[index-1];
                tempList[index-1] = swap;
                current!.inScoreRank++;
                next!.inScoreRank--;
                current!.save();
                next!.save(); 

            }
            else {
                break; // no need to look furter, the score has been updated but it didnt move
            }
            
        }
        log.error("After: {} ", [tempList.toString()])

        bpRankList.bpList = tempList;
        bpRankList.save();

    }   
    else {
        log.error("{}", ["it must exist!"])
    }  
}

export function organizeRankingsAfterMint(bp: Blueprint, id: i32): void { // do at mint
    let bpRankList = RankBPList.load(bp.score.toString());
    const totalScore = getTotalScore(bp);
    if (bpRankList) { // if it exists
        let tempList = bpRankList.bpList;
        tempList.push(tempList[tempList.length - 1]); // add the last element to the end again
        if (tempList.length == 2) {
            let helperBp = RankHelperBP.load(tempList[0].toString())
            let newHelper = new RankHelperBP(id.toString());
            if (totalScore > helperBp!.inScoreExtraPoint) {
                tempList[0] = id;
                newHelper.inScoreRank = 0;
                helperBp!.inScoreRank = 1;
            }
            else {
                tempList[1] = id;
                newHelper.inScoreRank = 1;
            }
            // the new rank in score
            newHelper.inScoreExtraPoint = totalScore;
            newHelper.save();
        }
        else {
            for (let index = tempList.length - 2; index >= 0; index--) { // iterate, start from the 
                const element = tempList[index];
                let helperBp = RankHelperBP.load(element.toString())
                if (totalScore > helperBp!.inScoreExtraPoint) {
                    helperBp!.inScoreRank++;
                    helperBp!.save();
                    tempList[index + 1] = element; // shifted, this element is now at the previous position
                }
                else { // we are at the correct place
                    tempList[index + 1] = id; // put the new one to the  index before
                    let newHelper = new RankHelperBP(id.toString());
                    newHelper.inScoreRank = index + 1; // the new rank in score
                    newHelper.inScoreExtraPoint = totalScore;
                    newHelper.save();
                    break;
                }
            }
            if (tempList[0] == tempList[1]) {
                tempList[0] = id;
                let newHelper = new RankHelperBP(id.toString());
                newHelper.inScoreRank = 0; // the new rank in score
                newHelper.inScoreExtraPoint = totalScore;
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
        newHelper.inScoreRank = 0;
        newHelper.inScoreExtraPoint = totalScore;
        newHelper.save();

    }
}

export function organizeRankingsAfterBurn(bp: Blueprint, id: i32): void {
    let bpRankList = RankBPList.load(bp.score.toString());
    if (bpRankList) { // it should be here
        let tempList = bpRankList.bpList;
        if (id === tempList[tempList.length - 1]) {
            tempList.pop();
            store.remove('RankHelperBP', id.toString());
        }
        else {
            let indexOfTheBurned = tempList.indexOf(id);
            for (let index = indexOfTheBurned + 1; index < tempList.length; index++) {
                tempList[indexOfTheBurned] = tempList[index];
                let helperBp = RankHelperBP.load(tempList[index].toString());
                helperBp!.inScoreRank--; // shift everything
                helperBp!.save();
            }
            tempList.pop(); // 
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
