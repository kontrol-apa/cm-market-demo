import { Blueprint,Activity} from "../generated/schema"
import { ethereum,  BigInt, store,  } from "@graphprotocol/graph-ts"

export function registerActivity(tokenID: BigInt, eventName: string, event: ethereum.Event ): void {
    let activity = new Activity(event.transaction.hash.toHex()+ tokenID.toHex())
    activity.blueprint = tokenID.toHex()
    activity.name = eventName
    activity.from = event.transaction.from.toHex()
    activity.to = event.transaction.to!.toHex()
    activity.date = event.block.timestamp
    activity.save()

}

export function registerSaleActivity(tokenID: BigInt, eventName: string, event: ethereum.Event, price:BigInt ): void {
    let activity = new Activity(event.transaction.hash.toHex()+ tokenID.toHex())
    activity.blueprint = tokenID.toHex()
    activity.name = eventName
    activity.from = event.transaction.from.toHex()
    activity.to = event.transaction.to!.toHex()
    activity.date = event.block.timestamp
    activity.save()

}

export function removeActivityHistory(blueprint: Blueprint): void {
    blueprint.history!.forEach(activity => {
        store.remove('Activity',activity)
    });

}