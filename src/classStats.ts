import {ClassLeaderBoard} from "../generated/schema"
import { BigInt } from "@graphprotocol/graph-ts"

export function updateClassesLeaderBoardAfterMint(BpScore: i32): void {
    let className = getClassName(BpScore);
    let classStats = ClassLeaderBoard.load(className) as ClassLeaderBoard;
    if(classStats == null){ 
        classStats = new ClassLeaderBoard(className);
        classStats.suply = 1;
        classStats.available = 0;
        classStats.avarageSale = BigInt.fromI32(0);
        classStats.totalVolume = BigInt.fromI32(0);
        classStats.save();
    }
    else {
        classStats.suply +=1;
        classStats.save();
    }   
}

export function updateClasseseaderBoardAfterCombine(BpScore: i32): void { 
    let className = getClassName(BpScore);
    let classStats = ClassLeaderBoard.load(className) as ClassLeaderBoard;
    classStats.suply -= 1;
    classStats.save();
    // all of the other stats are not affected since something combinbed can not be on the market hence no floor etc
}

export function updateClassesLeaderBoardAfterSale(BpScore: i32, price: BigInt): void {
    let className = getClassName(BpScore);
    let classStats = ClassLeaderBoard.load(className) as ClassLeaderBoard;
    classStats.totalVolume = classStats.totalVolume.plus(price);
    classStats.avarageSale =  classStats.totalVolume.div(BigInt.fromI32(classStats.suply));
    classStats.available -= 1;
    classStats.save();
    
}

export function updateClassesLeaderBoardAddListing(BpScore: i32, price: BigInt): void { 
    let className = getClassName(BpScore);
    let classStats = ClassLeaderBoard.load(className) as ClassLeaderBoard;
    classStats.available += 1;
    classStats.save();
    // all of the other stats are not affected since something combinbed can not be on the market hence no floor etc
}

export function updateClassesLeaderBoardCancelListing(BpScore: i32, price: BigInt): void { 
    let className = getClassName(BpScore);
    let classStats = ClassLeaderBoard.load(className) as ClassLeaderBoard;
    classStats.available -= 1;
    classStats.save();
    // all of the other stats are not affected since something combinbed can not be on the market hence no floor etc
}

export function getClassName(BpScore: i32): string {
    if (BpScore < 24) {
        return "Common";
    }
    else if(BpScore < 50) { 
        return "Big";    
    }
    else if(BpScore < 75) { 
        return "Epic";
    }
    else if(BpScore < 100) { 
        return "Enormous";
    }
    else {
        return "Colossal";
    }
}
