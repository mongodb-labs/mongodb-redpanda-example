#!/bin/bash

set -e
(
if lsof -Pi :27017 -sTCP:LISTEN -t >/dev/null ; then
    echo "Please terminate the local mongod on 27017, consider running 'docker-compose down -v'"
    exit 1
fi
)

echo "Starting docker ."
docker-compose up -d --build

sleep 5

#echo -e "\nConfiguring the MongoDB ReplicaSet of 1 node...\n"
#docker-compose exec mongo1 /usr/bin/mongo --eval '''rsconf = { _id : "rs0", members: [ { _id : 0, host : "mongo1:27017", priority: 1.0 }]};
#rs.initiate(rsconf);'''

sleep 5

echo "\n\nKafka Connectors status:\n\n"
curl -s "http://localhost:8083/connectors?expand=info&expand=status" | \
           jq '. | to_entries[] | [ .value.info.type, .key, .value.status.connector.state,.value.status.tasks[].state,.value.info.config."connector.class"]|join(":|:")' | \
           column -s : -t| sed 's/\"//g'| sort

echo "\n\nVersion of MongoDB Connector for Apache Kafka installed:\n"
curl --silent http://localhost:8083/connector-plugins | jq -c '.[] | select( .class == "com.mongodb.kafka.connect.MongoSourceConnector" or .class == "com.mongodb.kafka.connect.MongoSinkConnector" )'

echo '''

==============================================================================================================

The following services are running:

MongoDB 1-node replica set on port 27017
Redpanda on 8082 (Redpanda proxy on 8083)
Kafka Connect on 8083
Node Server on 4000 is hosting the API and homepage

Status of kafka connectors:
sh status.h

To tear down the environment and stop these serivces:
docker-compose-down -v

BEFORE YOU START THE DEMO, you will need configure the MongoDB Connector via

curl -X POST -H "Content-Type: application/json" -d @mongodb-sink.json  http://localhost:8083/connectors


==============================================================================================================
'''