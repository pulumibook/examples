import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Read the AWS region from the currently selected stack.
const region = new pulumi.Config("aws").require("region");

// Provision two buckets: one for uploads, one for transcodes.
const inputBucket = new aws.s3.Bucket("input", { forceDestroy: true });
const outputBucket = new aws.s3.Bucket("output", { forceDestroy: true });

// Define a role that grants MediaConvert permission to write to S3.
const convertRole = new aws.iam.Role("convert-role", {
    assumeRolePolicy: {
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Action: "sts:AssumeRole",
                Principal: {
                   Service: "mediaconvert.amazonaws.com",
                },
            },
        ],
    },
    managedPolicyArns: [
        aws.iam.ManagedPolicy.AmazonS3FullAccess,
    ],
});

// Handle uploads by extracting the video filename and creating a new MediaConvert job.
inputBucket.onObjectCreated("handler", new aws.lambda.CallbackFunction("handler", {
    policies: [
        aws.iam.ManagedPolicy.AWSLambdaExecute,
        "arn:aws:iam::aws:policy/AWSElementalMediaConvertFullAccess",
    ],
    callback: async (event: aws.s3.BucketEvent) => {

        // Get the name of the file that was uploaded.
        const key = event.Records![0].s3.object.key;

        // Look up the region-specific MediaConvert endpoint.
        const client = new aws.sdk.MediaConvert({ region });
        const endpoints = await client.describeEndpoints().promise();
        const endpoint = endpoints.Endpoints![0].Url;

        // Submit a new MediaConvert job request.
        const jobRequest = await new aws.sdk.MediaConvert({ endpoint }).createJob({
            Role: convertRole.arn.get(),
            Settings: {
                Inputs: [
                    {
                        FileInput: `s3://${inputBucket.id.get()}/${key}`,
                        AudioSelectors: {
                            "Audio Selector 1": {
                                SelectorType: "TRACK",
                                Tracks: [ 1 ],
                            },
                        },
                    },
                ],
                OutputGroups: [
                    {
                        Name: "File Group",
                        Outputs: [
                            {
                                "Extension": "mp4",
                                "Preset": "System-Generic_Hd_Mp4_Avc_Aac_16x9_1280x720p_24Hz_4.5Mbps"
                            },
                        ],
                        OutputGroupSettings: {
                            Type: "FILE_GROUP_SETTINGS",
                            FileGroupSettings: {
                                Destination: `s3://${outputBucket.id.get()}/${key}`,
                            },
                        },
                    },
                ],
            },
        }).promise();

        // Log the request result.
        console.log({ jobRequest });
    },
}));

// Export the input and output bucket IDs.
export const inputBucketID = inputBucket.id;
export const outputBucketID = outputBucket.id;
