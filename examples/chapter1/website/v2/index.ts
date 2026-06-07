import * as aws from "@pulumi/aws";
import * as fs from "fs";

const bucket = new aws.s3.Bucket("hello-world");

const bucketWebsite = new aws.s3.BucketWebsiteConfiguration("bucket-website", {
    bucket: bucket.bucket,
    indexDocument: {
        suffix: "index.html",
    },
});

const controls = new aws.s3.BucketOwnershipControls("ownership-controls", {
    bucket: bucket.id,
    rule: {
        objectOwnership: "ObjectWriter",
    },
});

const block = new aws.s3.BucketPublicAccessBlock("public-access-block", {
    bucket: bucket.id,
    blockPublicAcls: false,
    blockPublicPolicy: false,
    ignorePublicAcls: false,
    restrictPublicBuckets: false,
}, { dependsOn: [controls] });

const bucketPolicy = new aws.s3.BucketPolicy("bucket-policy", {
    bucket: bucket.id,
    policy: bucket.id.apply(bucketId => JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Effect: "Allow",
            Principal: "*",
            Action: "s3:GetObject",
            Resource: `arn:aws:s3:::${bucketId}/*`,
        }],
    })),
}, { dependsOn: [block] });

const homepage = new aws.s3.BucketObject("index.html", {
    bucket: bucket.id,
    content: fs.readFileSync("./index.html").toString(),
    contentType: "text/html",
}, { dependsOn: [bucketPolicy] });

export const url = bucketWebsite.websiteEndpoint;
