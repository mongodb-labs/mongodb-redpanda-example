import { parentPort, workerData } from 'worker_threads';
const time = Date.now();
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
// process.on('message',(r)=>{
//console.log(JSON.stringify(workerData));
/*tables.forEach(function(table) {
    var tableName = table.name;
    console.log(tableName);
});*/
workerData.forEach(function(stock)
{
    var company_name=stock.company_name;
    var company_symbol=stock.company_symbol;
    var value=stock.value;
    
    console.log(company_name + '   ' + company_symbol);
});
// });
while (true) {
    await parentPort.postMessage('Processing stock data....');

    await delay(1000);

 }
