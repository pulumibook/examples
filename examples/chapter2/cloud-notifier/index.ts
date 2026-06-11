import * as aws from "@pulumi/aws";
import { SNS } from "@aws-sdk/client-sns";

const topic = new aws.sns.Topic("topic");

const subscription = new aws.sns.TopicSubscription("subscription", {
    topic: topic,
    protocol: "email",
    endpoint: "you@example.com",
});

const schedule = "rate(1 minute)";

const handler = new aws.lambda.CallbackFunction("handler", {
    policies: [
        aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
        aws.iam.ManagedPolicy.AmazonSNSFullAccess,
    ],
    callback: async () => {
        const kids = ["Oliver", "Sam", "Rosemary"];

        const shuffled = kids
            .sort(() => Math.random() > .5 ? -1 : 1)
            .join(", ");

        const message = `This week's game-playing order: ${shuffled}.`;

        const sns = new SNS();

        try {
            const response = await sns.publish({
                Subject: "Game day!",
                Message: message,
                TopicArn: topic.arn.get(),
            });
            console.log(response);
        } catch (error) {
            console.error(error);
        }
    },
});

aws.cloudwatch.onSchedule("handler", schedule, handler);
