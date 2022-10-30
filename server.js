// 'use strict';
//imports
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import multer from "multer";
import { GridFsStorage } from "multer-gridfs-storage";
import Grid from "gridfs-stream";
import bodyParser from "body-parser";
import path from "path";
import Posts from "./postModel.js";
import Pusher from "pusher";

//app config
Grid.mongo = mongoose.mongo;
const app = express();
const port = process.env.PORT || 9000;
const connection_url =
  "mongodb+srv://admin:khgaT1IyIz0SAsiq@cluster0.tx1zlak.mongodb.net/?retryWrites=true&w=majority";
const pusher = new Pusher({
  appId: "1499100",
  key: "aedcf8269706b7325736",
  secret: "8a6f855c5de36a8aa3bf",
  cluster: "eu",
  useTLS: true
});
//API Endpoints
const db = mongoose.connection;
db.once("open", () => {
  console.log("DB Connected");
  const msgCollection = db.collection("messagingmessages");
  const changeStream = msgCollection.watch();
  changeStream.on("change", (change) => {
    console.log(change);
    if (change.operationType === "insert") {
      const messageDetails = change.fullDocument;
      pusher.trigger("messages", "inserted", {
        name: messageDetails.name,
        message: messageDetails.message,
        timestamp: messageDetails.timestamp,
        received: messageDetails.received,
      });
    } else {
      console.log("Error trigerring Pusher");
    }
  });
});
//middleware
app.use(bodyParser.json());
app.use(cors());
//DB Config
const connection = mongoose.createConnection(connection_url, {
  useNewUrlParser: true,
  //   useCreateIndex: true,
  useUnifiedTopology: true,
});
// const upload = multer({ storage });

mongoose.connect(connection_url, {
  useNewUrlParser: true,
  //   useCreateIndex: true,
  useUnifiedTopology: true,
});
let gfs;

connection.once("open", () => {
  console.log("DB Connected");
  gfs = Grid(connection.db, mongoose.mongo);
  gfs.collection("images");
});
const storage = new GridFsStorage({
  url: connection_url,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      const filename = `image-${Date.now()}${path.extname(file.originalname)}`;
      const fileInfo = {
        filename: filename,
        bucketName: "images",
      };
      resolve(fileInfo);
    });
  },
});

const upload = multer({ storage });
//api routes
app.get("/", (req, res) => res.status(200).send("Hello TheWebDev"));

app.post("/upload/image", upload.single("file"), (req, res) => {
  res.status(201).send(req.file);
});

app.post("/upload/post", (req, res) => {
  const dbPost = req.body;
  Posts.create(dbPost, (err, data) => {
    if (err) res.status(500).send(err);
    else res.status(201).send(data);
  });
});
app.get("/posts", (req, res) => {
  Posts.find((err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      data.sort((b, a) => a.timestamp - b.timestamp);
      res.status(200).send(data);
    }
  });
});
//listen

app.get("/images/single", (req, res) => {
  gfs.files.findOne({ filename: req.query.name }, (err, file) => {
    if (err) {
      res.status(500).send(err);
    } else {
      if (!file || file.length === 0) {
        res.status(404).json({ err: "file not found" });
      } else {
        const readstream = gfs.createReadStream(file.filename);
        readstream.pipe(res);
      }
    }
  });
});
app.listen(port, () => console.log(`Listening on localhost: ${port}`));
