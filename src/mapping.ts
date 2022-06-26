import { Address, log, store, BigInt } from "@graphprotocol/graph-ts"
import { UpdateSaleVolumePerScorePoint, getOrCreateStatistics, addOwnerandUpdateStatistics, removeOwner, updateEmojiPricesList, removeEmojiPricesList } from "./utils"
import { registerPlaceBidActivity, registerActivity, registerAcceptBidActivity, registerUpdateBidActivity, registerAddListingActivity, registerFullfillActivity, removeActivityHistory,registerUpdateListingActivity, registerCancelListingActivity, registerCancelBidActivity} from "./activity"
import { fixCombinedScore, getTotalScore, organizeRankingsAfterBurn, organizeRankingsAfterMint, updateRankingAfterBurn, updateRankingAfterMint } from "./ranking"
import {
  AcceptBidEv,
  AddListingEv,
  CancelBidEv,
  CancelListingEv,
  CreateBidEv,
  FulfillListingEv,
  UpdateListingEv,
  UpdateBidEv
} from "../generated/CloudMetropolisMarket/CloudMetropolisMarket"
import {
  CMBlueprint,
  Combined,
  Transfer
} from "../generated/CMBlueprint/CMBlueprint"

import { Bid, Blueprint} from "../generated/schema"
import { updateEmojiLeaderBoardsAfterAcceptBid, updateEmojiLeaderBoardsAddListing, updateEmojiLeaderBoardsAfterCombine, updateEmojiLeaderBoardsAfterMint, updateEmojiLeaderBoardsAfterSale, updateEmojiLeaderBoardsCancelListing, updateEmojiLeaderBoardsUpdateListing } from "./emojistats"
import { updateClassesLeaderBoardAfterAcceptBid, getClassName, updateClasseseaderBoardAfterCombine, updateClassesLeaderBoardAddListing, createClassesLeaderBoardAfterMint, updateClassesLeaderBoardAfterSale, updateClassesLeaderBoardCancelListing } from "./classStats"
import { decreaseBidCount, flagBurnedBlueprintForRefund, incrementBidCount } from "./refundHelper"
import { RoleRevoked } from "../generated/CMBlueprint/AlchemyTree"

const MARKETPLACE_ADDRESS: Address = Address.fromString('0x150Ce3479d786cD0d5e79Bb2e187F5D4639d1563')


export function handleCreateBidEv(event: CreateBidEv): void {
  let name = event.params.tokenId.toHex() + event.transaction.from.toHex()
  let entity = new Bid(name)
  entity.bidder = event.transaction.from.toHex();
  entity.bidPrice = event.params.bidPrice
  entity.owner = event.params.owner.toHex()
  entity.tokenID = event.params.tokenId
  entity.blueprint = event.params.tokenId.toHex();
  incrementBidCount(event.params.tokenId.toHex());
  let bp = Blueprint.load(event.params.tokenId.toHex());
  if(bp){
    bp.hasBids = true;
    bp.save();
  }
  registerPlaceBidActivity(event);
  entity.save()

}

export function handleCancelBidEv(event: CancelBidEv): void {
  let name = event.params.tokenId.toHex() + event.transaction.from.toHex()
  const canceledBid = Bid.load(name);
  if(canceledBid){
    const remaining = decreaseBidCount(event.params.tokenId.toHex());
    if(remaining == 0){
      let bp = Blueprint.load(event.params.tokenId.toHex());
      if(bp){
        bp.hasBids = false;
        bp.save();
      }
    }
    registerCancelBidActivity(event);
  }
  else {
    log.error('{}',['Canceled Bid Doesnt Exist']);
  }

  store.remove('Bid', name)

}


export function handleUpdateBidEv(event: UpdateBidEv): void {
  let name = event.params.tokenId.toHex() + event.transaction.from.toHex()
  let bid = Bid.load(name);
  bid!.bidPrice = event.params.bidPrice;
  registerUpdateBidActivity(event);
  bid!.save()
  
}



