import { parentPort, workerData } from 'worker_threads';

// credit: https://deanhume.com/experimenting-with-the-streams-api/

//Make Connection to Redpanda
import { Kafka} from 'kafkajs'

const kafka = new Kafka({
    clientId: 'my-app',
    brokers: ['localhost:9092']
  })
const producer = kafka.producer()

console.log('connecting to Redpanda...');
await producer.connect()

const time = Date.now();
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function Round(num, decimalPlaces = 0) {
    var p = Math.pow(10, decimalPlaces);
    return Math.round(num * p) / p;
}
function newvalue(old_value)
{//Math.abs((Math.random() * (max - min) + min).toFixed(2) * 1);
    var change_percent = Math.random() * (.0001);// + min; * Math.random(0.0, .001)  # 001 - flat .01 more
    var change_amount = old_value * change_percent
    var new_value=0;
   // console.log('change amount=' + Number(change_amount));
    if (Math.random()*100>50)
    {
        new_value = old_value + change_amount;
    }
   else{
        new_value = old_value - change_amount;
   }
    return Round(new_value, 2)
}

var stocks=workerData;

while (true) {
    for (const stock of stocks) {
    {
        var company_name=stock.company_name;
        var company_symbol=stock.company_symbol;
        var v=newvalue(stock.value);
        stock.value=v;
        stock.tx_time=new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');

        await producer.send({
            topic: 'activity',
            messages: [{ value: JSON.stringify(stock)  },],
          })

        }

    };

  //  await parentPort.postMessage('Processing stock '+ new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''));
    await delay(1000);

 }
