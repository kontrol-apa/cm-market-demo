import { Blueprint,Activity} from "../generated/schema"
import { ethereum,  BigInt, store,  } from "@graphprotocol/graph-ts"
import { AcceptBidEv, AddListingEv, CancelBidEv, CancelListingEv, CreateBidEv, FulfillListingEv, UpdateBidEv, UpdateListingEv } from "../generated/CMMarketplace/CMMarketplace"

export function registerActivity(tokenID: BigInt, eventName: string, event: ethereum.Event ): void {
    let activity = new Activity(event.transaction.hash.toHex()+ tokenID.toHex())
    activity.blueprint = tokenID.toHex()
    activity.name = eventName
    activity.from = event.transaction.from.toHex()
    activity.to = event.transaction.to!.toHex()
    activity.date = event.block.timestamp
    activity.save()

}

export function registerFullfillActivity(event: FulfillListingEv, to:string): void {
    let activity = new Activity(event.transaction.hash.toHex()+ event.params.tokenId.toHex())
    activity.blueprint = event.params.tokenId.toHex()
    activity.eventCategory = "Listing";
    activity.date = event.block.timestamp
    activity.name = "Fulfill Listing"
    activity.from = event.transaction.from.toHex()
    activity.txHash = event.transaction.hash;
    activity.to = to
    activity.price = event.params.price;
    activity.save()

}


export function registerCancelListingActivity(event: CancelListingEv): void {
    let activity = new Activity(event.transaction.hash.toHex()+ event.params.tokenId.toHex())
    activity.blueprint = event.params.tokenId.toHex()
    activity.eventCategory = "Listing";
    activity.date = event.block.timestamp
    activity.name = "Cancel Listing"
    activity.from = event.transaction.from.toHex()
    activity.txHash = event.transaction.hash;
    activity.save()

}


export function registerUpdateListingActivity(event: UpdateListingEv): void {
    let activity = new Activity(event.transaction.hash.toHex()+ event.params.tokenId.toHex())
    activity.blueprint = event.params.tokenId.toHex()
    activity.eventCategory = "Listing";
    activity.date = event.block.timestamp
    activity.name = "Update Listing";
    activity.from = event.transaction.from.toHex()
    activity.txHash = event.transaction.hash;
    activity.price = event.params.price;
    activity.save()

}

export function registerAddListingActivity(event: AddListingEv): void {
    let activity = new Activity(event.transaction.hash.toHex()+ event.params.tokenId.toHex())
    activity.blueprint = event.params.tokenId.toHex()
    activity.eventCategory = "Listing";
    activity.date = event.block.timestamp
    activity.name = "Add Listing"
    activity.from = event.transaction.from.toHex()
    activity.txHash = event.transaction.hash;
    activity.price = event.params.price;
    activity.save()

}


export function registerPlaceBidActivity (event: CreateBidEv): void {
    let activity = new Activity(event.transaction.hash.toHex() + event.params.tokenId.toHex() + 'b')
    activity.blueprint = event.params.tokenId.toHex()
    activity.eventCategory = "Bid";
    activity.date = event.block.timestamp
    activity.name = "Place Bid"
    activity.from = event.transaction.from.toHex()
    activity.txHash = event.transaction.hash;
    activity.price = event.params.bidPrice;
    activity.save()

}

export function registerCancelBidActivity (event: CancelBidEv): void {
    let activity = new Activity(event.transaction.hash.toHex() + event.params.tokenId.toHex() + 'b')
    activity.blueprint = event.params.tokenId.toHex()
    activity.eventCategory = "Bid";
    activity.date = event.block.timestamp
    activity.name = "Cancel Bid"
    activity.from = event.transaction.from.toHex()
    activity.txHash = event.transaction.hash;
    activity.save()

}

export function registerUpdateBidActivity (event: UpdateBidEv): void {
    let activity = new Activity(event.transaction.hash.toHex() + event.params.tokenId.toHex() + 'b')
    activity.blueprint = event.params.tokenId.toHex()
    activity.eventCategory = "Bid";
    activity.date = event.block.timestamp
    activity.name = "Update Bid"
    activity.from = event.transaction.from.toHex()
    activity.txHash = event.transaction.hash;
    activity.price = event.params.bidPrice;
    activity.save()

}

export function registerAcceptBidActivity (event: AcceptBidEv, price:BigInt): void {
    let activity = new Activity(event.transaction.hash.toHex() + event.params.tokenId.toHex() + 'b')
    activity.blueprint = event.params.tokenId.toHex()
    activity.eventCategory = "Bid";
    activity.date = event.block.timestamp
    activity.name = "Accept Bid"
    activity.from = event.transaction.from.toHex()
    activity.txHash = event.transaction.hash;
    activity.price = price;
    activity.save()

}



export function removeActivityHistory(blueprint: Blueprint): void {
    if(blueprint.history){
    blueprint.history!.forEach(activity => {
        store.remove('Activity',activity)
    });
    }
}