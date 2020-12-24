import * as aws from "@pulumi/aws";
import * as fs from "fs";

const bucket = new aws.s3.Bucket("hello-world", {
    website: {
        indexDocument: "index.html"
    }
});

const homepage = new aws.s3.BucketObject("index.html", {
    bucket: bucket,
    acl: aws.s3.PublicReadAcl,
    content: fs.readFileSync("./index.html").toString(),
    contentType: "text/html"
});

export const url = bucket.websiteEndpoint
    .apply(endpoint => `http://${endpoint}`);
