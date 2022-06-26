import { Stat, Owner } from "../generated/schema"
import { Address, BigInt, store } from "@graphprotocol/graph-ts"

export function getOrCreateStatistics(): Stat {

    let statistics = Stat.load('stats');
    if (statistics == null) {
        statistics = new Stat('stats');
        statistics.totalOwners = 0;
        statistics.totalVolume = BigInt.zero()
        statistics.totalBlueprint = 0;
        statistics.totalEmojiCount = 0;
        statistics.save();
    }

    return statistics

}


export function addOwnerandUpdateStatistics(ownerAdress: Address, statistics: Stat): void {

    let owner = Owner.load(ownerAdress.toHex())
    if (owner == null) { // if the owner doesnt exist already, statistics need to be updated
        owner = new Owner(ownerAdress.toHex()) //TODO Owners should have a reverse look up list of owners
        statistics.totalOwners++;
        owner.numberOfBlueprints = 1;
    }
    else {
        owner.numberOfBlueprints++;
    }
    owner.save();
}

// combining or transfering doesnt reduce the owner count
export function removeOwner(ownerAdress: Address, statistics: Stat): void {

    let sender = Owner.load(ownerAdress.toHex())
    if (sender != null) {
        sender.numberOfBlueprints--;
        if (sender.numberOfBlueprints == 0) {
            statistics.totalOwners--;
            store.remove('Owner', ownerAdress.toHex())
        }
        else {
            sender.save();
        }
    }

}





