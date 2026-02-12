import * as ec2 from 'aws-cdk-lib/aws-ec2'
import type * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import { Construct } from 'constructs'

/**
 * Utility construct for importing an existing VPC, subnets, and security groups by ID,
 * and providing the necessary properties to attach AWS Lambda functions to the VPC.
 *
 * Usage:
 *   - Instantiate `VpcImports` with the VPC ID, an array of security group IDs, and an array of subnet IDs.
 *   - Use the `.lambdaProps` property to spread into Lambda function props, ensuring the function is deployed
 *     within the specified VPC, subnets, and security groups.
 *
 * Example:
 *   const vpcImports = new VpcImports(this, 'VpcImports', {
 *     vpcId: 'vpc-123',
 *     securityGroupIds: ['sg-abc'],
 *     subnetIds: ['subnet-1', 'subnet-2'],
 *   });
 *
 *   new NodejsFunction(this, 'Fn', {
 *     ...vpcImports.lambdaProps,
 *     // other lambda props
 *   });
 */

export interface VpcImportsProps {
	vpcId: string
	securityGroupIds: [string, ...string[]]
	subnetIds: [string, ...string[]]
}

export class VpcImports extends Construct {
	public readonly securityGroups: ec2.ISecurityGroup[]
	public readonly subnets: ec2.ISubnet[]
	public readonly vpc: ec2.IVpc

	get lambdaProps() {
		return {
			securityGroups: this.securityGroups,
			vpcSubnets: {
				subnets: this.subnets,
			},
			vpc: this.vpc,
		} satisfies lambda_nodejs.NodejsFunctionProps
	}
	constructor(scope: Construct, id: string, props: VpcImportsProps) {
		super(scope, id)
		const vpcId = props.vpcId
		this.vpc = ec2.Vpc.fromLookup(this, 'VPC', {
			vpcId,
		})
		this.securityGroups = props.securityGroupIds.map((securityGroupId, index) =>
			ec2.SecurityGroup.fromSecurityGroupId(this, `SecurityGroup${index + 1}`, securityGroupId),
		)
		this.subnets = props.subnetIds.map((subnetId, index) =>
			ec2.Subnet.fromSubnetId(this, `Subnet${index + 1}`, subnetId),
		)
	}
}
