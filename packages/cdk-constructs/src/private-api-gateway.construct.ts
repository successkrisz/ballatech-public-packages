import { aws_ec2, Stack } from 'aws-cdk-lib'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'

export interface PrivateApiGatewayProps {
	/**
	 * VPC where the API Gateway private endpoint will be accessible.
	 */
	vpc: ec2.IVpc

	/**
	 * Lowercased and combined with stage to form resource names.
	 */
	productName: string

	/**
	 * Environment/stage name (e.g., dev, test, prod).
	 */
	stageName: string

	/**
	 * Optional description for the API.
	 */
	description?: string

	/**
	 * Create an Interface VPC Endpoint for API Gateway in the provided VPC.
	 * Defaults to false.
	 */
	createVpcEndpoint?: boolean

	/**
	 * Additional existing VPC Endpoint IDs that are allowed to invoke this API.
	 */
	allowedVpcEndpointIds?: string[]

	/**
	 * Extra policy statements to append to the API resource policy.
	 */
	policyStatements?: iam.PolicyStatement[]

	/**
	 * Extra RestApi props to merge in. Endpoint configuration and policy are managed by this construct.
	 */
	restApiProps?: Omit<
		apigateway.RestApiProps,
		'endpointConfiguration' | 'policy' | 'defaultCorsPreflightOptions' | 'deployOptions'
	>

	/**
	 * Enable CORS for the API. Provide true for permissive defaults or supply custom options.
	 */
	enableCors?: boolean | apigateway.CorsOptions
}

export class PrivateApiGateway extends Construct {
	public readonly api: apigateway.RestApi
	public readonly vpcEndpoint?: ec2.InterfaceVpcEndpoint

	public readonly apiUrl: string

	constructor(scope: Construct, id: string, props: PrivateApiGatewayProps) {
		super(scope, id)

		const productName = props.productName.toLowerCase()
		const stageName = props.stageName.toLowerCase()
		const prefix = `${productName}-${stageName}`

		const shouldCreateVpcEndpoint = props.createVpcEndpoint ?? false

		if (shouldCreateVpcEndpoint) {
			this.vpcEndpoint = new ec2.InterfaceVpcEndpoint(this, `${prefix}-ExecuteApiVpcEndpoint`, {
				vpc: props.vpc,
				service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
				privateDnsEnabled: true,
				subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
			})
		}

		const allowedVpceIds = [
			...(props.allowedVpcEndpointIds ?? []),
			...(this.vpcEndpoint ? [this.vpcEndpoint.vpcEndpointId] : []),
		]

		const statements: iam.PolicyStatement[] = []

		const hasAllowedVpceIds = allowedVpceIds.length > 0

		if (hasAllowedVpceIds) {
			// Allow invokes only from the specified VPC endpoints
			statements.push(
				new iam.PolicyStatement({
					effect: iam.Effect.ALLOW,
					principals: [new iam.AnyPrincipal()],
					actions: ['execute-api:Invoke'],
					resources: ['execute-api:/*'],
					conditions: { StringEquals: { 'aws:SourceVpce': allowedVpceIds } },
				}),
			)

			// Explicitly deny all other VPC endpoints
			statements.push(
				new iam.PolicyStatement({
					effect: iam.Effect.DENY,
					principals: [new iam.AnyPrincipal()],
					actions: ['execute-api:Invoke'],
					resources: ['execute-api:/*'],
					conditions: { StringNotEquals: { 'aws:SourceVpce': allowedVpceIds } },
				}),
			)
		}

		if (props.policyStatements && props.policyStatements.length > 0) {
			statements.push(...props.policyStatements)
		}

		const policy = statements.length ? new iam.PolicyDocument({ statements }) : undefined

		const defaultCors =
			props.enableCors === true
				? {
						allowOrigins: apigateway.Cors.ALL_ORIGINS,
						allowMethods: apigateway.Cors.ALL_METHODS,
					}
				: props.enableCors || undefined

		this.api = new apigateway.RestApi(this, `${prefix}-PrivateRestApi`, {
			restApiName: `${prefix}-private-api`,
			description: props.description ?? productName,
			endpointConfiguration: {
				types: [apigateway.EndpointType.PRIVATE],
				vpcEndpoints: hasAllowedVpceIds
					? allowedVpceIds.map((id, index) =>
							aws_ec2.InterfaceVpcEndpoint.fromInterfaceVpcEndpointAttributes(
								this,
								`VpcEndpoint${index}`,
								{
									vpcEndpointId: id,
									port: 443,
								},
							),
						)
					: undefined,
			},
			policy,
			defaultCorsPreflightOptions: defaultCors,
			deployOptions: { stageName },
			...props.restApiProps,
		})

		this.apiUrl = hasAllowedVpceIds
			? `${this.api.restApiId}-${allowedVpceIds[0]}.execute-api.${Stack.of(this).region}.${Stack.of(this).urlSuffix}`
			: `${this.api.restApiId}.execute-api.${Stack.of(this).region}.${Stack.of(this).urlSuffix}`
	}
}
