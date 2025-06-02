// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { App, DefaultStackSynthesizer, Tags } from "aws-cdk-lib";
import { ServerlessImageHandlerStack } from "../lib/serverless-image-stack";

// CDK and default deployment
let synthesizer = new DefaultStackSynthesizer({
  generateBootstrapVersionRule: false,
});

// Solutions pipeline deployment
const { DIST_OUTPUT_BUCKET, SOLUTION_NAME, VERSION } = process.env;
if (DIST_OUTPUT_BUCKET && SOLUTION_NAME && VERSION)
  synthesizer = new DefaultStackSynthesizer({
    generateBootstrapVersionRule: false,
    fileAssetsBucketName: `${DIST_OUTPUT_BUCKET}-\${AWS::Region}`,
    bucketPrefix: `${SOLUTION_NAME}/${VERSION}/`,
  });

const app = new App();

const environment = app.node.getContext("environment");
if (!["dev", "prod"].includes(environment)) {
  throw new Error(`Invalid environment: ${environment}`);
}

const solutionDisplayName = "Dynamic Image Transformation for Amazon CloudFront";
const solutionVersion = VERSION ?? app.node.tryGetContext("solutionVersion");
const description = `(${app.node.tryGetContext("solutionId")}) - ${solutionDisplayName}. Version ${solutionVersion}. Environment: ${environment}`;

const camelCasedEnvironment = environment.charAt(0).toUpperCase() + environment.slice(1);
const stack = new ServerlessImageHandlerStack(app, `SnapprApi${camelCasedEnvironment}ImageHandler`, {
  synthesizer,
  description,
  solutionId: app.node.tryGetContext("solutionId"),
  solutionVersion,
  solutionName: app.node.tryGetContext("solutionName"),
});

Tags.of(stack).add("project", `snappr-api-${environment}`);
Tags.of(stack).add("sub-project", `snappr-api-image-handler-${environment}`);
