const fs = require("fs");
const yaml = require("js-yaml");
const { MongoClient } = require("mongodb");

const mongodbConnection = process.env.MONGO_URI;

const client = new MongoClient(mongodbConnection, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
let queueCounter = 0;
let dateString = "";

function counterCheck() {
    if (queueCounter == 0) {
        data = {
            Status: "Complete",
            DateString: dateString,
            Created: new Date(Date.now()),
            Updated: new Date(Date.now()),
        };
        client
            .db("PWFData")
            .collection("PipelineStatus")
            .insertOne(data)
            .then(() => {
                client.close();
                console.log("Client closed");
            });
    }
}

async function dbInsert(collectionName, data) {
    const database = client.db("PWFData");
    const collection = database.collection(collectionName);
    queueCounter++;
    const result = await collection.insertOne(data);
    console.log(
        `${result.insertedCount} documents were inserted with the _id: ${result.insertedId}`
    );
    queueCounter--;
    counterCheck();
}

duplicateCheckInsert = (field, collectionName, data) => {
    queryData = {};
    queryData[field] = data[field];
    queueCounter++;
    client
        .db("PWFData")
        .collection(collectionName)
        .findOne(queryData)
        .then((res) => {
            if (res === null) {
                data["IsNew"] = true;
            } else {
                data["IsNew"] = false;
            }
            dbInsert(collectionName, data).catch(console.dir);
            queueCounter--;
        });
};

saveRanking = (data) => {
    [month, day, year] = data["Timestamp"].split("-");
    data = {
        Rank: parseInt(data["Rank"]),
        IllustID: parseInt(data["IllustID"]),
        Downloaded: Boolean(parseInt(data["Downloaded"])),
        DateString: data["Timestamp"],
        AspectRatio: data["AspectRatio"],
        Adult: data["Adult"],
        Created: new Date(Date.now()),
        Updated: new Date(Date.now()),
    };
    duplicateCheckInsert("IllustID", "Ranking", data);
};

saveLocation = (data) => {
    if (data["Downloaded"] < 0.5) {
        return;
    }
    data = {
        IllustID: parseInt(data["IllustID"]),
        Thumbnail: data["Thumbnail"],
        ThumbnailHeight: parseInt(data["ThumbnailHeight"]),
        ThumbnailWidth: parseInt(data["ThumbnailWidth"]),
        Original: data["Original"],
        OriginalHeight: parseInt(data["OriginalHeight"]),
        OriginalWidth: parseInt(data["OriginalWidth"]),
        Compressed: data["Compressed"],
        CompressedHeight: parseInt(data["CompressedHeight"]),
        CompressedWidth: parseInt(data["CompressedWidth"]),
        Created: new Date(Date.now()),
        Updated: new Date(Date.now()),
    };
    dbInsert("ImageLocation", data).catch(console.dir);
};

client.connect((err) => {
    fs.readFile("data.json", "utf8", (err, rawData) => {
        let scraperData = JSON.parse(rawData);
        dateString = scraperData[0]["Timestamp"];
        scraperData.forEach((entry) => {
            saveRanking(entry);
            saveLocation(entry);
        })
        counterCheck();
    });
});
