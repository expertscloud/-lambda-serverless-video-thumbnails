const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const AWS = require('aws-sdk');
const { successResponse } = require('./utils');
const { logger:log } = require('./logger');
const s3 = new AWS.S3();

const execPromise = util.promisify(exec);

async function getMediaInfo(filePath) {
  try {
    const { stdout } = await execPromise(`ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`);
    const ffprobeData = JSON.parse(stdout);    
    const duration = parseFloat(ffprobeData.format.duration);
    const size = parseFloat(ffprobeData.format.size);
    log.info("Get mediaInfo:")
    return { duration, size };
  } catch (error) {
    return await successResponse({}, "Error getting media info", false);
  }
}

async function generateThumbnail(filePath, thumbnailPath, chunktime) {
  try {
    await execPromise(`ffmpeg -i "${filePath}" -ss ${chunktime} -vframes 1 "${thumbnailPath}"`);
  } catch (error) {
    log.error("Error to generateThumnail")
    return await successResponse({}, "Error generating thumbnail", false);
  }
}

async function downloadChunk(bucketName, objectKey, startByte, endByte) {
  const params = {
    Bucket: bucketName,
    Key: objectKey,
    Range: `bytes=${startByte}-${Math.floor(endByte)}`,
  };

  const data = await s3.getObject(params).promise();
  return data.Body;
}

module.exports.handler = async (event) => {
  log.info("Input for generateThumbnail:")
  const { dur } = JSON.parse(event.body);
  
  const bucketName = 'your bucket name';
  const objectKey = 'your video key';
  const fileName = './tmp/video.mp4';  
  const thumbnailPath = './tmp/thumbnail.png';

  try {
    const videoUrl = `https://${bucketName}.s3.amazonaws.com/${objectKey}`;
    const { duration, size } = await getMediaInfo(videoUrl);

    const bytePerSec = size / duration;
    const endByte = bytePerSec * dur;
    const extraBytes=endByte * 1.16;

    if (endByte > size || extraBytes > size) {
      log.error("Requested bytes range exceeds the size of the video:")
      return await successResponse({}, "Requested byte range exceeds the size of the video.", false);

    }
    
    const startByte = 0;
    const videoChunk = await downloadChunk(bucketName, objectKey, startByte, extraBytes);

    fs.writeFileSync(fileName, videoChunk);
    log.info("Chunk with metadata downloaded successfully")

    const chunktime = endByte/bytePerSec 
    await generateThumbnail(fileName, thumbnailPath,chunktime);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Success",
        thumbnailPath: thumbnailPath
      })
    };
  } catch (error) {
    console.error(error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to retrieve media info",
        error: error.message
      })
    };
  }
};

