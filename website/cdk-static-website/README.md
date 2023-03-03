# cdk-static-website

A simple example that combines AWS CDK constructs and Pulumi resources in the same program to deploy a static website on Amazon S3 and serve it with Amazon CloudFront.

[![Deploy with Pulumi](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/cnunciato/pulumi-cdk-static-website)

To try it yourself, first [install Pulumi](https://www.pulumi.com/docs/get-started/install/), then create a new project using this repository as a template:

```
$ pulumi new https://github.com/cnunciato/pulumi-cdk-static-website
```

Follow the prompts, make sure your [AWS credentials are set](https://www.pulumi.com/registry/packages/aws-native/installation-configuration/#set-environment-variables), then deploy:

```bash
$ pulumi up

Updating (dev)

View Live: https://app.pulumi.com/cnunciato/pulumi-cdk-static-website/dev/updates/1

     Type                                            Name                              Status
 +   pulumi:pulumi:Stack                             pulumi-cdk-static-website-dev     created (253s)
 +   ├─ cdk:index:Stack                              cdk-stack                         created (0.45s)
 +   │  └─ cdk:construct:CDKStack                    cdk-stack/cdk-stack               created (0.27s)
 +   │     ├─ cdk:construct:Distribution             cdk-stack/cdk-stack/cdn           created (0.33s)
 +   │     │  └─ aws-native:cloudfront:Distribution  cdnE31FB0B1                       created (213s)
 +   │     └─ cdk:construct:Bucket                   cdk-stack/cdk-stack/bucket        created (0.56s)
 +   │        └─ aws-native:s3:Bucket                bucket43879c71                    created (34s)
 +   └─ synced-folder:index:S3BucketFolder           folder                            created (0.48s)
 +      ├─ aws:s3:BucketObject                       index.html                        created (0.55s)
 +      └─ aws:s3:BucketObject                       error.html                        created (0.57s)

Outputs:
    cdnURL   : "https://dvoe67jugq08p.cloudfront.net"
    originURL: "http://bucket43879c71-02ba1e4.s3-website-us-west-2.amazonaws.com"

Resources:
    + 10 created

Duration: 4m15s
```

In a few minutes, you should be able to browse to your newly deployed website: ✨

```bash
$ open $(pulumi stack output cdnURL)
```
