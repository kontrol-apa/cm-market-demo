import {Address, log, store } from "@graphprotocol/graph-ts"
import {UpdateSaleVolumePerScorePoint, removeActivityHistory,updateEmojiPrices,removeEmojiPrices,registerActivity, registerSaleActivity, flagBurnedBlueprintForRefund, decreaseEmojiCount, registerEmojis, getOrCreateStatistics, getBlueprintScoreInterval,addOwnerandUpdateStatistics, removeOwner, getOrCreateEmoji} from "./utils"
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

const MARKETPLACE_ADDRESS:Address = Address.fromString('0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddead') 


const HASAN:Address = new Address(20)
export function handleCreateBidEv(event: CreateBidEv): void {
  let name = event.params.tokenId.toHex() + event.params.bidId.toHex()
  let entity = new Bid(name)
  entity.bidder = event.params.bidder.toHex()
  entity.bidPrice = event.params.bidPrice
  entity.owner = event.params.owner.toHex()
  entity.tokenID = event.params.tokenId
  entity.blueprint = event.params.tokenId.toHex()
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
  let blueprint = new Blueprint(entity.blueprint);
  updateEmojiPrices(blueprint.emojis,entity.price,event.params.tokenId);

}

export function handleCancelListingEv(event: CancelListingEv): void {
  let listing = Listing.load(event.params.tokenId.toHex())
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
}

export function handleUpdateListingEv(event: UpdateListingEv): void {
  let listing = new Listing(event.params.tokenId.toHex())
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
  statistics.totalBlueprint--; //(-2)
  statistics.totalBlueprint--; //(-2)
  flagBurnedBlueprintForRefund(innerBP!);
  flagBurnedBlueprintForRefund(outerBP!);
  removeActivityHistory(innerBP!)
  removeActivityHistory(outerBP!) //TODO might be redundant
  

  store.remove('Blueprints',innerTokenID)
  store.remove('Blueprints',outerTokenID)
  

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
  
  registerEmojis([bp.value0,bp.value1,bp.value2,bp.value3,bp.value4])
  blueprint.emojis = [bp.value0,bp.value1,bp.value2,bp.value3,bp.value4]
  blueprint.emojiString = bp.value0 + bp.value1 + bp.value2 + bp.value3 + bp.value4 
  blueprint.score = bp.value5.toI32()
  blueprint.scoreCategory = getBlueprintScoreInterval(blueprint.score)
  blueprint.owner = event.params.to.toHex()
  blueprint.save()
  statistics.totalBlueprint++;
  statistics.totalEmojiCount = statistics.totalEmojiCount + 5
}
else { // direct transfer to another address
  
  addOwnerandUpdateStatistics(event.params.to,statistics);
  removeOwner(event.params.from,statistics)
  let blueprint = new Blueprint (event.params.id.toHex())
  blueprint.owner = event.params.to.toHex()
  blueprint.save();
  registerActivity(event.params.id,"Transfer",event) 
  event.block.timestamp

  }

  statistics.save()
}




