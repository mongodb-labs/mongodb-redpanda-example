const express = require('express')
const app = express()
const port = 4000
app.get('/api/hello', (req, res) => {
  res.send({'title':'Hello World!'})
})
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})