export function handleAcceptBidEv(event: AcceptBidEv): void {
  let name = event.params.tokenId.toHex() + event.params.buyer.toHex();
  let blueprint = Blueprint.load(event.params.tokenId.toHex())
  let bid = Bid.load(name)
  if (blueprint) {
    blueprint.owner = event.transaction.from.toHex();
    UpdateSaleVolumePerScorePoint(blueprint.score, bid!.bidPrice);
    
  }
  let statistics = getOrCreateStatistics();
  statistics.totalVolume = statistics.totalVolume.plus(bid!.bidPrice);
  removeOwner(Address.fromString(bid!.owner), statistics)
  addOwnerandUpdateStatistics(event.params.buyer, statistics);
  statistics.save()
  registerAcceptBidActivity(event, bid!.bidPrice);
  updateEmojiLeaderBoardsAfterAcceptBid(blueprint!.emojis, bid!.bidPrice);
  updateClassesLeaderBoardAfterAcceptBid(blueprint!.score, bid!.bidPrice);
  const remaining = decreaseBidCount(event.params.tokenId.toHex());
  if(remaining == 0){
    let bp = Blueprint.load(event.params.tokenId.toHex());
    if(bp){
      bp.hasBids = false;
      bp.save();
    }
  }
  store.remove('Bid', name)

}

//    event AddListingEv(uint256 listingId, uint256 indexed tokenId, uint256 price);
export function handleAddListingEv(event: AddListingEv): void {
  registerAddListingActivity(event);
  let blueprint = Blueprint.load(event.params.tokenId.toHex());
  blueprint!.listed = true;
  blueprint!.price = event.params.price;
  blueprint!.save();
  updateEmojiPricesList(blueprint!.emojis,  event.params.price)
  updateEmojiLeaderBoardsAddListing(blueprint!.emojis, event.params.price);
  updateClassesLeaderBoardAddListing(blueprint!.score, event.params.price);

}

export function handleCancelListingEv(event: CancelListingEv): void {
  let blueprint = Blueprint.load(event.params.tokenId.toHex());
  blueprint!.listed = false;
  const oldPrice = blueprint!.price;
  blueprint!.price = BigInt.zero();
  removeEmojiPricesList(blueprint!.emojis,oldPrice);
  updateEmojiLeaderBoardsCancelListing(blueprint!.emojis, oldPrice);
  updateClassesLeaderBoardCancelListing(blueprint!.score, oldPrice);
  registerCancelListingActivity(event);
  blueprint!.save();

}

export function handleFulfillListingEv(event: FulfillListingEv): void {
  let statistics = getOrCreateStatistics();
  let blueprint = Blueprint.load(event.params.tokenId.toHex());
  const oldPrice = blueprint!.price;
  statistics.totalVolume = statistics.totalVolume.plus(oldPrice);
  blueprint!.listed = false;
  blueprint!.price = BigInt.zero();
  blueprint!.owner = event.transaction.from.toHex();
  removeOwner(Address.fromString(blueprint!.owner), statistics)
  addOwnerandUpdateStatistics(event.transaction.from, statistics)
  blueprint!.save()
  statistics.save()
  removeEmojiPricesList(blueprint!.emojis, oldPrice);
  UpdateSaleVolumePerScorePoint(blueprint!.score, oldPrice);
  registerFullfillActivity(event, blueprint!.owner);
  updateEmojiLeaderBoardsAfterSale(blueprint!.emojis, oldPrice);
  updateClassesLeaderBoardAfterSale(blueprint!.score, oldPrice);

}

export function handleUpdateListingEv(event: UpdateListingEv): void {
    let blueprint = Blueprint.load(event.params.tokenId.toHex());
    const oldPrice = blueprint!.price;
    blueprint!.price = event.params.price;
    blueprint!.save();
    removeEmojiPricesList(blueprint!.emojis,oldPrice);
    updateEmojiPricesList(blueprint!.emojis, event.params.price);
    updateEmojiLeaderBoardsUpdateListing(blueprint!.emojis, event.params.price);
    registerUpdateListingActivity(event);

}

