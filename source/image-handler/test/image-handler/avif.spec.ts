// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import Rekognition from "aws-sdk/clients/rekognition";
import S3 from "aws-sdk/clients/s3";
import sharp from "sharp";
import fs from "fs";

import { ImageHandler } from "../../image-handler";
import { ImageFormatTypes, ImageRequestInfo, RequestTypes } from "../../lib";

const s3Client = new S3();
const rekognitionClient = new Rekognition();

// Use 8-bit AVIF for tests (10-bit AVIF is now converted to PNG via jsquash)
const avifImageBuffer = fs.readFileSync("./test/image/example-8bit.avif");
const avif10bitBuffer = fs.readFileSync("./test/image/example.avif");
const avif10bitProdBuffer = fs.readFileSync("./test/image/example-10bit-prod.avif");

describe("AVIF format support", () => {
  beforeAll(async () => {
    // Verify we're using an 8-bit AVIF image
    const metadata = await sharp(avifImageBuffer).metadata();
    console.log("Using 8-bit AVIF image:", {
      size: avifImageBuffer.length,
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      compression: metadata.compression,
      bitsPerSample: metadata.bitsPerSample,
    });
  });

  it("Should successfully read and process an AVIF image", async () => {
    // Arrange
    const request: ImageRequestInfo = {
      requestType: RequestTypes.DEFAULT,
      bucket: "sample-bucket",
      key: "test-image.avif",
      edits: {},
      originalImage: avifImageBuffer,
    };

    // Act
    const imageHandler = new ImageHandler(s3Client, rekognitionClient);
    const result = await imageHandler.process(request);

    // Assert
    expect(result).toBeDefined();
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    // Verify it's a valid image by reading it with Sharp
    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(600);
    expect(metadata.height).toBe(300);
  });

  it("Should successfully convert AVIF to WebP (production use case)", async () => {
    // Arrange
    const request: ImageRequestInfo = {
      requestType: RequestTypes.DEFAULT,
      bucket: "sample-bucket",
      key: "test-image.avif",
      outputFormat: ImageFormatTypes.WEBP,
      edits: {
        resize: {
          width: 512,
          fit: "cover",
        },
      },
      originalImage: avifImageBuffer,
    };

    // Act
    const imageHandler = new ImageHandler(s3Client, rekognitionClient);
    const result = await imageHandler.process(request);

    // Assert
    expect(result).toBeDefined();
    expect(Buffer.isBuffer(result)).toBe(true);

    // Verify the output is WebP format
    const metadata = await sharp(result).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(512);
  });

  it("Should resize AVIF image and convert to WebP", async () => {
    // Arrange - This simulates the exact production scenario
    const request: ImageRequestInfo = {
      requestType: RequestTypes.DEFAULT,
      bucket: "snappr-ai-prod-media",
      key: "media/test-avif-image",
      outputFormat: ImageFormatTypes.WEBP,
      edits: {
        resize: {
          width: 512,
          fit: "cover",
        },
      },
      originalImage: avifImageBuffer,
    };

    // Act
    const imageHandler = new ImageHandler(s3Client, rekognitionClient);
    const result = await imageHandler.process(request);

    // Assert
    expect(result).toBeDefined();

    const metadata = await sharp(result).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(512);

    console.log("Successfully converted AVIF to WebP:", {
      inputSize: avifImageBuffer.length,
      outputSize: result.length,
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
    });
  });

  it("Should apply edits (grayscale, flip) to AVIF image", async () => {
    // Arrange
    const request: ImageRequestInfo = {
      requestType: RequestTypes.DEFAULT,
      bucket: "sample-bucket",
      key: "test-image.avif",
      edits: {
        grayscale: true,
        flip: true,
      },
      originalImage: avifImageBuffer,
    };

    // Act
    const imageHandler = new ImageHandler(s3Client, rekognitionClient);
    const result = await imageHandler.process(request);

    // Assert
    expect(result).toBeDefined();
    expect(result).not.toEqual(avifImageBuffer);

    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(600);
    expect(metadata.height).toBe(300);
  });

  it("Should handle AVIF with effort parameter", async () => {
    // Arrange
    const request: ImageRequestInfo = {
      requestType: RequestTypes.DEFAULT,
      bucket: "sample-bucket",
      key: "test-image.avif",
      outputFormat: ImageFormatTypes.WEBP,
      effort: 3,
      originalImage: avifImageBuffer,
    };

    // Act
    const imageHandler = new ImageHandler(s3Client, rekognitionClient);
    const result = await imageHandler.process(request);

    // Assert
    expect(result).toBeDefined();

    const metadata = await sharp(result).metadata();
    expect(metadata.format).toBe("webp");
  });

  it.skip("Should successfully convert 10-bit AVIF to WebP using jsquash fallback (skipped: jsquash ES modules not compatible with Jest)", async () => {
    // Arrange - Using the small 10-bit AVIF test image
    const request: ImageRequestInfo = {
      requestType: RequestTypes.DEFAULT,
      bucket: "sample-bucket",
      key: "test-10bit.avif",
      outputFormat: ImageFormatTypes.WEBP,
      edits: {
        resize: {
          width: 512,
          fit: "cover",
        },
      },
      originalImage: avif10bitBuffer,
    };

    // Act
    const imageHandler = new ImageHandler(s3Client, rekognitionClient);
    const result = await imageHandler.process(request);

    // Assert - Should successfully convert 10-bit AVIF via jsquash
    expect(result).toBeDefined();
    expect(Buffer.isBuffer(result)).toBe(true);

    const metadata = await sharp(result).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(512);

    console.log("Successfully processed 10-bit AVIF:", {
      inputSize: avif10bitBuffer.length,
      outputSize: result.length,
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
    });
  });

  it.skip("Should successfully process production 10-bit AVIF image (skipped: jsquash ES modules not compatible with Jest)", async () => {
    // Arrange - Using the real production 10-bit AVIF (146KB)
    const request: ImageRequestInfo = {
      requestType: RequestTypes.DEFAULT,
      bucket: "snappr-ai-prod-media",
      key: "media/1c5b268c-9876-4b30-8ddb-8c6db0eb0fd4",
      outputFormat: ImageFormatTypes.WEBP,
      edits: {
        resize: {
          width: 512,
          fit: "cover",
        },
      },
      originalImage: avif10bitProdBuffer,
    };

    // Act
    const imageHandler = new ImageHandler(s3Client, rekognitionClient);
    const result = await imageHandler.process(request);

    // Assert - Should successfully convert production 10-bit AVIF
    expect(result).toBeDefined();
    expect(Buffer.isBuffer(result)).toBe(true);

    const metadata = await sharp(result).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(512);

    console.log("Successfully processed production 10-bit AVIF:", {
      inputSize: avif10bitProdBuffer.length,
      outputSize: result.length,
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
    });
  });
});
