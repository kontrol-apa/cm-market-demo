import {Address, log, store, BigInt } from "@graphprotocol/graph-ts"
import {UpdateSaleVolumePerScorePoint, updateEmojiPrices,removeEmojiPrices, flagBurnedBlueprintForRefund, decreaseEmojiCount, registerEmojis, getOrCreateStatistics,addOwnerandUpdateStatistics, removeOwner} from "./utils"
import {registerActivity, registerSaleActivity, removeActivityHistory } from "./activity"

import {
  CMMarketplace,
  AcceptBidEv,
  AddListingEv,
  CancelBidEv,
  CancelListingEv,
  CreateBidEv,
  FulfillListingEv,
  UpdateListingEv
} from "../generated/CMMarketplace/CMMarketplace"
import {
  BleuprintBurnEv,
  CMBlueprint,
  Combined,
  Transfer
} from "../generated/CMBlueprint/CMBlueprint"

import { Bid, Listing, Blueprint} from "../generated/schema"
import { updateEmojiLeaderBoardsAddListing, updateEmojiLeaderBoardsAfterCombine, updateEmojiLeaderBoardsAfterMint, updateEmojiLeaderBoardsAfterSale, updateEmojiLeaderBoardsCancelListing, updateEmojiLeaderBoardsUpdateListing } from "./emojistats"
import { getClassName, updateClasseseaderBoardAfterCombine, updateClassesLeaderBoardAddListing, updateClassesLeaderBoardAfterMint, updateClassesLeaderBoardAfterSale, updateClassesLeaderBoardCancelListing } from "./classStats"

const MARKETPLACE_ADDRESS:Address = Address.fromString('0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddead') 


export function handleCreateBidEv(event: CreateBidEv): void {
  let name = event.params.tokenId.toHex() + event.params.bidId.toHex()
  let entity = new Bid(name)
  entity.bidder = event.transaction.from.toHex();
  entity.bidPrice = event.params.bidPrice
  entity.owner = event.params.owner.toHex()
  entity.tokenID = event.params.tokenId
  entity.blueprint = event.params.tokenId.toHex()
  entity.bidId =  event.params.bidId;
  entity.save()

}

export function handleCancelBidEv(event: CancelBidEv): void {
  let name = event.params.tokenId.toHex() + event.params.bidId.toHex()
  store.remove('Bid', name)
  
}

export function handleAcceptBidEv(event: AcceptBidEv): void { 
  let name = event.params.tokenId.toHex() + event.params.bidId.toHex()
  let blueprint = Blueprint.load(event.params.tokenId.toHex())
  let bid = Bid.load(name)
  if(blueprint){
    blueprint.owner = event.transaction.from.toHex();
    UpdateSaleVolumePerScorePoint(blueprint.score,bid!.bidPrice);
    blueprint.save()
  }
  let statistics = getOrCreateStatistics();
  statistics.totalVolume = statistics.totalVolume.plus(bid!.bidPrice);

  removeOwner(Address.fromString(bid!.owner), statistics) 
  addOwnerandUpdateStatistics(event.transaction.from, statistics) 
  statistics.save()

  store.remove('Bid', name)
  
}

//    event AddListingEv(uint256 listingId, uint256 indexed tokenId, uint256 price);
export function handleAddListingEv(event: AddListingEv): void {
  let entity = new Listing(event.params.tokenId.toHex())
  entity.price = event.params.price
  entity.owner = event.transaction.from.toHex()
  entity.tokenID = event.params.tokenId
  entity.blueprint = event.params.tokenId.toHex()
  entity.save()
  registerSaleActivity(event.params.tokenId,"Listing",event,event.params.price);
  let blueprint = Blueprint.load(entity.blueprint);
  updateEmojiPrices(blueprint!.emojis,entity.price,event.params.tokenId);
  updateEmojiLeaderBoardsAddListing(blueprint!.emojis, entity.price);
  updateClassesLeaderBoardAddListing(blueprint!.score, entity.price);

}

export function handleCancelListingEv(event: CancelListingEv): void {
  let listing = Listing.load(event.params.tokenId.toHex())
  let blueprint = new Blueprint(listing!.blueprint);
  removeEmojiPrices(blueprint.emojis,event.params.tokenId); // the order might matter
  updateEmojiLeaderBoardsCancelListing(blueprint.emojis,listing!.price);
  updateClassesLeaderBoardCancelListing(blueprint.score, listing!.price);
  store.remove('Listing', event.params.tokenId.toHex())

}

