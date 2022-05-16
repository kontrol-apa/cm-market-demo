import { Rank,RankingHelper} from "../generated/schema"
import { log  } from "@graphprotocol/graph-ts"

export function updateRankingAfterMint(score: i32): void {
    let helper = createOrGetRankingHelper(score);
    if (score > helper.rankingCount) { // create in between
        for(let i= helper.rankingCount; score >= i; ++i){
            createRanking(i);
        }
        helper.rankingCount = score;
        helper.save();
    }
    let rank = Rank.load(score.toString());
    if(rank){
        rank.count +=1;
        rank.save();
    }
    else {
        log.error("Rank empty!",[]);
    }

}

export function updateRankingAfterBurn(score: i32): void{
    let rank = Rank.load(score.toString());
    if(rank){
        rank.count -=1;
        rank.save();
    }
    else {
        log.error("Rank on burn empty!",[]);
    }

}

function createOrGetRankingHelper(score: i32): RankingHelper {
    let helper = RankingHelper.load('rankingHelper');
    if(!helper){
        helper = new RankingHelper('rankingHelper');
        helper.rankingCount = 0;
        helper.save();
    }
    return helper;
}

function createRanking(score: i32) :void {
    let rank = Rank.load(score.toString());
    if(rank) {
        log.error("Rank already exists", []);
    }
    else {
        rank = new Rank (score.toString());
        rank.count = 0;
        rank.score = score;
        rank.save();
    }
}