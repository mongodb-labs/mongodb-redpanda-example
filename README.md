This example shows an integration between [Redpanda](https://vectorized.io/redpanda/), an open-source Kafka-compatible streaming platform and [MongoDB](https://www.mongodb.com/) the database for modern applications.  

To get started run `sh run.sh`. This will spin up the following containers:
- MongoDB single node (port 27017)
- Redpanda
- Kafka Connect with MongoDB Connector for Apache Kafka installed
- Node Server (hosting an Express app) (port 4000)

![Architecture](architecture.png)

Once started, point your browser to 
http://localhost:4000

Click the *Start* button to begin generating stock ticker data that is writen to a Redpanda topic. MongoDB consumes the ticker data from Redpanda and the application displays the current & average stock price.