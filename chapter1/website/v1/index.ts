import * as aws from "@pulumi/aws";

const bucket = new aws.s3.Bucket("hello-world", {
    website: {
        indexDocument: "index.html"
    }
});

const homepage = new aws.s3.BucketObject("index.html", {
    bucket: bucket,
    acl: aws.s3.PublicReadAcl,
    content: `
        <html>
            <body>Hello, world!</body>
        </html>
    `,
    contentType: "text/html"
});

export const url = bucket.websiteEndpoint;
