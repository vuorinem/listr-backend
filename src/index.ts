import express = require('express');
import { MongoClient } from 'mongodb';

const app = express();
const port = process.env.PORT;

if(!process.env.MONGODB_CONNECTIONSTRING){
    console.error('MongoDB Connection String not set (MONGODB_CONNECTIONSTRING)');
    process.exit(1);
}

const client = new MongoClient(process.env.MONGODB_CONNECTIONSTRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
let dbContext: MongoClient;

console.log('Opening MongoDB connection...');
client.connect((err, database) => {
    console.log('Connected to MongoDB');
    dbContext = database;
});

const findList = (name: string) => {
    console.log('Getting the DB');
    const db = dbContext.db('listr-db');
    console.log(db);

    console.log('Getting the collection');
    const collection = db.collection('lists')
    console.log(collection);

    console.log('Getting the list');
    return collection.findOne({
        'name': name,
    });
}

app.use((req, res, next) => {
    console.log('Request started to ' + req.path);
    next();
});

app.get('/list', async (req, res) => {
    const name = req.query['name'];
    console.log(`Finding list ${name}`);
    const list = await findList(name);
    console.log('Found list:', list);

    if (list) {
        res.send(list);
    } else {
        res.status(404);
    }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
