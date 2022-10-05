#!/usr/bin/env bash

net=$NETWORK
if [ "$net" != "mainnet" ] && [ "$net" != "testnet" ]
then
  echo "$net is not supported. Use either NETWORK=mainnet or NETWORK=testnet"
  exit 1
fi

cd /opt
apt update

apt install -y jq

# install docker
apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"
apt install -y docker-ce

# install docker-compose
curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# setup graph
git clone https://github.com/graphprotocol/graph-node/
cd graph-node/docker

yaml=$(cat docker-compose.yml)

if [ "$net" == "mainnet" ]
then
  yaml=${yaml//"mainnet:http://host.docker.internal:8545"/"mainnet:https://api.avax.network/ext/bc/C/rpc"}
fi

if [ "$net" == "testnet" ]
then
  yaml=${yaml//"mainnet:http://host.docker.internal:8545"/"testnet:https://api.avax-test.network/ext/bc/C/rpc"}
fi

echo "$yaml" > docker-compose.yml

docker-compose up -d
