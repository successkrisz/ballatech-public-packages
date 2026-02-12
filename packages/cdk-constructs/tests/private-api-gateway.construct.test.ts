import { App, Stack } from 'aws-cdk-lib'
import { Match, Template } from 'aws-cdk-lib/assertions'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as iam from 'aws-cdk-lib/aws-iam'
import { describe, expect, it } from 'vitest'
import { PrivateApiGateway } from '../src/private-api-gateway.construct'

function createTestStack() {
	const app = new App()
	const stack = new Stack(app, 'TestStack')
	const vpc = new ec2.Vpc(stack, 'TestVpc')
	return { app, stack, vpc }
}

/**
 * CDK RestApi validation requires at least one method.
 * Add a dummy GET method so Template.fromStack() can synthesize.
 */
function addDummyMethod(gateway: PrivateApiGateway) {
	gateway.api.root.addMethod('GET', new apigateway.MockIntegration())
}

describe('PrivateApiGateway', () => {
	describe('RestApi basics', () => {
		it('creates a PRIVATE endpoint RestApi with correct name and default description', () => {
			const { stack, vpc } = createTestStack()

			const gateway = new PrivateApiGateway(stack, 'TestApi', {
				vpc,
				productName: 'MyProduct',
				stageName: 'Dev',
			})
			addDummyMethod(gateway)

			const template = Template.fromStack(stack)

			template.hasResourceProperties('AWS::ApiGateway::RestApi', {
				Name: 'myproduct-dev-private-api',
				Description: 'myproduct',
				EndpointConfiguration: {
					Types: ['PRIVATE'],
				},
			})
		})

		it('lowercases productName and stageName for naming', () => {
			const { stack, vpc } = createTestStack()

			const gateway = new PrivateApiGateway(stack, 'TestApi', {
				vpc,
				productName: 'MyPRODUCT',
				stageName: 'STAGING',
			})
			addDummyMethod(gateway)

			const template = Template.fromStack(stack)

			template.hasResourceProperties('AWS::ApiGateway::RestApi', {
				Name: 'myproduct-staging-private-api',
				Description: 'myproduct',
			})
		})

		it('uses custom description when provided', () => {
			const { stack, vpc } = createTestStack()

			const gateway = new PrivateApiGateway(stack, 'TestApi', {
				vpc,
				productName: 'MyProduct',
				stageName: 'Dev',
				description: 'My custom API description',
			})
			addDummyMethod(gateway)

			const template = Template.fromStack(stack)

			template.hasResourceProperties('AWS::ApiGateway::RestApi', {
				Description: 'My custom API description',
			})
		})

		it('sets the deploy stage name from stageName prop', () => {
			const { stack, vpc } = createTestStack()

			const gateway = new PrivateApiGateway(stack, 'TestApi', {
				vpc,
				productName: 'MyProduct',
				stageName: 'Prod',
			})
			addDummyMethod(gateway)

			const template = Template.fromStack(stack)

			template.hasResourceProperties('AWS::ApiGateway::Stage', {
				StageName: 'prod',
			})
		})
	})

	describe('VPC Endpoint creation', () => {
		it('creates a VPC Interface Endpoint when createVpcEndpoint is true', () => {
			const { stack, vpc } = createTestStack()

			const gateway = new PrivateApiGateway(stack, 'TestApi', {
				vpc,
				productName: 'MyProduct',
				stageName: 'Dev',
				createVpcEndpoint: true,
			})
			addDummyMethod(gateway)

			const template = Template.fromStack(stack)

			template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
				VpcEndpointType: 'Interface',
				PrivateDnsEnabled: true,
				ServiceName: Match.anyValue(),
			})
		})

		it('does not create a VPC Endpoint when createVpcEndpoint is omitted', () => {
			const { stack, vpc } = createTestStack()

			const gateway = new PrivateApiGateway(stack, 'TestApi', {
				vpc,
				productName: 'MyProduct',
				stageName: 'Dev',
			})
			addDummyMethod(gateway)

			const template = Template.fromStack(stack)

			template.resourceCountIs('AWS::EC2::VPCEndpoint', 0)
		})

		it('does not create a VPC Endpoint when createVpcEndpoint is false', () => {
			const { stack, vpc } = createTestStack()

			const gateway = new PrivateApiGateway(stack, 'TestApi', {
				vpc,
				productName: 'MyProduct',
				stageName: 'Dev',
				createVpcEndpoint: false,
			})
			addDummyMethod(gateway)

			const template = Template.fromStack(stack)

			template.resourceCountIs('AWS::EC2::VPCEndpoint', 0)
		})
	})

	describe('IAM Resource Policy', () => {
		it('generates ALLOW and DENY statements with exact SourceVpce conditions for allowedVpcEndpointIds', () => {
			const { stack, vpc } = createTestStack()

			const gateway = new PrivateApiGateway(stack, 'TestApi', {
				vpc,
				productName: 'MyProduct',
				stageName: 'Dev',
				allowedVpcEndpointIds: ['vpce-1234567890abcdef0'],
			})
			addDummyMethod(gateway)

			const template = Template.fromStack(stack)

			template.hasResourceProperties('AWS::ApiGateway::RestApi', {
				Policy: {
					Statement: Match.arrayWith([
						Match.objectLike({
							Effect: 'Allow',
							Principal: { AWS: '*' },
							Action: 'execute-api:Invoke',
							Resource: 'execute-api:/*',
							Condition: {
								StringEquals: {
									'aws:SourceVpce': ['vpce-1234567890abcdef0'],
								},
							},
						}),
						Match.objectLike({
							Effect: 'Deny',
							Principal: { AWS: '*' },
							Action: 'execute-api:Invoke',
							Resource: 'execute-api:/*',
							Condition: {
								StringNotEquals: {
									'aws:SourceVpce': ['vpce-1234567890abcdef0'],
								},
							},
						}),
					]),
				},
			})
		})

		it('generates ALLOW and DENY statements with multiple VPC endpoint IDs', () => {
			const { stack, vpc } = createTestStack()

			const gateway = new PrivateApiGateway(stack, 'TestApi', {
				vpc,
				productName: 'MyProduct',
				stageName: 'Dev',
				allowedVpcEndpointIds: ['vpce-aaa', 'vpce-bbb'],
			})
			addDummyMethod(gateway)

			const template = Template.fromStack(stack)

			template.hasResourceProperties('AWS::ApiGateway::RestApi', {
				Policy: {
					Statement: Match.arrayWith([
						Match.objectLike({
							Effect: 'Allow',
							Condition: {
								StringEquals: {
									'aws:SourceVpce': ['vpce-aaa', 'vpce-bbb'],
								},
							},
						}),
						Match.objectLike({
							Effect: 'Deny',
							Condition: {
								StringNotEquals: {
									'aws:SourceVpce': ['vpce-aaa', 'vpce-bbb'],
								},
							},
						}),
					]),
				},
			})
		})

		it('includes auto-created VPC endpoint ID in policy when createVpcEndpoint is true', () => {
			const { stack, vpc } = createTestStack()

			const gateway = new PrivateApiGateway(stack, 'TestApi', {
				vpc,
				productName: 'MyProduct',
				stageName: 'Dev',
				createVpcEndpoint: true,
			})
			addDummyMethod(gateway)

			const template = Template.fromStack(stack)

			// The auto-created endpoint ID is a Ref token in the synthesized template
			template.hasResourceProperties('AWS::ApiGateway::RestApi', {
				Policy: {
					Statement: Match.arrayWith([
						Match.objectLike({
							Effect: 'Allow',
							Principal: { AWS: '*' },
							Action: 'execute-api:Invoke',
							Resource: 'execute-api:/*',
							Condition: {
								StringEquals: {
									'aws:SourceVpce': Match.anyValue(),
								},
							},
						}),
						Match.objectLike({
							Effect: 'Deny',
							Principal: { AWS: '*' },
							Action: 'execute-api:Invoke',
							Resource: 'execute-api:/*',
							Condition: {
								StringNotEquals: {
									'aws:SourceVpce': Match.anyValue(),
								},
							},
						}),
					]),
				},
			})

			// Confirm the VPC Endpoint resource was created
			template.resourceCountIs('AWS::EC2::VPCEndpoint', 1)
		})

		it('combines auto-created and provided VPC endpoint IDs in policy statements', () => {
			const { stack, vpc } = createTestStack()

			const gateway = new PrivateApiGateway(stack, 'TestApi', {
				vpc,
				productName: 'MyProduct',
				stageName: 'Dev',
				createVpcEndpoint: true,
				allowedVpcEndpointIds: ['vpce-external'],
			})
			addDummyMethod(gateway)

			const template = Template.fromStack(stack)

			// The policy conditions should contain an array with both the literal ID and the Ref token
			template.hasResourceProperties('AWS::ApiGateway::RestApi', {
				Policy: {
					Statement: Match.arrayWith([
						Match.objectLike({
							Effect: 'Allow',
							Condition: {
								StringEquals: {
									'aws:SourceVpce': Match.arrayWith(['vpce-external']),
								},
							},
						}),
						Match.objectLike({
							Effect: 'Deny',
							Condition: {
								StringNotEquals: {
									'aws:SourceVpce': Match.arrayWith(['vpce-external']),
								},
							},
						}),
					]),
				},
			})

			// Both the auto-created VPC Endpoint and the RestApi should exist
			template.resourceCountIs('AWS::EC2::VPCEndpoint', 1)
		})

		it('does not attach a resource policy when no VPC endpoint IDs are present', () => {
			const { stack, vpc } = createTestStack()

			const gateway = new PrivateApiGateway(stack, 'TestApi', {
				vpc,
				productName: 'MyProduct',
				stageName: 'Dev',
			})
			addDummyMethod(gateway)

			const template = Template.fromStack(stack)

			template.hasResourceProperties('AWS::ApiGateway::RestApi', {
				Policy: Match.absent(),
			})
		})

		it('appends custom policy statements alongside auto-generated ALLOW/DENY', () => {
			const { stack, vpc } = createTestStack()

			const customStatement = new iam.PolicyStatement({
				effect: iam.Effect.ALLOW,
				principals: [new iam.AccountRootPrincipal()],
				actions: ['execute-api:Invoke'],
				resources: ['execute-api:/*/GET/*'],
			})

			const gateway = new PrivateApiGateway(stack, 'TestApi', {
				vpc,
				productName: 'MyProduct',
				stageName: 'Dev',
				allowedVpcEndpointIds: ['vpce-12345'],
				policyStatements: [customStatement],
			})
			addDummyMethod(gateway)

			const template = Template.fromStack(stack)

			template.hasResourceProperties('AWS::ApiGateway::RestApi', {
				Policy: {
					Statement: Match.arrayWith([
						// Auto-generated ALLOW statement
						Match.objectLike({
							Effect: 'Allow',
							Principal: { AWS: '*' },
							Action: 'execute-api:Invoke',
							Condition: {
								StringEquals: {
									'aws:SourceVpce': ['vpce-12345'],
								},
							},
						}),
						// Auto-generated DENY statement
						Match.objectLike({
							Effect: 'Deny',
							Principal: { AWS: '*' },
							Action: 'execute-api:Invoke',
							Condition: {
								StringNotEquals: {
									'aws:SourceVpce': ['vpce-12345'],
								},
							},
						}),
						// Custom appended statement
						Match.objectLike({
							Effect: 'Allow',
							Action: 'execute-api:Invoke',
							Resource: 'execute-api:/*/GET/*',
						}),
					]),
				},
			})
		})

		it('only includes custom policy statements when no VPC endpoint IDs are provided', () => {
			const { stack, vpc } = createTestStack()

			const customStatement = new iam.PolicyStatement({
				effect: iam.Effect.DENY,
				principals: [new iam.AnyPrincipal()],
				actions: ['execute-api:Invoke'],
				resources: ['execute-api:/*'],
				conditions: {
					NotIpAddress: { 'aws:SourceIp': '10.0.0.0/8' },
				},
			})

			const gateway = new PrivateApiGateway(stack, 'TestApi', {
				vpc,
				productName: 'MyProduct',
				stageName: 'Dev',
				policyStatements: [customStatement],
			})
			addDummyMethod(gateway)

			const template = Template.fromStack(stack)

			template.hasResourceProperties('AWS::ApiGateway::RestApi', {
				Policy: {
					Statement: Match.arrayWith([
						Match.objectLike({
							Effect: 'Deny',
							Condition: {
								NotIpAddress: { 'aws:SourceIp': '10.0.0.0/8' },
							},
						}),
					]),
				},
			})
		})
	})

	describe('CORS', () => {
		it('enables permissive CORS defaults when enableCors is true', () => {
			const { stack, vpc } = createTestStack()

			new PrivateApiGateway(stack, 'TestApi', {
				vpc,
				productName: 'MyProduct',
				stageName: 'Dev',
				enableCors: true,
			})

			const template = Template.fromStack(stack)

			// An OPTIONS method should be created for CORS preflight
			template.hasResourceProperties('AWS::ApiGateway::Method', {
				HttpMethod: 'OPTIONS',
				Integration: Match.objectLike({
					IntegrationResponses: Match.arrayWith([
						Match.objectLike({
							ResponseParameters: Match.objectLike({
								'method.response.header.Access-Control-Allow-Origin': "'*'",
							}),
						}),
					]),
				}),
			})
		})

		it('applies custom CORS origins when provided', () => {
			const { stack, vpc } = createTestStack()

			new PrivateApiGateway(stack, 'TestApi', {
				vpc,
				productName: 'MyProduct',
				stageName: 'Dev',
				enableCors: {
					allowOrigins: ['https://example.com'],
					allowMethods: ['GET', 'POST'],
				},
			})

			const template = Template.fromStack(stack)

			template.hasResourceProperties('AWS::ApiGateway::Method', {
				HttpMethod: 'OPTIONS',
				Integration: Match.objectLike({
					IntegrationResponses: Match.arrayWith([
						Match.objectLike({
							ResponseParameters: Match.objectLike({
								'method.response.header.Access-Control-Allow-Origin': "'https://example.com'",
								'method.response.header.Access-Control-Allow-Methods': "'GET,POST'",
							}),
						}),
					]),
				}),
			})
		})

		it('does not create an OPTIONS method when enableCors is omitted', () => {
			const { stack, vpc } = createTestStack()

			const gateway = new PrivateApiGateway(stack, 'TestApi', {
				vpc,
				productName: 'MyProduct',
				stageName: 'Dev',
			})
			addDummyMethod(gateway)

			const template = Template.fromStack(stack)

			// Only the dummy GET method should exist, no OPTIONS for CORS
			const methods = template.findResources('AWS::ApiGateway::Method')
			const httpMethods = Object.values(methods).map(
				(m) => (m.Properties as Record<string, unknown>).HttpMethod,
			)
			expect(httpMethods).not.toContain('OPTIONS')
		})
	})

	describe('Extra config', () => {
		it('merges extra restApiProps into the RestApi', () => {
			const { stack, vpc } = createTestStack()

			const gateway = new PrivateApiGateway(stack, 'TestApi', {
				vpc,
				productName: 'MyProduct',
				stageName: 'Dev',
				restApiProps: {
					failOnWarnings: true,
				},
			})
			addDummyMethod(gateway)

			const template = Template.fromStack(stack)

			template.hasResourceProperties('AWS::ApiGateway::RestApi', {
				FailOnWarnings: true,
			})
		})

		it('exposes the api property as a RestApi instance', () => {
			const { stack, vpc } = createTestStack()

			const gateway = new PrivateApiGateway(stack, 'TestApi', {
				vpc,
				productName: 'MyProduct',
				stageName: 'Dev',
			})

			expect(gateway.api).toBeDefined()
			expect(gateway.api).toBeInstanceOf(apigateway.RestApi)
		})

		it('exposes the vpcEndpoint property when createVpcEndpoint is true', () => {
			const { stack, vpc } = createTestStack()

			const gateway = new PrivateApiGateway(stack, 'TestApi', {
				vpc,
				productName: 'MyProduct',
				stageName: 'Dev',
				createVpcEndpoint: true,
			})

			expect(gateway.vpcEndpoint).toBeDefined()
			expect(gateway.vpcEndpoint).toBeInstanceOf(ec2.InterfaceVpcEndpoint)
		})

		it('does not expose a vpcEndpoint property when createVpcEndpoint is false', () => {
			const { stack, vpc } = createTestStack()

			const gateway = new PrivateApiGateway(stack, 'TestApi', {
				vpc,
				productName: 'MyProduct',
				stageName: 'Dev',
			})

			expect(gateway.vpcEndpoint).toBeUndefined()
		})
	})
})
