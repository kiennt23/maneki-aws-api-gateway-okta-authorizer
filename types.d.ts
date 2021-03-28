type HttpVerb = "GET" | "POST" | "PUT" | "PATCH" | "HEAD" | "DELETE" | "OPTIONS" | "*";

type Effect = "Allow" | "Deny";

type StringConditionOperator =
  | "StringEquals"
  | "StringNotEquals"
  | "StringEqualsIgnoreCase"
  | "StringNotEqualsIgnoreCase"
  | "StringLike"
  | "StringNotLike";

type NumericConditionOperator =
  | "NumericEquals"
  | "NumericNotEquals"
  | "NumericLessThan"
  | "NumericLessThanEquals"
  | "NumericGreaterThan"
  | "NumericGreaterThanEquals";

type DateConditionOperator =
  | "DateEquals"
  | "DateNotEquals"
  | "DateLessThan"
  | "DateLessThanEquals"
  | "DateGreaterThan"
  | "DateGreaterThanEquals";

type BooleanConditionOperator = "Bool";

type IPAddressConditionOperator = "IpAddress" | "NotIpAddress";

type ARNConditionOperator = "ArnEquals" | "ArnLike" | "ArnNotEquals" | "ArnNotLike";

type NullConditionOperator = "Null";

type ConditionOperator =
  | StringConditionOperator
  | NumericConditionOperator
  | DateConditionOperator
  | BooleanConditionOperator
  | IPAddressConditionOperator
  | ARNConditionOperator
  | NullConditionOperator;

type Condition = Map<ConditionOperator, Map<string, any>>;

type ApiOptions = {
  region: string;
  restApiId: string;
  stage: string;
};

type Method = {
  resourceArn: string;
  conditions: Condition[];
};

type PolicyStatement = {
  Sid?: string;
  Action: string;
  Effect: Effect;
  Resource: string[];
  Condition?: Condition[];
};

type PolicyDocument = {
  Version: string;
  Statement: PolicyStatement[];
};

type Policy = {
  principalId: string;
  policyDocument: PolicyDocument;
  usageIdentifierKey?: string;
  context?: { [P: string]: string | number | boolean | { [P: string]: string | number | boolean } };
};
