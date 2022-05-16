import { BidRefundHelper} from "../generated/schema"
import { log, store  } from "@graphprotocol/graph-ts"


export function incrementBidCount(id: string): void {
    let refundHelper = BidRefundHelper.load(id);
    if(!refundHelper){
        refundHelper =  new BidRefundHelper(id);
        refundHelper.bidCount = 1;
        refundHelper.readyForRefund = false;
    }
    else {
        refundHelper.bidCount++;
    }
    refundHelper.save();
}


export function decreaseBidCount(id: string): void {
    let refundHelper = BidRefundHelper.load(id);
    if(!refundHelper){
            log.error("Refund helper doesnt exist! ", [])
    }
    else {
        if(refundHelper.bidCount == 1) {
            store.remove('BidRefundHelper',id);
        }
        else {
            refundHelper.bidCount--;
            refundHelper.save();
        }        
    }

}

export function flagBurnedBlueprintForRefund(id: string) : void {
    let refundHelper = BidRefundHelper.load(id);
    if(refundHelper){
            refundHelper.readyForRefund = true;
    }
}

// the backend will query BidRefundHelper objects periodically and check for readyForRefund = true items,
// those bp ids will be used to query bids (filtered by bp id) and they will be batch refunded
// the ensuing cancelBid event will decrease the count on BidRefundHelper entity and eventually remove it from the store.
// this way the next backend query will not find the same item