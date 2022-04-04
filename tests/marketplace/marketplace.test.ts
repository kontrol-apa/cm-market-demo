import { clearStore, test, assert, countEntities } from 'matchstick-as/assembly/index'
import { Bid } from '../../generated/schema'
import { Address, BigInt, Bytes, ethereum, store, Value } from "@graphprotocol/graph-ts"
import {createNewBidEvent, handleNewBids, createCancelBidEv} from "./utils"
import {handleCreateBidEv, handleCancelBidEv} from '../../src/mapping'
export {handleCreateBidEv, handleCancelBidEv};

test("Can assert amount of entities of a certain type in store", () => {
  clearStore()
  assert.entityCount('Bid', 0)

  let counter = 1
  while (countEntities('Bid') < 2) {
    let newBid = new Bid("id" + counter.toString())
    newBid.save()
    counter++
  }

  
})


test("Cancel assert if handle event works", () => {
  clearStore()
  let bidID = 0xdead
  let tokenId = 0xdead
  let newBid = new Bid("0xdead0xdead")
  newBid.save()
  let newBidEv = createCancelBidEv(bidID,tokenId)
  handleCancelBidEv(newBidEv)
  

})


test("Can assert if handle event works", () => {
  clearStore()
  let bidID = 0xdead
  let owner = '0xc135009C21291D72564737f276F41EE653F5c7C0'
  let bidder = '0xc135009C21291D72564737f276F41EE653F5c7C0'
  let owner2 = Address.fromString('0xc135009C21291D72564737f276F41EE653F5c7C0')
  let bidder2 = Address.fromString('0xc135009C21291D72564737f276F41EE653F5c7C0') 
  let tokenId = 0xdead
  let price = 0xdead
  let newBidEv = createNewBidEvent(bidID,owner2,bidder2,tokenId,price)
  assert.addressEquals(Address.fromString('0xc135009C21291D72564737f276F41EE653F5c7C0'), newBidEv.params.owner)
  handleCreateBidEv(newBidEv)
  let id = newBidEv.params.tokenId.toHex() + newBidEv.params.bidId.toHex()
  assert.addressEquals(Address.fromString('0xc135009C21291D72564737f276F41EE653F5c7C0'), newBidEv.params.owner)
  let temp = 0xdead
  let temp2: string  = temp.toString()
  assert.fieldEquals('Bid', id, "tokenID", temp2)
  assert.fieldEquals('Bid', id, "owner", '0xc135009C21291D72564737f276F41EE653F5c7C0'.toLowerCase())
  assert.entityCount('Bid', 1)
  //assert.notInStore('Bid')
})
