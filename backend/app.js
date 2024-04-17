const express = require("express");
const cors = require("cors");
var _ = require("lodash");
const { Storage } = require("@google-cloud/storage");
const multer = require("multer");
const path = require("path");
const ytdl = require("ytdl-core");
const { v4: uuidv4 } = require("uuid");
const app = express();
const port = 5000;
const axios = require("axios");

// Enable CORS
app.use(cors());
const bodyParser = require("body-parser");
app.use(bodyParser.json());

// Set up Google Cloud Storage
const storage = new Storage({
  keyFilename: "./videocencor-7c5e5a3c22aa.json",
});
const uploadBucket = "cencoredvideobucket";
const processedBucket = "modified_video_updated";
const bucket = storage.bucket("cencoredvideobucket");

const thumbnailsBucket = "videothumbnailsimage";
const thumb_nail_bucket = storage.bucket("videothumbnailsimage");

const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

app.get("/getVideos", async function (req, res) {
  try {
    // Get the JSON object from listFiles function
    let jsonObject = await listFiles();

    // Send the JSON object as the response
    res.send(jsonObject);
  } catch (error) {
    console.error("Error getting file details:", error);
    res.status(500).send("Server Error");
  }
});

app.post("/uploadVideo", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      console.log("No file");

      return res.status(400).send("No file uploaded.");
    }

    console.log("file found");
    const fileName = req.file.originalname;
    const file = storage.bucket(uploadBucket).file(fileName);
    listFiles().catch(console.error);

    const stream = file.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    stream.on("error", (err) => {
      console.error(err);
      res.status(500).send("Failed to upload file.");
    });

    stream.on("finish", () => {
      res.status(200).send("File uploaded successfully.");
    });

    stream.end(req.file.buffer);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

app.post("/uploadImage", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      console.log("No Image");

      return res.status(400).send("No file uploaded.");
    }

    console.log("Image found");

    const fileName = req.file.originalname;
    const imageName = req.body.imageName.replace(/\.[^/.]+$/, "");

    console.log(imageName);
    const file = storage.bucket(thumbnailsBucket).file(imageName);

    const stream = file.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    stream.on("error", (err) => {
      console.error(err);
      res.status(500).send("Failed to upload file.");
    });

    stream.on("finish", () => {
      res.status(200).send("File uploaded successfully.");
    });

    stream.end(req.file.buffer);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

app.post("/downloadAndUploadVideo", async (req, res) => {
  const { videoLink } = req.body;
  let videoDuration;

  const response = await downloadAndUploadVideo(videoLink);
  if (response) {
    videoDuration = response[0].videoDuration;
    console.log(">>>> After processing::");
    console.log(videoDuration);
    res.send({ message: "Video link received successfully.", videoDuration });
  }
});

async function downloadAndUploadVideo(youtubeURL) {
  const videoId = ytdl.getURLVideoID(youtubeURL);
  const videoTitle = `video-${videoId}.mp4`;

  const videoStream = ytdl(youtubeURL, {
    filter: (format) =>
      format.container === "mp4" && format.hasAudio && format.hasVideo,
  });

  const info = await ytdl.getInfo(youtubeURL);
  const thumbnailUrl =
    info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url; // Get the highest resolution thumbnail

  const videoDuration = info.videoDetails.lengthSeconds;
  const videoDurationCalculated = Math.round(videoDuration / 60);
  console.log(`Video Duration: ${Math.round(videoDuration / 60)} Mins`);

  const response = await axios({ url: thumbnailUrl, responseType: "stream" });
  const thumbnailTitle = videoTitle.replace(/\.[^/.]+$/, "");
  const thumbnailFile = thumb_nail_bucket.file(thumbnailTitle);
  const thumbnailStream = thumbnailFile.createWriteStream({
    metadata: {
      contentType: "image/jpeg",
    },
  });

  response.data.pipe(thumbnailStream);

  // Upload video to Google Cloud Storage
  const file = bucket.file(videoTitle);
  const writeStream = file.createWriteStream({
    metadata: {
      contentType: "video/mp4",
    },
  });

  videoStream.pipe(writeStream);

  return Promise.all([
    new Promise((resolve, reject) => {
      writeStream.on("finish", () => {
        console.log("Video upload successful");
        resolve({ videoDuration: videoDurationCalculated });
      });
      writeStream.on("error", (error) => {
        console.error("Error during video upload:", error);
        reject(error);
      });
    }),
    new Promise((resolve, reject) => {
      thumbnailStream.on("finish", () => {
        console.log("Thumbnail upload successful");
        resolve();
      });
      thumbnailStream.on("error", (error) => {
        console.error("Error during thumbnail upload:", error);
        reject(error);
      });
    }),
  ]);
}
async function listFiles() {
  try {
    // Lists files in the bucket
    const [files] = await storage.bucket(processedBucket).getFiles();
    const url = "https://storage.googleapis.com/";
    let jsonObject = []; // Initialize as an array
    console.log("----");
    await Promise.all(
      files.map(async (file) => {
        console.log(url.concat(processedBucket, "/", file.name));
        let authURL = await generateV4ReadSignedUrl(file.name, processedBucket);
        jsonObject.push({
          fileName: file.name,
          fileURL: authURL,
          imageURL: await generateV4ReadSignedUrl(
            file.name.replace(/\.[^/.]+$/, ""),
            thumbnailsBucket
          ),
        }); // Push object to array

        if (authURL != null && file != null) {
          // generateThumbnail(authURL, file.name );
        }
      })
    );

    // console.log(jsonObject);
    return jsonObject; // Return the complete JSON object
  } catch (error) {
    console.error("Error listing files:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

async function generateV4ReadSignedUrl(fileName, bucketName) {
  // These options will allow temporary read access to the file
  const options = {
    version: "v4",
    action: "read",
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
  };

  // Get a v4 signed URL for reading the file

  const [url] = await storage
    .bucket(bucketName)
    .file(fileName)
    .getSignedUrl(options);

  return url;
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
