#!/bin/bash

set -o errexit -o pipefail

pulumi about

# Create/select the example stacks in the org our credentials are scoped to.
# In CI the token comes from GitHub OIDC via pulumi/auth-actions with
# `organization: pulumibook`, so it can only operate on `pulumibook` stacks —
# an unqualified `dev` resolves to the caller's individual org and fails with
# "requires logging in". PULUMI_ORG names the target org; locally, with it
# unset, we fall back to the caller's default org (unqualified `dev`).
stack="${PULUMI_ORG:+$PULUMI_ORG/}dev"

programs=$(find . -name "Pulumi.dev.yaml" -not -path "*/node_modules/*" -exec dirname {} \;)

# Iterate through each program to make sure it installs, previews, deploy, and destroys successfully.
for program in $programs; do
    echo
    echo "------------"
    echo "Testing $program"
    echo "------------"
    echo

    pushd "$program" || exit 1

        # Skip tests that can't be run yet.
        if [ $program == "./website/ghost-on-digitalocean" ]; then
            continue
        fi

        ncu -u
        npm install

        pulumi stack init "$stack" || true
        pulumi stack select "$stack"
        pulumi destroy --yes

        # Set any required environment variables.
        if [ $program == "./chapter3/health-checker" ]; then
            npm install got@11
            export SCHEDULE="rate(1 minute)";
            export SITE_URL="https://thepulumibook.com/ch03/health-checker/api/dev";
            export WEBHOOK_URL="https://hooks.slack.com/services/abc/123/456";
        fi

        if [ $program == "./chapter4/health-checker" ]; then
            npm install got@11
            pulumi config refresh
        fi

        if [ $program == "./chapter4/health-checker-with-secrets-manager" ]; then
            npm install got@11
            pulumi config refresh
        fi

        pulumi up --yes
        pulumi destroy --yes

    popd || exit 1
done
