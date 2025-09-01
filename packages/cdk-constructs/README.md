# @ballatech/cdk-constructs

Reusable CDK constructs

## Available Constructs

- `ReactRouter7App`

### ReactRouter7App

A construct that creates a React Router 7 app using:

- AWS Lambda: to serve the serverside requests
- AWS API Gateway: to connect the Lambda function to CloudFront
- AWS CloudFront: to serve the entire application
- AWS S3: to store static assets

Should be used in combination with `@ballatech/react-router7-preset-aws` package to create the serverside build output.
