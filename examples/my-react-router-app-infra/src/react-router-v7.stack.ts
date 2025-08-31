import { CfnOutput, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib'
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as cloudfront_origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import { BlockPublicAccess, ObjectOwnership } from 'aws-cdk-lib/aws-s3'
import * as s3_deployment from 'aws-cdk-lib/aws-s3-deployment'
import { Construct } from 'constructs'

export interface ReactRouterV7StackProps {
	serverBuildPath: string
	clientBuildPath: string
	environment: {
		[key: string]: string
	}
	distributionProps?: cloudfront.DistributionProps
}

export class ReactRouterV7Stack extends Construct {
	public readonly bucket: s3.Bucket
	public readonly lambda: lambda_nodejs.NodejsFunction
	public readonly api: apigatewayv2.HttpApi
	public readonly distribution: cloudfront.Distribution
	constructor(scope: Construct, id: string, props: ReactRouterV7StackProps) {
		super(scope, id)
		const prefix = 'kb-test'
		const productName = 'kb-test'

		this.bucket = new s3.Bucket(this, `${prefix}-ServerBucket`, {
			blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
			bucketName: `${prefix}-server`,
			objectOwnership: ObjectOwnership.OBJECT_WRITER,
			publicReadAccess: false,
			removalPolicy: RemovalPolicy.DESTROY,
			autoDeleteObjects: true,
		})

		const bucketOriginAccessIdentity = new cloudfront.OriginAccessIdentity(
			this,
			'BucketOriginAccessIdentity',
		)
		this.bucket.grantRead(bucketOriginAccessIdentity)

		this.lambda = new lambda_nodejs.NodejsFunction(this, `${prefix}-ServerLambda`, {
			functionName: `${prefix}-server`,
			description: productName,
			runtime: lambda.Runtime.NODEJS_22_X,
			memorySize: 1536,
			entry: props.serverBuildPath,
			bundling: {
				minify: true,
				sourceMap: false,
				target: 'node22',
				mainFields: ['module', 'main'],
				externalModules: ['aws-sdk', '@aws-sdk/*'],
			},
			tracing: lambda.Tracing.ACTIVE,
			timeout: Duration.minutes(5),
			logRetention: logs.RetentionDays.THREE_DAYS,
			environment: props.environment,
		})

		const frontendLambdaIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
			`${prefix}-HttpLambdaIntegration`,
			this.lambda,
		)

		this.api = new apigatewayv2.HttpApi(this, `${prefix}-FrontendApi`, {
			apiName: `${prefix}-api`,
			defaultIntegration: frontendLambdaIntegration,
		})

		const serverApiUrl = `${this.api.httpApiId}.execute-api.${
			Stack.of(this).region
		}.${Stack.of(this).urlSuffix}`

		const createS3OriginConfig = () => ({
			allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
			cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
			compress: true,
			origin: new cloudfront_origins.S3Origin(this.bucket, {
				originAccessIdentity: bucketOriginAccessIdentity,
			}),
			viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
		})

		this.distribution = new cloudfront.Distribution(this, `${prefix}-Distribution`, {
			...props.distributionProps,
			defaultBehavior: {
				allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
				cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
				compress: true,
				origin: new cloudfront_origins.HttpOrigin(serverApiUrl),
				originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
				viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
			},
			additionalBehaviors: {
				'favicon.ico': createS3OriginConfig(),
				'assets/*': createS3OriginConfig(),
				'images/*': createS3OriginConfig(),
				'locales/*': createS3OriginConfig(),
			},
			enableLogging: false,
		})

		new s3_deployment.BucketDeployment(this, `${prefix}-FrontendBucketDeployment`, {
			sources: [s3_deployment.Source.asset(props.clientBuildPath)],
			destinationBucket: this.bucket,
			distribution: this.distribution,
		})

		new CfnOutput(this, 'DomainName', {
			value: this.distribution.distributionDomainName,
		})

		new CfnOutput(this, 'ServerBucketName', {
			value: this.bucket.bucketName,
		})
	}
}
