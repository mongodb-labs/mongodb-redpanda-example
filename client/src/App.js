import React,{useState} from 'react'
import logo from './leafie.svg';
import './App.css';

//This function is used to pretty print JSON objects
const customStringify = function (v) {
  const cache = new Set();
  return JSON.stringify(v, function (key, value) {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        // Circular reference found
        try {
          // If this value does not reference a parent it can be deduped
         return JSON.parse(JSON.stringify(value));
        }
        catch (err) {
          // discard key if value cannot be deduped
         return;
        }
      }
      // Store value in our set
      cache.add(value);
    }
    return value;
  });
};

function App() {

  const [words, setWords] = useState(null);

  const sayHello = () => {
    fetch('/api/hello',{ headers : { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
       }
    }
    )
      .then(result =>
        { return result.json(); } )
      .then(body => { console.log(customStringify(body)); setWords(body.title); } );
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" /><br/>
        <img src='wackatable.png' alt="Wack-a-Table" /><br/>
        <p style={{"color":"white"}}>COMING SOON</p>
        <button onClick={sayHello}>Say Hello from API</button>
        <p style={{"color":"green"}}>{words}</p>
       </header>
    </div>
  );
}

export default App;
