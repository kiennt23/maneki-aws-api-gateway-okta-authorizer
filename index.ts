// eslint-disable-next-line @typescript-eslint/no-var-requires
const OktaJwtVerifier = require("@okta/jwt-verifier");

class AuthPolicy {
  awsAccountId: string;
  principalId: string;
  version = "2012-10-17";
  pathRegex = new RegExp("^[/.a-zA-Z0-9-*]+$");
  allowMethods: Method[] = [];
  denyMethods: Method[] = [];
  apiOptions: ApiOptions;

  constructor(principal: string, awsAccountId: string, apiOptions: ApiOptions) {
    this.principalId = principal;
    this.awsAccountId = awsAccountId;
    this.apiOptions = apiOptions;
  }

  addMethod(effect: Effect, verb: HttpVerb, resource: string, conditions: Condition[]) {
    if (!this.pathRegex.test(resource)) {
      throw new Error(`Invalid resource path: ${resource}. Path should match ${this.pathRegex}`);
    }
    let cleanedResource = resource;
    if (resource.startsWith("/")) {
      cleanedResource = resource.substring(1, resource.length);
    }
    const resourceArn =
      "arn:aws:execute-api:" +
      this.apiOptions.region +
      ":" +
      this.awsAccountId +
      ":" +
      this.apiOptions.restApiId +
      "/" +
      this.apiOptions.stage +
      "/" +
      verb +
      "/" +
      cleanedResource;

    if (effect === "Allow") {
      this.allowMethods.push({
        resourceArn,
        conditions,
      });
    } else if (effect === "Deny") {
      this.denyMethods.push({
        resourceArn,
        conditions,
      });
    }
  }

  allowAllMethods() {
    this.addMethod("Allow", "*", "*", null);
  }

  denyAllMethods() {
    this.addMethod("Deny", "*", "*", null);
  }

  allowMethod(verb: HttpVerb, resource: string) {
    this.addMethod("Allow", verb, resource, null);
  }

  allowMethodWithConditions(verb: HttpVerb, resource: string, conditions: Condition[]) {
    this.addMethod("Allow", verb, resource, conditions);
  }

  denyMethod(verb: HttpVerb, resource: string) {
    this.addMethod("Deny", verb, resource, null);
  }

  denyMethodWithConditions(verb: HttpVerb, resource: string, conditions: Condition[]) {
    this.addMethod("Deny", verb, resource, conditions);
  }

  getEmptyStatement(effect: Effect): PolicyStatement {
    return {
      Action: "execute-api:Invoke",
      Effect: effect,
      Resource: [],
    };
  }

  getStatementsForEffect(effect: Effect, methods: Method[]): PolicyStatement[] {
    const statements: PolicyStatement[] = [];
    if (methods && methods.length > 0) {
      const statement = this.getEmptyStatement(effect);
      for (const method of methods) {
        if (method.conditions === null || method.conditions.length === 0) {
          statement.Resource.push(method.resourceArn);
        } else {
          const conditionalStatement = this.getEmptyStatement(effect);
          conditionalStatement.Resource.push(method.resourceArn);
          conditionalStatement.Condition = method.conditions;
          statements.push(conditionalStatement);
        }
      }
      if (statement.Resource.length > 0) {
        statements.push(statement);
      }
    }
    return statements;
  }

  build(): Policy {
    if (
      (!this.allowMethods || this.allowMethods.length == 0) &&
      (!this.denyMethods || this.denyMethods.length == 0)
    ) {
      throw new Error("No statements defined for the policy");
    }
    return {
      principalId: this.principalId,
      policyDocument: {
        Version: this.version,
        Statement: [
          ...this.getStatementsForEffect("Allow", this.allowMethods),
          ...this.getStatementsForEffect("Deny", this.denyMethods),
        ],
      },
      context: {
        principalId: this.principalId,
      },
    };
  }
}

export const handler = async (event: any = {}, context: any = {}): Promise<any> => {
  const token = event.headers.authorization;
  const jwtVerifier = new OktaJwtVerifier({
    clientId: process.env.OKTA_CLIENTID,
    issuer: process.env.OKTA_ISSUER,
  });
  const {
    claims: { sub },
  } = await jwtVerifier.verifyAccessToken(token, process.env.OKTA_AUDIENCE);
  const principalId = sub;
  const tmp = event.routeArn.split(":");
  const apiGatewayArnTmp = tmp[5].split("/");
  const awsAccountId = tmp[4];
  const apiOptions: ApiOptions = {
    region: tmp[3],
    restApiId: apiGatewayArnTmp[0],
    stage: apiGatewayArnTmp[1],
  };
  // const method = apiGatewayArnTmp[2];
  // let resource = "/";
  // if (apiGatewayArnTmp[3]) {
  //   resource += apiGatewayArnTmp.slice(3, apiGatewayArnTmp.length).join("/");
  // }
  const authPolicy = new AuthPolicy(principalId, awsAccountId, apiOptions);
  authPolicy.allowAllMethods();
  return authPolicy.build();
};
