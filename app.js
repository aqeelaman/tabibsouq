const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const path = require("path");

//create express js instance
const app = express();
//config express.js
app.use(express.json())
app.set('port', 3000)
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
    next();
})

//mongodb database connection
let db;
MongoClient.connect('mongodb+srv://aa5226:tiger@tabibsouq.00kxfko.mongodb.net', (err, client) => {
    db = client.db('tabibsouq')
})

//logger middleware
app.use((req, res, next) => {
    console.log(req.method + req.url)
    next();
})

//display a message for root path to show that API is working
app.get('/', (req, res, next) => {
    res.send('Welcome to TabibSouq')
})

//collection name
app.param('collectionName', (req, res, next, collectionName) => {
    req.collection = db.collection(collectionName)
    return next()
})

//retrieve all the objects from a collection
app.get('/collection/:collectionName', (req, res, next) => {
    req.collection.find({}).toArray((e, results) => {
        if (e) return next(e)
        res.send(results)
    })
})




// static file 
var staticPath = path.resolve(__dirname, "static");
app.use(express.static(staticPath));
var publicPath = path.resolve(__dirname, "public");
var imagePath = path.resolve(__dirname, "images");

app.use('/public', express.static(publicPath));
app.use('/images', express.static(imagePath));
app.use(function (req, res, next) {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Looks like you didn't find a static file.")
    next();
});

//run app
const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log('Express.js server running at localhost:3000')
})