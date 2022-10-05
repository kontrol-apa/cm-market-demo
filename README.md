### Getting Started

You need to install the the graph CLI:

```
npm install -g @graphprotocol/graph-cli
```

or check the official [documentation](https://thegraph.com/docs/en/cookbook/quick-start/).

### Build

```
npm install # install deps
npm run codegen # run after updating schemas & abis
npm run build # you have run after every update to mappings

```

### Testnet deployment

The current testnet setup is on the public hosted service: https://thegraph.com/hosted-service/subgraph/kontrol-apa/cm-market-demo.

You can update it by doing `graph deploy kontrol-apa/cm-market-demo` but this will require an access token. Instead of this, you can redeploy it with you own account by following the guide here: https://thegraph.com/docs/en/deploying/deploying-a-subgraph-to-hosted/.

### Adjustments after a new contract deployment

1. Edit the `subgraph.yaml`file for each contract:
   1. `address: "..."` 
   2. `network: fuji` if its deployed to a new network
   3. `startBlock: 13609492`

### Mainnet deployment

For the mainnet deployment you will need to perform the steps mentioned above and rename the old (testnet) `subgraph.yaml` file to `subgraph.fuji.yaml` for later use.

### Graph Node

For performance reasons, its recommended to run a dedicated graph node on a server. For our use case we have tried our scripts on an Ubuntu machine. You would first setup your node and then attach the subgraph to this node.

#### Setup Node

You can run the setup script under `/graph-node` as:

```
bash setup-graph-node.sh mainnet

## or for testnet

bash setup-graph-node.sh testnet
```

The script is very straightforward and the only difference between `mainnet` and `testnet` is the rpc-url. The script will download and run the graph node in a docker container.

#### Setup Subgraph

```
bash setup-subgraph.sh mainnet

## or for testnet

bash setup-subgraph.sh testnet
```

The script is very straightforward and the only difference between `mainnet` and `testnet` is the `subgraph.yaml` file. The test net setup expects to find a `subgraph.fuji.yaml` so rename your `.yaml` file accordingly. 

#### Diagnostics  

There is a Prometheus instance running on the node. You can check the indexing status with:

```
curl -g 'http://localhost:8040'
```

 #### Querying the node

Following the steps above will get you a working node instance which you can query. You can simply check and query entities from:

```
http://localhost:8000/subgraphs/name/cm/mainnet # or testnet depending on your node setup
```

https://thegraph.com/docs/en/hosted-service/deploy-subgraph-hosted/#redeploying-a-subgraph

### Proposed Work Flow

1. Deploy a node to a server with the current testnet setup
2. Run the FE with this node
3. Apply the same process for the mainnet deployment. 



### Caveats 

1. If a subgraph is redeployed and if it is supposed to start indexing from an old block number, it might take a long time. It eventually catches up and then indexing isn't resource intensive. The indexing process is not parallelized so increasing the resources will not contribute much. 
2. The bottleneck is usually the rpc node. For Avalanche. the public rpc node seems to be performing better than paid services like Moralis etc. For better performance, it is possible to run a local avalanche node and query this from the graph node but we havent tested this.
3. The node caches the queries. It might be a good idea to increase the cache size for better performance.
4. We are using a 4 CPU, 8 gb ram, 80 gb ssd AWS ubuntu 20.04 machine for our node. This seems to be an overkill and we could have dont with less CPU for sure. That being said, we recommend having more storage space since the graph node seems to fill it up relatively fast.  
