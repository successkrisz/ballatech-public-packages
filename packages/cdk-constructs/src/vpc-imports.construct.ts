import * as ec2 from 'aws-cdk-lib/aws-ec2'
import type * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import { Construct } from 'constructs'

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