export function handleCombined(event: Combined): void {

  let innerTokenID = event.params.inner.toHex()
  let outerTokenID = event.params.outer.toHex()
  let mintedTokenID = event.params.tokenId

  let statistics = getOrCreateStatistics()
  let innerBP = Blueprint.load(innerTokenID)
  let outerBP = Blueprint.load(outerTokenID)
  removeOwner(event.params.from, statistics)
  removeOwner(event.params.from, statistics) // 2 BPs burned
  addOwnerandUpdateStatistics(event.params.from, statistics) // a new BP added
  statistics.totalBlueprint--; //(-1)
  statistics.totalBlueprint--; //(-2)
  flagBurnedBlueprintForRefund(innerBP!.id);
  flagBurnedBlueprintForRefund(outerBP!.id);
  removeActivityHistory(innerBP!)
  removeActivityHistory(outerBP!) //TODO might be redundant
  updateEmojiLeaderBoardsAfterCombine(innerBP!.emojis);
  updateEmojiLeaderBoardsAfterCombine(outerBP!.emojis);
  updateClasseseaderBoardAfterCombine(innerBP!.score);
  updateClasseseaderBoardAfterCombine(outerBP!.score);
  updateRankingAfterBurn(innerBP!.score);
  updateRankingAfterBurn(outerBP!.score);
  organizeRankingsAfterBurn(innerBP!, i32(parseInt(innerBP!.id)));
  organizeRankingsAfterBurn(outerBP!, i32(parseInt(outerBP!.id)));
  

  let totalCombined = innerBP!.combined + outerBP!.combined + 1;
  let mintedBp = Blueprint.load(mintedTokenID.toHex());
  if (mintedBp) {
    mintedBp.combined = totalCombined;
    mintedBp.totalScore += totalCombined; 
    mintedBp.save();
    fixCombinedScore(mintedBp,I32.parseInt(mintedBp.id));

  }
  else {
    log.error("Unexpected null entity at {}", ['Combine'])
  }
  statistics.totalEmojiCount = statistics.totalEmojiCount - 10
  store.remove('Blueprint', innerTokenID)
  store.remove('Blueprint', outerTokenID)

  statistics.save()
}


export function handleTransfer(event: Transfer): void {
  // 1. ignore any transfer to and from the marketplace 2. ignore any burn / combine
  if (event.params.to.equals(MARKETPLACE_ADDRESS) || event.params.from.equals(MARKETPLACE_ADDRESS) || event.params.to.equals(Address.zero())) {
    return;
  }
  let statistics = getOrCreateStatistics();
  if (event.params.from.equals(Address.zero())) { // minted

    let blueprint = new Blueprint(event.params.id.toHex())
    /** Contract Calls **/
    let contract = CMBlueprint.bind(event.address)
    let bp = contract.getTokenAttributes(event.params.id)
    blueprint.emojisWithFEOF = [bp.value0, bp.value1, bp.value2, bp.value3, bp.value4];
    addOwnerandUpdateStatistics(event.params.to, statistics);
    const e1 = bp.value0.replace('\u{fe0f}', '');
    const e2 = bp.value1.replace('\u{fe0f}', '');
    const e3 = bp.value2.replace('\u{fe0f}', '');
    const e4 = bp.value3.replace('\u{fe0f}', '');
    const e5 = bp.value4.replace('\u{fe0f}', '');
    blueprint.emojiString = e1 + e2 + e3 + e4 + e5;
    blueprint.emojis = [e1,e2,e3,e4,e5];
    blueprint.numericId = event.params.id.toI32();

    updateEmojiLeaderBoardsAfterMint([e1, e2, e3, e4, e5]);

    blueprint.emojiStringParsed = e1 + e2 + e3 + e4 + e5;
    blueprint.searchString = '+' + e1 + e2 + e3 + e4 + e5 + '+';
    blueprint.searchString += e5 + e1 + e2 + e3 + e4 + '+';
    blueprint.searchString += e4 + e5 + e1 + e2 + e3 + '+';
    blueprint.searchString += e3 + e4 + e5 + e1 + e2 + '+';
    blueprint.searchString += e2 + e3 + e4 + e5 + e1 + '+';

    blueprint.score = bp.value5.toI32()
    blueprint.hasBids = false;
    blueprint.listed = false;
    blueprint.price = BigInt.zero();
    updateRankingAfterMint(bp.value5.toI32());

    blueprint.scoreCategory = getClassName(blueprint.score)
    blueprint.owner = event.params.to.toHex()
    blueprint.combined = 0;
    organizeRankingsAfterMint(blueprint, i32(parseInt(blueprint.id)))
    blueprint.totalScore = blueprint.score * 1000 + getTotalScore(blueprint);
    blueprint.save()
    statistics.totalBlueprint++;
    statistics.totalEmojiCount = statistics.totalEmojiCount + 5
    
    createClassesLeaderBoardAfterMint(blueprint.score);
  }
  else { // direct transfer to another address

    addOwnerandUpdateStatistics(event.params.to, statistics);
    removeOwner(event.params.from, statistics)
    let blueprint = Blueprint.load(event.params.id.toHex())
    if (blueprint) {
      blueprint.owner = event.params.to.toHex()
      blueprint.save();
    }
    else {
      log.error("{}", ['Unexpected null entity at Transfer'])
    }
    registerActivity(event.params.id, "Transfer", event)
  }

  statistics.save()
}
