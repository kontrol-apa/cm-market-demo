import { Rank, RankingHelper, RankBPList, Blueprint, RankHelperBP, EmojiScoreInfo } from "../generated/schema"
import { log, TypedMap, TypedMapEntry, store, Address } from "@graphprotocol/graph-ts"
import { AlchemyTree } from "../generated/Alchemy/AlchemyTree";
const emojiScoreMapping: TypedMap<string, i32> = new TypedMap;
const AlchemyTreeAddress = Address.fromHexString("0xdead")

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


function getTotalScore(bp: Blueprint): i32 {
    let totalScore = 0;
    for (let index = 0; index < bp.emojis.length; index++) {
        const emoji = bp.emojis[index];
        let emojiTierScore = emojiScoreMapping.get(emoji)
        if (!emojiTierScore) { // not in the cash
            let scoreInfo = EmojiScoreInfo.load(emoji);
            if (!scoreInfo) { // not even in store 
                scoreInfo = new EmojiScoreInfo(emoji);
                let contract = AlchemyTree.bind(AlchemyTreeAddress);
                let element = contract.getElement(emoji);
                scoreInfo.score = element.score.toI32();
                emojiScoreMapping.set(emoji, scoreInfo.score);
                totalScore += scoreInfo.score;
                scoreInfo.save();
            }
            else { // in store but somehow not in cash
                emojiScoreMapping.set(emoji, scoreInfo.score);
                totalScore += scoreInfo.score;
            }
        }
        else { // in cash
            totalScore += emojiTierScore;
        }
    }
    totalScore *= 100; // emoji scores are more important than combined 
    totalScore += bp.combined;
    return totalScore;

}

export function organizeRankingsAfterMint(bp: Blueprint, id: i32): void { // do at mint
    let bpRankList = RankBPList.load(bp.score.toString());
    const totalScore = getTotalScore(bp);
    if (bpRankList) {
        let tempList = bpRankList.bpList;
        tempList.push(tempList[tempList.length - 1]); // add the last element to the end again
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
        bpRankList.bpList = tempList; // reset
        bpRankList.save();
    }
    else {
        let x = new RankBPList(bp.score.toString());
        x.bpList = [id];
        x.save();
        let newHelper = new RankHelperBP(id.toString());
        newHelper.inScoreRank = 0;
        newHelper.inScoreExtraPoint = totalScore;
        newHelper.save();

    }
}

export function organizeRankingsAfterBurn(bp: Blueprint, id: i32) : void {
    let bpRankList = RankBPList.load(bp.score.toString());
    const totalScore = getTotalScore(bp); // calculate TODO
    if (bpRankList) { // it should be here
        let tempList = bpRankList.bpList;
        let i = tempList.indexOf(id);
        for (let index = i + 1; index < tempList.length; index++) {
            tempList[i] = tempList[index];
            let helperBp = RankHelperBP.load(tempList[index].toString())
            helperBp!.inScoreRank--; // shift everything
            helperBp!.save();
        }
        tempList.pop(); // 
        store.remove('RankHelperBP', id.toString());
        bpRankList.bpList = tempList; // reset
        bpRankList.save();
    }
    else {
        log.error("{}", ['Bp rank list missing']);

    }

}
