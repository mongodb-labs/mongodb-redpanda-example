const express = require('express')
const {Kafka}=require('kafkajs')
const { Worker, isMainThread, parentPort } = require('worker_threads');
var fs = require('fs');
const app = express()
const port = 4000

app.use(express.urlencoded({extended: true}));
app.use(express.json());

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['localhost:9092']
})

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

app.get('/api/send',async (req,res)=>
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
//app.get('/api/go', async (req,res)=>
async function writeStocks(stocklist)
{
 // const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  //spin up worjker through to start writing

  var topic_message;
  if (isMainThread) {
    //listen to topic
    const consumer = kafka.consumer({ groupId: 'stock-group' })
    const worker = new Worker('./worker.mjs',{workerData: stocklist});
    worker.on('message', (msg) => { console.log(msg); });
    worker.on('error', (err) => { throw err; });
    worker.on('exit', () => { console.log('exiting'); });
    await consumer.connect()
    await consumer.subscribe({ topic: 'status', fromBeginning: false })
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        topic_message=message.value.toString();
        console.log({
          value: topic_message,
        })
        if (topic_message=='STOP') { 
          //stio worker threads
         // res.send({'status':'stopped'});
          consumer.disconnect(); 
          worker.terminate();
        
        }
      
      }, 
    });

  }

}

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
});*/