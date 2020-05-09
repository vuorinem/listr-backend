import express = require('express');
import { MongoClient } from 'mongodb';
import { listen } from 'socket.io';
import cors from 'cors';

const app = express();
const port = parseInt(process.env.PORT || "3003");;

const socketPort = parseInt(process.env.SOCKET_PORT || "3002");
const io = listen(socketPort);

if (!process.env.MONGODB_CONNECTIONSTRING) {
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
    const db = dbContext.db('listr-db');
    const collection = db.collection('lists');

    return collection.findOne({
        'name': name,
    });
};

const reserve = async (listName: string, itemLabel: string, count: number): Promise<boolean> => {
    const db = dbContext.db('listr-db');
    const collection = db.collection('lists');

    const update = await collection.updateOne(
        { name: listName },
        { $inc: { 'items.$[item].reservedCount': count } },
        { arrayFilters: [{ 'item.label': itemLabel }] },
    );

    return update.modifiedCount > 0;
};

app.use(cors());

app.use((req, res, next) => {
    console.log('Request started to ' + req.path);
    next();
});

app.get('/list', async (req, res) => {
    const name = decodeURIComponent(req.query['name']);
    const list = await findList(name);

    if (list) {
        res.send(list);
    } else {
        res.status(404);
        res.send('List not found');
    }
});

app.post('/list/reserve', async (req, res) => {
    const listName = decodeURIComponent(req.query['name']);
    const itemLabel = decodeURIComponent(req.query['item']);
    const isSuccess = await reserve(listName, itemLabel, 1);

    if (isSuccess) {
        io.emit(listName);
        res.send();
    } else {
        res.status(400);
        res.send('Error reserving item');
    }
});

app.post('/list/cancel', async (req, res) => {
    const listName = decodeURIComponent(req.query['name']);
    const itemLabel = decodeURIComponent(req.query['item']);
    const isSuccess = await reserve(listName, itemLabel, -1);

    if (isSuccess) {
        io.emit(listName);
        res.send();
    } else {
        res.status(400);
        res.send('Error reserving item');
    }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

io.on('connection', socket => {
    console.log(`User ${socket.id} connected`);

    socket.on('disconnect', () => {
        console.log(`User ${socket.id} disconnected`);
    });
});