export function handleFulfillListingEv(event: FulfillListingEv): void {
  let listing = Listing.load(event.params.tokenId.toHex()) 
  let statistics = getOrCreateStatistics();
  statistics.totalVolume = statistics.totalVolume.plus(listing!.price);
  let blueprint = new Blueprint(listing!.blueprint);
  blueprint.owner = event.transaction.from.toHex() 
  removeOwner(Address.fromString(listing!.owner), statistics) 
  addOwnerandUpdateStatistics(event.transaction.from, statistics) 
  blueprint.save()
  statistics.save()
  UpdateSaleVolumePerScorePoint(blueprint.score,listing!.price);
  registerSaleActivity(event.params.tokenId,"Sale",event,event.params.price);
  store.remove('Listing', event.params.tokenId.toHex())
  removeEmojiPrices(blueprint.emojis,event.params.tokenId);
  updateEmojiLeaderBoardsAfterSale(blueprint.emojis,listing!.price);
  updateClassesLeaderBoardAfterSale(blueprint.score,listing!.price);
  
}

export function handleUpdateListingEv(event: UpdateListingEv): void {
  let listing = new Listing(event.params.tokenId.toHex())
  let blueprint = Blueprint.load(listing.blueprint);

  updateEmojiPrices(blueprint!.emojis,event.params.price,event.params.tokenId);
  updateEmojiLeaderBoardsUpdateListing(blueprint!.emojis,listing.price);
  listing.price = event.params.price
  listing.save()

}

export function handleCombined(event: Combined): void {
  let innerTokenID = event.params.inner.toHex()
  let outerTokenID = event.params.outer.toHex()
  let mintedTokenID = event.params.tokenId

  let statistics = getOrCreateStatistics()
  let innerBP = Blueprint.load(innerTokenID)
  let outerBP = Blueprint.load(outerTokenID)
  innerBP!.emojis.forEach(element => { 
    decreaseEmojiCount(element)
  });
  outerBP!.emojis.forEach(element => {
    decreaseEmojiCount(element)
  });
  removeOwner(event.params.from, statistics)
  removeOwner(event.params.from, statistics) // 2 BPs burned
  addOwnerandUpdateStatistics(event.params.from,statistics) // a new BP added
  statistics.totalBlueprint--; //(-1)
  statistics.totalBlueprint--; //(-2)
  flagBurnedBlueprintForRefund(innerBP!);
  flagBurnedBlueprintForRefund(outerBP!);
  removeActivityHistory(innerBP!)
  removeActivityHistory(outerBP!) //TODO might be redundant
  updateEmojiLeaderBoardsAfterCombine(innerBP!.emojis);
  updateEmojiLeaderBoardsAfterCombine(outerBP!.emojis);
  updateClasseseaderBoardAfterCombine(innerBP!.score);
  updateClasseseaderBoardAfterCombine(outerBP!.score);


  store.remove('Blueprints',innerTokenID)
  store.remove('Blueprints',outerTokenID)
  
  let totalCombined:i32 = 0;
  if(innerBP!.combined){
    totalCombined += innerBP!.combined;
  }
  if(outerBP!.combined){
    totalCombined += outerBP!.combined;
  }
  if(totalCombined == 0) {
    totalCombined = 2;
  }
  let mintedBp = new Blueprint(mintedTokenID.toHex());
  mintedBp.combined = totalCombined;
  mintedBp.save();

  //the BP mint will be handled by transfer
  statistics.totalEmojiCount = statistics.totalEmojiCount - 10
  statistics.save()
}


export function handleTransfer(event: Transfer): void {
// 1. ignore any transfer to and from the marketplace 2. ignore any burn / combine
  if(event.params.to.equals(MARKETPLACE_ADDRESS) || event.params.from.equals(MARKETPLACE_ADDRESS) || event.params.to.equals(Address.zero()) ){
    return;
  }
  let statistics = getOrCreateStatistics();
if(event.params.from.equals(Address.zero())) { // minted
  
  let blueprint = new Blueprint(event.params.id.toHex())  
  /** Contract Calls **/
  let contract = CMBlueprint.bind(event.address)
  let bp = contract.getTokenAttributes(event.params.id)
  addOwnerandUpdateStatistics(event.params.to,statistics);
  
  registerEmojis([bp.value0,bp.value1,bp.value2,bp.value3,bp.value4]) // might be redundant 
  blueprint.emojis = [bp.value0,bp.value1,bp.value2,bp.value3,bp.value4]
  blueprint.emojiString = bp.value0 + bp.value1 + bp.value2 + bp.value3 + bp.value4 
  blueprint.score = bp.value5.toI32()
  blueprint.scoreCategory = getClassName(blueprint.score)
  blueprint.owner = event.params.to.toHex()
  blueprint.save()
  statistics.totalBlueprint++;
  statistics.totalEmojiCount = statistics.totalEmojiCount + 5
  updateEmojiLeaderBoardsAfterMint(blueprint.emojis );
  updateClassesLeaderBoardAfterMint(blueprint.score);
}
else { // direct transfer to another address
  
  addOwnerandUpdateStatistics(event.params.to,statistics);
  removeOwner(event.params.from,statistics)
  let blueprint = new Blueprint (event.params.id.toHex())
  blueprint.owner = event.params.to.toHex()
  blueprint.save();
  registerActivity(event.params.id,"Transfer",event) 
  }

  statistics.save()
}



