const express = require('express')
const {Kafka, KafkaJSBrokerNotFound}=require('kafkajs')
const { MongoClient } = require('mongodb');
const path = require('path');
const { Worker, isMainThread, parentPort } = require('worker_threads');
var fs = require('fs');
const app = express()
const port = 4000

var application_root = __dirname;

app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use( express.static( path.join( application_root, '/') ) );

//Connect to Redpanda
const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['redpanda:9092']
})

//Connect to MongoDB
const uri =
  "mongodb://mongo1"; 
const client = new MongoClient(uri);

//This function tests the REST API
app.get('/api/hello', (req, res) => {
  res.send({'title':'Hello World!'})
})
// Support functions for generating ficticious data
function randomInt(low, high) {
  return Math.floor(Math.random() * (high - low) + low)
}
function randomDecimal(min, max) {
  return Math.abs((Math.random() * (max - min) + min).toFixed(2) * 1);
}

//This function tests the connectivity to Redpanda
app.get('/api/test',async (req,res)=>
{
  const producer = kafka.producer()

  console.log('connecting...');
  await producer.connect()

  console.log('seding...');
  await producer.send({
    topic: 'test-topic',
    messages: [
      { value: 'Hello Redpanda!' },
    ],
  })
  
  await producer.disconnect().then(()=>{ res.send({'status':'test message sent to test-topic'});})
})

//Delete the topics
app.get('/api/reset', async (req,res)=>{

  const admin = kafka.admin()
  await admin.connect();

  await admin.listTopics().then((topic_list)=>{
    console.log(topic_list);
     admin.deleteTopics({
      topics: topic_list
  }).then(()=>{ admin.disconnect();})

})})

app.get('/', function (req, res) {
  res.redirect('/index.html');
})

app.post('/api/get', async function (req, res) {

  try {
    // Connect the client to the server
    await client.connect();
    const db = client.db("Stocks");
    const coll = db.collection("StockData");
    const pipeline = [
      { $match : { company_symbol: {$in : req.body } }},
      {
        $setWindowFields:
              {
                    partitionBy: '$company_name',
                    sortBy: { 'tx_time': 1 },
                    output:
                           {
                                    averagePrice:
                                    {
                                          $avg: "$value",
                                          window:
                                                {
                                                documents:
                                                     [ "unbounded", "current" ]
                                                }
                                    }
                           }
              }
    },{$sort: {
      "tx_time": -1
    }}, {$limit: req.body.length}
  ];
  const aggCursor=coll.aggregate(pipeline);

  var x=[];

  for await (const doc of aggCursor) {
    x.push(JSON.stringify(doc));    
  }

  res.send(x);
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }

})

//main function that spins up a thread to do the perpetual work of generating tickers
async function writeStocks(stocklist)
{

  var topic_message;
  if (isMainThread) {
    //listen to topic
    const consumer = kafka.consumer({ groupId: 'stock-group' })
    const worker = new Worker('./worker.mjs',{workerData: stocklist});
    worker.on('message', (msg) => { console.log('->' + msg + '<-'); });
    worker.on('error', (err) => { throw err; });
    worker.on('exit', () => { console.log('exiting'); });
    await consumer.connect();
    await consumer.subscribe({ topic: 'status', fromBeginning: false });

     consumer.run({
          eachMessage: async ({ topic, partition, message }) => {
            topic_message=message.value.toString();

            if (topic_message=='STOP') { 
              console.log('\n\nStopping the data generation\n\n'); 
              consumer.disconnect(); 
              worker.terminate();
            }
          
          }, 
        }); 

  }

}
//This function places the stop message on the status topic
app.get('/api/stop', async (req,res)=>
{
  const producer = kafka.producer()
  await producer.connect().then(()=>{
    producer.send({
      topic: 'status',
      messages: [{ value: 'STOP'},],
    })
  });
  res.send({'status':'stopped'});

})

app.get('/api/start/:num', (req,res)=>
{
  var count=req.params.num;

  var company_name=[];
  var company_symbol=[];
  var last_value=[];

  //Generate the ficticous companies and stock ticker symbols
  //
  //load the list of words from the file system
  var nouns = fs.readFileSync('nouns.txt', 'utf8').split('\n');
  var endings = fs.readFileSync('endings.txt', 'utf8').split('\n');
  var adjectives = fs.readFileSync('adjectives.txt', 'utf8').split('\n');  
  var result=[];
  
  //randomly pick words
  for (i=0;i<=Number(count);i++) {
  var a=adjectives[randomInt(0,adjectives.length-1)].toUpperCase()
  var n=nouns[randomInt(0,nouns.length)].toUpperCase()
  var e=endings[randomInt(0,endings.length-1)].toUpperCase()

  //create the company name
  company_name.push(a + ' ' + n + ' ' + e)

  //create the symbol based off of the first character of the individual words of the company name
  var symbol=a.slice(0,1)+n.slice(0,1)+e.slice(0,1);
  //If we get a duplicate symbol, randomly generate a number at end
  if (company_symbol.includes(symbol)==true)
  {
    symbol=a.slice(0,1)+n.slice(0,1)+e.slice(0,1) +randomInt(0,100);
  }
  company_symbol.push(symbol);
  last_value.push(randomDecimal(0,200));
  //push it into the JSON object for return to caller
  result.push({company_symbol: symbol, company_name: (a + ' ' + n + ' ' + e), value: last_value[last_value.length-1] });
  }
  writeStocks(result);
  res.send(result)
})

//Main 
app.listen(port, () => {
  console.log(`Stock traders listening at http://localhost:${port}`)
})
