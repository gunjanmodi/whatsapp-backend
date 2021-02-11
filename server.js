// importing
const dotenv = require('dotenv').config();
const express = require('express')
const mongoose = require('mongoose');
const Pusher = require('pusher');
const cors = require('cors');
const Messages = require('./dbMessages.js');

// app config
const app = express();
const port = process.env.PORT || 9000;

const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
    useTLS: true
});

// middlewares
app.use(express.json());
app.use(cors())

// DB Config
const connection_url = process.env.MONGO_URL

console.log(connection_url)
mongoose.connect(connection_url, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection

db.once('open', () => {
    console.log("DB Connected");

    const msgCollection = db.collection("messagecontents");
    const changeStream = msgCollection.watch();

    changeStream.on('change', (change)=>{
        // console.log("A change occured", change);

        if (change.operationType == 'insert') {
            const messageDetails = change.fullDocument;
            pusher.trigger('messages', 'inserted',
                {
                    name: messageDetails.name,
                    message: messageDetails.message,
                    timestamp: messageDetails.timestamp,
                    received: messageDetails.received
                }
            );
        }
    })
})

// api routes
app.get('/messages/sync', (req, res) => {
    Messages.find((err, data) => {
        if (err) {
            res.status(500).send(err)
        }
        else {
            res.status(200).send(data)
        }
    })
})

app.post('/messages/new', (req, res) => {
    const dbMessage = req.body;

    Messages.create(dbMessage, (err, data) => {
        if (err) {
            res.status(500).send(err)
        }
        else {
            res.status(201).send(data)
        }
    })
})


// listen
app.listen(port, ()=>console.log(`Listening on localhost: ${port}`));