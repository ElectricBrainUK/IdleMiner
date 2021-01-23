const express = require('express');
const app = express();
const port = 12345;
const fs = require('fs');
const bodyParser = require('body-parser');

var jsonParser = bodyParser.json();

app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

app.get('/:key', (req, res) => {
    let data = JSON.parse(fs.readFileSync("config/data.json").toString());
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(data[req.params.key] ? data[req.params.key] : null);
});

app.post('/:key', jsonParser, (req, res) => {
    let data = JSON.parse(fs.readFileSync("config/data.json").toString());
    data[req.params.key] = req.body.value;
    console.log(data);
    console.log(req.body);
    fs.writeFileSync("config/data.json", JSON.stringify(data));
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send();
});

app.listen(port, () => {
    console.log(`Storage app listening at http://localhost:${port}`)
});

