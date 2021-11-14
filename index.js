/**
 * This code is written in GCS as a functionbut is easly adapted to a project
 * This GCS function analyzes uploaded images using google vision ai to detect and flag inappropriate images.
 * Appropriate content is sent to the filtered images bucket and inappropriate images get sent to the flagged content bucket.
 * @param {event} event Event payload.
 * @param {context} context Metadata for the event.
 */

//Import Statements
const vision = require("@google-cloud/vision");
const Storage = require("@google-cloud/storage");
const video = require("@google-cloud/video-intelligence").v1;
const Firestore = require("@google-cloud/firestore");

//Global Variables
const project_id = //TODO: add your own project credentials;
const storage = new Storage(project_id);


exports.analyzeGCS = async (event, context) => {
  //Variables
  const gcsEvent = event;
  const filename = gcsEvent.name;
  const filebucket = gcsEvent.bucket;

  const flagBucket = "nameOfFlagMediaBucket";

  // gets file path extension to determine file type
  const ext = filename.split(".").pop();
  ext.toLowerCase();

  // should split into 2 functions and use a ternary to determine which function to run but this works
  // if an image file uses Vision api
  if (
    ext === "jpg" ||
    ext === "jpeg" ||
    ext === "png" ||
    ext === "apng" ||
    ext === "avif" ||
    ext === "svg" ||
    ext === "webp"
  ) 
  {
    const client = new vision.ImageAnnotatorClient();
    //console.log(`New picture uploaded ${filename} in ${filebucket}`);

    const request = {
      image: { source: { imageUri: `gs://${filebucket}/${filename}` } },
      features: [
        { type: "LABEL_DETECTION" },
        { type: "IMAGE_PROPERTIES" },
        { type: "SAFE_SEARCH_DETECTION" },
      ],
    };

    // invoking the Vision API
    const [response] = await client.annotateImage(request);
    // console.log(
    //   `Raw vision output for: ${filename}: ${JSON.stringify(response)}`
    // );

    if (response.error === null) {
      // listing the labels found in the picture
      const labels = response.labelAnnotations
        .sort((ann1, ann2) => ann2.score - ann1.score)
        .map((ann) => ann.description);
      console.log(`Labels: ${labels.join(", ")}`);

      // retrieving the dominant color of the picture
      const color =
        response.imagePropertiesAnnotation.dominantColors.colors.sort(
          (c1, c2) => c2.score - c1.score
        )[0].color;
      const colorHex = decColorToHex(color.red, color.green, color.blue);
      console.log(`Colors: ${colorHex}`);

      // determining if the picture is safe to show
      const safeSearch = response.safeSearchAnnotation;
      const isSafe = safe(safeSearch);

      // if the picture is safe to display, store it in Firestore
      if (isSafe) {
        const pictureStore = new Firestore().collection("nameOfYourFirestoreCollection");
        const doc = pictureStore.doc(filename);
        await doc.set(
          {
            labels: labels,
            color: colorHex,
            created: Firestore.Timestamp.now(),
            thumbnail: `url goes here`
          },
          { merge: true }
        );

        //console.log("Stored metadata in Firestore");
      } else if (!isSafe) {
        flagContent(filebucket, filename, flagBucket, filename, storage);
      }
    } else {
      throw new Error(
        `Vision API error: code ${response.error.code}, message: "${response.error.message}"`
      );
    }
  }

   // if a video file uses VIDEO AI api
  if(ext === 'mp4' || 
    ext === 'mov' || 
    ext === 'wmv' || 
    ext === 'flv' || 
    ext === 'avi' || 
    ext === 'avchd' || 
    ext === 'webm' || 
    ext === 'mkv'
    )
    {
    const client = new video.VideoIntelligenceServiceClient();
    const gcsUri = `gs://${filebucket}/${filename}`;
    const result = '';

    const request = {
    inputUri: gcsUri,
    features: ['EXPLICIT_CONTENT_DETECTION'],
    }

    // Human-readable likelihoods
    // for testing, uncomment lines 157 -163 console.log statements
    // const likelihoods = [
    // 'UNKNOWN',
    // 'VERY_UNLIKELY',
    // 'UNLIKELY',
    // 'POSSIBLE',
    // 'LIKELY',
    // 'VERY_LIKELY',
    // ];

    // Detects unsafe content
    // Invokes Video AI Api
    const [operation] = await client.annotateVideo(request);
    //console.log('Waiting for operation to complete...');
    const [operationResult] = await operation.promise();
    // Flags unsafe content
    const explicitContentResults =
    operationResult.annotationResults[0].explicitAnnotation;
    //console.log('Explicit annotation results:');

    explicitContentResults.frames.forEach(result => {
      if (result.timeOffset === undefined) {
        result.timeOffset = {};
      }
      if (result.timeOffset.seconds === undefined) {
        result.timeOffset.seconds = 0;
      }
      if (result.timeOffset.nanos === undefined) {
        result.timeOffset.nanos = 0;
      }
      // console.log(
      //   `\tTime: ${result.timeOffset.seconds}` +
      //     `.${(result.timeOffset.nanos / 1e6).toFixed(0)}s`
      // );
      // console.log(
      //   `\t\tPornography likelihood: ${likelihoods[result.pornographyLikelihood]}`
      // );
    });

     // if video safe to display, store it in Firestore
     if (result.pornographyLikelihood !== "LIKELY" || result.pornographyLikelihood !== "VERY_LIKELY"){
          //console.log(`I AM IN SAFE`);
          const collectionRef = new Firestore().collection("filtered-images");
          collectionRef
          .add({
            video: `${filename}`,
            thumbnail: `url goes here`,
            created: Firestore.Timestamp.now(),
          })
          .then(() => {
            console.log(`CODE IN SAFE RUNS`);
          });
        } else {
        flagContent(filebucket, filename, flagBucket, filename);
        }   
  }
};


//Helper Functions
function decColorToHex(r, g, b) {
  return (
    "#" +
    Number(r).toString(16).padStart(2, "0") +
    Number(g).toString(16).padStart(2, "0") +
    Number(b).toString(16).padStart(2, "0")
  );
}

function safe(search) {
  const isSafe = ["adult", "spoof", "medical", "violence", "racy"].every(
    (k) => !["LIKELY", "VERY_LIKELY"].includes(search[k])
  );
  return isSafe;
}

async function flagContent(curBucket, curFileName, destBucket, destFileName, storage){
  await storage
    .bucket(curBucket)
    .file(curFileName)
    .copy(storage.bucket(destBucket).file(destFileName));
  await storage.bucket(curBucket).file(curFileName).delete();
  console.log(`gs://${curBucket}/${curFileName} deleted`);
}

/*WRITTEN FOLLOWING GCS AND FIREBASE DOCUMENTATION*/
