## Events and Event handlers

### handleCreateBidEv(event: CreateBidEv):

#### Entity Interactions:

1. Bid : sets all the required fields
1. Activity: sets the BP and activity type

#### Statistics 

This event doesn't contribute to any statistics.



### handleCancelBidEv(event: CancelBidEv):

#### Entity Interactions:

1. Bid : removes the bid from the store.
1. Activity: sets the BP and activity type

#### Statistics 

This event doesnt contribute to any statistics.



### handleAcceptBidEv(event: AcceptBidEv):

#### Entity Interactions:

1. Bid : Removes the bid from the store
2. Blueprint: 
   1. Owner field updated with the bidders address 
   2. Derived list of Bids will be automatically updated after the bid is removed from the store. 
3. Owner: 
   1. Bidder address: An owner is created if it doesnt exist and if does, the count is incremented
   2. Original owner: The Blueprint count is decreased and if it reaches 0, the owner is removed from the store.
4. Activity: sets the BP and activity type
5. VolumePerScore: updated with accordingly with score and price.

#### Statistics 

1. Total Volume: is updated with bid's price.
2. Total Owners: updated accordingly with the changes to Owner



### handleAddListingEv(event: AddListingEv):

#### Entity Interactions:

1. Listing: creates a new listing with all the necessary fields.  
   Note: The ownership is transferred to the Marketplace on chain but here we will retain the same ownership.
2. Blueprint: the derivedFrom field will be automatically updated with the listing.
2. Activity: sets the BP and activity type

#### Statistics 

This event doesnt contribute to any statistics.



### handleCancelListingEv(event: CancelListingEv):

#### Entity Interactions:

1. Listing: deletes the listing from the store
2. Blueprint: the corresponding derivedFrom Listing is removed accordingly.
2. Activity: sets the BP and activity type

#### Statistics 

This event doesnt contribute to any statistics.



### handleFulfillListingEv(event: FulfillListingEv):

#### Entity Interactions:

1. Listing: deletes the listing from the store
2. Blueprint: 
   1. The owner field: is updated with the buyers address
   2. the corresponding derivedFrom Listing is removed accordingly.
3. Owner: 
   1. Buyer address: An owner is created if it doesnt exist and if does, the count is incremented
   2. Original owner: The Blueprint count is decreased and if it reaches 0, the owner is removed from the store.
   2. Activity: sets the BP and activity type
4. Activity: sets the BP and activity type
5. VolumePerScore: is updated according to the score

#### Statistics 

1. Total Volume: is updated with bid's price.
2. Total Owners: updated accordingly with the changes to Owner



### handleUpdateListingEv(event: UpdateListingEv):

#### Entity Interactions:

1. Listing: updates the price field with the new price
1. Activity: sets the BP and activity type

#### Statistics 

This event doesnt contribute to any statistics.



### handleCombined(event: Combined):

#### Entity Interactions:

1. Blueprint:
   1. 2 Blueprints (inner & outer) used for combining removed from the store.
   2. The list of bids for each BP will be treated accordingly. 
      Note: TBD: how this will be handled 
2. Bid: 
   1. The Blueprint field will be set to null to indicate a burned BP (TBD, not certain)
   2. The owner field will be set to 0 to indicate a burn (TBD, not certain)
3. Owner:
   1. The owners  count will be decreased by 2 ( The newly minted BP will be handled by `Transfer`)
   2. It is possible that the count will reach zero and and the owner is removed. This will be handled by the `Transfer` (recreate the owner and update statistics)
4. Listing: will not be affected since you cant combine a listed BP
4. The activity log will be removed

#### Statistics 

This event also affects Emoji statistics:

1. The emojis count of the burned bp's are decreased 
2. The total emoji count is updated (-10)



### handleTransfer(event: Transfer):

A transfer can be due to:

1. Market listing (Ignored)

2. Market delisting (Ignored)

3. Market sale & bid accepted (ignored)
4. Burn due to combination (ignored)
5. Direct transfer between users (handled)
6. Mint due to Batchmint & combination(handled)



#### Entity Interactions for minting:

1. Blueprint: will create a new BP and set all attributes accordingly with a contract call
2. Activity: Minted 
3. Owner: count increased or Owner created

#### Statistics for minting

1. Total emoji count increased (+5)
2. Total numer of BP's increased by 1

#### Entity Interactions for transfer:

1. Blueprint: owner updated
2. Activity: transfer 
3. Owner: count increased or Owner created

#### Statistics for minting

Owner count might be affected.



### TODO

* how to display burned bp for bid cancellation 
  * how to handle the bid entity after burn
* handle the edge case for someone actually burning the BP with hand (underflows etc in statistics)
* confirm that only the BP concract is of interest for the Graph
* unit tests
* emoji ordered filtering with fulltext search
* handle the edge case where a bid gets accepted for a listed item: you have to check if this listing exits and remove it as well if it does
  * in this case the contract emits a cancel listing event which gets handled accordingly
