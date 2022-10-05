#!/usr/bin/env bash

net=$NETWORK

if [ "$net" != "mainnet" ] && [ "$net" != "testnet" ]
then
  echo "$net is not supported. Use either NETWORK=mainnet or NETWORK=testnet"
  exit 1
fi

if [ "$net" == "testnet" ]
then
  rm subgraph.yaml
  mv subgraph.fuji.yaml subgraph.yaml
fi

apt install nodejs npm -y

npm install

graph="node_modules/@graphprotocol/graph-cli/bin/graph"

node "$graph" codegen
node "$graph" build
node "$graph" create "cm/$net" --node http://127.0.0.1:8020
node "$graph" deploy "cm/$net" --ipfs http://localhost:5001 --node http://127.0.0.1:8020

