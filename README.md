# Overview

This example showcases the integration between [Redpanda](https://vectorized.io/redpanda/), an open-source Kafka-compatible streaming platform and [MongoDB](https://www.mongodb.com/) the database for modern applications.  

To get started run `sh run.sh`

This will spin up the following containers:
- MongoDB single node replica set (port 27017)
- RedPanda
- Kafka Connect with MongoDB Connector for Apache Kafka installed
- Node Server (hosting an Express instance back end) (port 4000)
- NPM Server (hosting the React App front end) (port 3000)

Once up navigate to 
http://localhost:3000

As of now you will just see the splash page and a button at the bottom.  When you click the button it sends an API request to the back end and sends back a message.  This is just testing the connectivity betweent these components.  Next step is to add functionality in Express to communicate with Redpanda.

