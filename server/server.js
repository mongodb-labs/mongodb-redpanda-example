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
  brokers: ['localhost:9092']
})

//Connect to MongoDB

const uri =
  "mongodb://127.0.0.1"; // mongo1:27017/?replicaSet=rs0";
const client = new MongoClient(uri);


app.get('/api/hello', (req, res) => {
  res.send({'title':'Hello World!'})
})
// Support functions
function randomInt(low, high) {
  return Math.floor(Math.random() * (high - low) + low)
}
function randomDecimal(min, max) {
  return Math.abs((Math.random() * (max - min) + min).toFixed(2) * 1);
}

app.get('/api/test',async (req,res)=>
{
  const producer = kafka.producer()

  console.log('connecting...');
  await producer.connect()

  console.log('seding...');
  await producer.send({
    topic: 'test-topic',
    messages: [
      { value: 'Hello KafkaJS user!' },
    ],
  })
  
  await producer.disconnect().then(()=>{ console.log('DONE!'); res.send({'status':'done'});})
})
// Kicks off the generation of stock ticker symbol and their data
app.get('/api/list', (req,res)=>{
 res.send(company_name);

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
 // res.render('index', {});
  res.redirect('/index.html');
})
//Create agg query and return 


app.post('/api/get', async function (req, res) {
//console.log('req.body.length='+req.body.length);
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
  console.log('pip='+JSON.stringify(pipeline));
  var x=[];

  for await (const doc of aggCursor) {
    x.push(JSON.stringify(doc));
     
  }
  //THEW ISSUE IS PASSING THE JSON BACK TO THE BROWSER!
  //console.log('ANSWER='+JSON.stringify(x));

  res.send(x);
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }

  /*
  var s=[];


//TEMP, replace with query to MongoDB
for (var key in req.body) {
  if (req.body.hasOwnProperty(key)) {
    item = req.body[key];
    var f={};
    f.key=item;
    f.value=randomInt(10,100);
    s.push(f);
  }
}

console.log('----->' + JSON.stringify(s));
return (s);
*/
})

 // Old get that shows activity
 /*
 app.get('/api/get', async function (req, res) {
  const consumer = kafka.consumer({ groupId: 'stock-read-group' })
  await consumer.connect();
  await consumer.subscribe({ topic: 'activity', fromBeginning: false });

  consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          topic_message=message.value.toString() + "\n"
          res.write(topic_message);
          }
        
        }, 
      )
 })*/

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
         //   console.log('READING THE STATUS-->');
         //   console.log({
          //    value: topic_message,
          //  })
            if (topic_message=='STOP') { 
              console.log('\n\nStopping the data generation\n\n'); 
              consumer.disconnect(); 
              worker.terminate();
            }
          
          }, 
        }); 

  }

}

app.get('/api/stop', async (req,res)=>
{
  const producer = kafka.producer()
  await producer.connect().then(()=>{
    producer.send({
      topic: 'status',
      messages: [{ value: 'STOP'},],
    })
  });
  res.send({'status':'success'});

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
app.listen(port, () => {
  console.log(`Stock traders listening at http://localhost:${port}`)
})

/*app.post("/yourpath", (req, res)=>{

    var postData = req.body;
    //then work with your data

    //or if this doesn't work, for string body
    var postData = JSON.parse(req.body);
});


//app.get('/api/reset',async (req,res)=>
//{
 // const consumer = kafka.consumer({ groupId: 'stock-read-group' })
 // await consumer.connect();
 // await consumer.subscribe({ topic: 'activity', fromBeginning: false });

  //const kafka = new Kafka(...)
//const admin = kafka.admin()

//await admin.deleteTopics({
 // topics: 'status'
//})

// remember to connect and disconnect when you are done
//await admin.connect()
//a//wait admin.disconnect()

//})
*/