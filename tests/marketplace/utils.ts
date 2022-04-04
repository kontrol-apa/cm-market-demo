import { Address, ethereum, BigInt } from "@graphprotocol/graph-ts"
import { newMockEvent } from "matchstick-as/assembly/index"
import { CreateBidEv, CancelBidEv } from "../../generated/test_market/test_market"


export function handleNewBids(events: CreateBidEv[]): void {
  events.forEach(event => {
      handleCreateBidEv(event)
  })
}


export function createNewBidEvent(bidId: i32, owner: Address, bidder: Address, tokenId: i32, price: i32): CreateBidEv {
    let newBidEvent = changetype<CreateBidEv>(newMockEvent())
    newBidEvent.parameters = new Array()
    let tokenIDParam = new ethereum.EventParam("tokenId", ethereum.Value.fromI32(tokenId))
    let bidIdParam = new ethereum.EventParam("bidId", ethereum.Value.fromI32(bidId))
    let priceParam = new ethereum.EventParam("bidPrice", ethereum.Value.fromI32(price))
    let bidderParam = new ethereum.EventParam("bidder", ethereum.Value.fromAddress(bidder))
    let ownerParam = new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))

    newBidEvent.parameters.push(tokenIDParam)
    newBidEvent.parameters.push(bidIdParam)
    newBidEvent.parameters.push(priceParam)
    newBidEvent.parameters.push(bidderParam)
    newBidEvent.parameters.push(ownerParam)

    return newBidEvent
}

export function createCancelBidEv(bidId: i32, tokenId: i32): CancelBidEv {
  let newCancelBidEvent = changetype<CancelBidEv>(newMockEvent())
  newCancelBidEvent.parameters = new Array()
  let bidIdParam = new ethereum.EventParam("bidId", ethereum.Value.fromI32(bidId))
  let tokenIDParam = new ethereum.EventParam("tokenId", ethereum.Value.fromI32(tokenId))
  newCancelBidEvent.parameters.push(bidIdParam)
  newCancelBidEvent.parameters.push(tokenIDParam)
  return newCancelBidEvent
}


