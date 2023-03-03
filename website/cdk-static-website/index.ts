import * as pulumi from "@pulumi/pulumi";
import * as pulumicdk from "@pulumi/cdk";
import * as synced from "@pulumi/synced-folder";
import * as cdk from "aws-cdk-lib";

const config = new pulumi.Config();
const path = config.require("path");
const indexDocument = config.require("indexDocument");
const errorDocument = config.require("errorDocument");

// The CDK stack defines an S3 bucket and CloudFront distribution.
class CDKStack extends pulumicdk.Stack {
    bucketName: pulumi.Output<string>;
    originURL: pulumi.Output<string>;
    cdnURL: pulumi.Output<string>;

    constructor(id: string, options?: pulumicdk.StackOptions) {
        super(id, options);

        // Origin bucket.
        const bucket = new cdk.aws_s3.Bucket(this, "bucket", {
            websiteIndexDocument: indexDocument,
            websiteErrorDocument: errorDocument,
            accessControl: cdk.aws_s3.BucketAccessControl.PUBLIC_READ,
        });

        // CloudFront distribution.
        const cdn = new cdk.aws_cloudfront.Distribution(this, "cdn", {
            defaultRootObject: indexDocument,
            defaultBehavior: {
                origin: new cdk.aws_cloudfront_origins.S3Origin(bucket),
            },
        });

        // Export the bucket name, bucket URL, and CDN URL as Pulumi outputs.
        this.bucketName = this.asOutput(bucket.bucketName);
        this.originURL = this.asOutput(bucket.bucketWebsiteUrl);
        this.cdnURL = this.asOutput(`https://${cdn.distributionDomainName}`);

        this.synth();
    }
}

const cdkStack =  new CDKStack("cdk-stack");

// Sync a local folder to the bucket exported by the CDK stack.
const folder = new synced.S3BucketFolder("folder", {
    bucketName: cdkStack.bucketName,
    path: path,
    acl: "public-read",
});

// Export the S3 and CloudFront URLs.
export const originURL = cdkStack.originURL;
export const cdnURL = cdkStack.cdnURL;
