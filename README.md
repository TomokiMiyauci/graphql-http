# graphql-http

[![deno land](http://img.shields.io/badge/available%20on-deno.land/x-lightgrey.svg?logo=deno&labelColor=black&color=black)](https://deno.land/x/graphql_http)
[![deno doc](https://img.shields.io/badge/deno-doc-black)](https://doc.deno.land/https/deno.land/x/graphql_http/mod.ts)
[![codecov](https://codecov.io/gh/TomokiMiyauci/graphql-http/branch/main/graph/badge.svg?token=0Dq5iqtnjw)](https://codecov.io/gh/TomokiMiyauci/graphql-http)

GraphQL on HTTP middleware with built-in validations and GraphQL playground

## Features

- [GraphQL over HTTP Spec](https://graphql.github.io/graphql-over-http/)
  compliant
- `application/graphql+json` support
- Lean interface, tiny using [std](https://deno.land/std/http) and graphql
  public libraries
- Built-in [graphql-playground](https://github.com/graphql/graphql-playground)
- Universal

## What

It provides GraphQL on HTTP middleware that can be embedded in any server.

Essentially, it takes a `Request` object and returns a `Response` object.

In the meantime, it performs HTTP request validation, processes GraphQL, and
response object with the appropriate status code and message.

There is also a built-in GraphQL Playground.

## Example

A simple example of creating a GraphQL server.

[std/http](https://deno.land/std/http) +
[grpahql.js](https://github.com/graphql/graphql-js)

```ts
import { graphqlHttp } from "https://deno.land/x/graphql_http@$VERSION/mod.ts";
import {
  Handler,
  serve,
  Status,
} from "https://deno.land/std@$VERSION/http/mod.ts";
import { buildSchema } from "https://esm.sh/graphql@$VERSION";

const graphqlResponse = graphqlHttp({
  schema: buildSchema(`type Query {
    hello: String!
  }`),
  rootValue: {
    hello: () => "world",
  },
  playground: true,
});

const handler: Handler = (req) => {
  const { pathname } = new URL(req.url);
  if (pathname === "/graphql") {
    return graphqlResponse(req);
  }
  return new Response("Not Found", {
    status: Status.NotFound,
  });
};

serve(handler);
```

## Spec

This project is implemented in accordance with
[GraphQL over HTTP Spec](https://graphql.github.io/graphql-over-http/).

We are actively implementing
[IETF RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119) `SHOULD` and
`RECOMMENDED`.

### Request Parameters

A GraphQL-over-HTTP request is formed of the following parameters:

| Name          |      Required      | Description                                                                                                                |
| ------------- | :----------------: | -------------------------------------------------------------------------------------------------------------------------- |
| query         | :white_check_mark: | A Document containing GraphQL Operations and Fragments to execute. Must be a string.                                       |
| operationName |         -          | The name of the Operation in the Document to execute. <br>GET: If present, must be a string.                               |
| variables     |         -          | Values for any Variables defined by the Operation. <br> GET: If present, must be represented as a URL-encoded JSON string. |

### Response Status

The following responses may be returned.

| Status | Condition                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------- |
| 200    | If GraphQL is actually executed, even if it contains `Field errors`.                              |
| 400    | A required parameter does not exist. Illegal format of parameter.                                 |
| 405    | When a mutation operation is requested on GET request.                                            |
| 406    | The client `Accept` HTTP header does not contain at least one of the supported media types.       |
| 415    | The client `Content-type` HTTP header does not contain at least one of the supported media types. |
| 500    | If the server encounters an unexpected error.                                                     |

Below are the specific conditions under which each may occur. Errors are
classified into four major categories.

- HTTP Request errors
- (GraphQL) Request errors
- (GraphQL) Field errors
- Unknown errors

#### HTTP Request errors

HTTP Request errors are errors in the http protocol. This refers to errors that
can occur between HTTP and GraphQL, such as missing/incorrect values for
required parameters, missing/incorrect values for required headers, etc.

Since these are client-side errors, the appropriate `4XX` status is returned.

#### Request errors

Request errors are defined at
[[GraphQL Spec] 7.Response - Request errors](https://spec.graphql.org/draft/#sec-Errors.Request-errors).

Note here that the status code may be different depending on the Content-Type.

##### application/json

If Content-Type is `application/json`, all results of GraphQL Requests including
GraphQL validation will be treated as `200` status.

See the
[[GraphQL over HTTP 6.4.1] application/json#Note](https://graphql.github.io/graphql-over-http/draft/#note-a7d14)
for the reason for this.

##### application/graphql+json

If Content-Type is `application/graphql+json`, it is possible to respond with a
status code other than `200` depending on the result of the GraphQL Request.

If the GraphQL request is invalid (e.g. it is malformed, or does not pass
validation) then the response with 400 status code.

#### Field errors

Field errors are defined at
[[GraphQL Spec 7.Response] - Field errors](https://spec.graphql.org/draft/#sec-Errors.Field-errors).

Even if a Field error occurs, it will always be a `200` status code.

#### Unknown errors

If an error other than the above occurs on the server side, a `500` status code
will be responded.

#### Upgrade to application/graphql+json

As you may have noticed, `application/graphql+json` represents a more accurate
semantics response.

If you want `application/graphql+json` content, you must put
`application/graphql+json` as a higher priority than `application/json` in the
`Accept` header.

Example: `Accept: application/graphql+json,application/json`.

## application/graphql+json vs application/json

Response status

|                                | application/graphql+json | application/json |
| ------------------------------ | ------------------------ | ---------------- |
| HTTP Request error             | 4XX(eg.406, 415)         | 4XX              |
| GraphQL request error          | 400                      | 200              |
| GraphQL field error            | 200                      | 200              |
| Unknown(Internal server) error | 5XX                      | 5XX              |

## Overwrite response

`grpahqlHttp` creates a response according to the GraphQL over HTTP
specification. You can customize this response.

Example of adding a header:

```ts
import { graphqlHttp } from "https://deno.land/x/graphql_http@$VERSION/mod.ts";
import { buildSchema } from "https://esm.sh/graphql@$VERSION";

const responser = graphqlHttp({
  response: (res, ctx) => {
    if (ctx.request.method === "GET") {
      res.headers.set("Cache-Control", "max-age=604800");
    }
    return res;
  },
  schema: buildSchema(`type Query {
    hello: String
  }`),
});
```

## Where the subscription?

Unfortunately, there is currently no specification for `subscription` and it is
not implemented.

You can refer to other projects' implementations using
[SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
or [Websocket](https://developer.mozilla.org/en-US/docs/Web/API/Websockets_API).

- [graphql-ws](https://github.com/enisdenjo/graphql-ws)
- [subscriptions-transport-ws](https://github.com/apollographql/subscriptions-transport-ws)

## API

### graphqlHttp

Make a GraphQL `Response` Object that validate to `Request` Object.

#### Parameters

| Name              |     Required / Default     | Description                                                                                                                                                                                                                                                                            |
| ----------------- | :------------------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| schema            |     :white_check_mark:     | `GraphQLSchema`<br>The GraphQL type system to use when validating and executing a query.                                                                                                                                                                                               |
| source            |             -              | `Source` &#124; `string`<br>A GraphQL language formatted string representing the requested operation.                                                                                                                                                                                  |
| rootValue         |             -              | `unknown`<br>The value provided as the first argument to resolver functions on the top level type (e.g. the query object type).                                                                                                                                                        |
| contextValue      |             -              | `unknown`<br>The context value is provided as an argument to resolver functions after field arguments. It is used to pass shared information useful at any point during executing this query, for example the currently logged in user and connections to databases or other services. |
| variableValues    |             -              | `<{ readonly [variable: string: unknown; }>` &#124; `null` <br>A mapping of variable name to runtime value to use for all variables defined in the requestString.                                                                                                                      |
| operationName     |             -              | `string` &#124; `null`<br>The name of the operation to use if requestString contains multiple possible operations. Can be omitted if requestString contains only one operation.                                                                                                        |
| fieldResolver     |             -              | `GraphQLFieldResolver<any, any>` &#124; `null`<br>A resolver function to use when one is not provided by the schema. If not provided, the default field resolver is used (which looks for a value or method on the source value with the field's name).                                |
| typeResolver      |             -              | `GraphQLTypeResolver<any, any>` &#124; `null`<br>A type resolver function to use when none is provided by the schema. If not provided, the default type resolver is used (which looks for a `__typename` field or alternatively calls the `isTypeOf` method).                          |
| response          |             -              | `(req: Request, ctx: RequestContext) =>` `Promise<Response>` &#124; `Response`<br> Overwrite actual response.                                                                                                                                                                          |
| playground        |             -              | `boolean`<br>Whether enabled [graphql-playground](https://github.com/graphql/graphql-playground) or not.                                                                                                                                                                               |
| playgroundOptions | `{ endpoint: "/graphql" }` | `RenderPageOptions`<br> [graphql-playground](https://github.com/graphql/graphql-playground) options.                                                                                                                                                                                   |

#### ReturnType

`(req: Request) => Promise<Response>`

#### Throws

- `AggregateError` - When graphql schema validation is fail.

### gqlFetch

GraphQL client with HTTP.

#### Example

```ts
import { gqlFetch } from "https://deno.land/x/graphql_http@$VERSION/mod.ts";

const { data, errors, extensions } = await gqlFetch({
  url: `<graphql-endpoint>`,
  query: `query Greet(name: $name) {
    hello(name: $name)
  }`,
}, {
  variables: {
    name: "Bob",
  },
  operationName: "Greet",
  method: "GET",
});
```

#### Generics

- `T extends jsonObject` - `data` field type

#### Parameters

| N | Name          | Required / Default | Description                                                                                                                                                 |
| - | ------------- | :----------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | params        | :white_check_mark: | Parameters                                                                                                                                                  |
|   | url           | :white_check_mark: | `string` &#124; `URL`<br>GraphQL URL endpoint.                                                                                                              |
|   | query         | :white_check_mark: | `string`<br>GraphQL query                                                                                                                                   |
| 2 | options       |         -          | Options                                                                                                                                                     |
|   | variables     |         -          | `jsonObject`<br> GraphQL variables.                                                                                                                         |
|   | operationName |         -          | `string`<br>GraphQL operation name.                                                                                                                         |
|   | method        |      `"POST"`      | `"GET"` &#124; `"POST"` &#124; `({} & string)`<br>HTTP Request method. According to the GraphQL over HTTP Spec, all GraphQL servers accept `POST` requests. |
| 3 | requestInit   |         -          | `RequestInit`<br>Request init for customize HTTP request.                                                                                                   |

```ts
type json =
  | string
  | number
  | boolean
  | null
  | { [k: string]: json }
  | json[];

type jsonObject = {
  [k: string]: json;
};
```

#### ReturnTypes

`Promise<Result<T>>`

#### Throws

- `Error`
- `TypeError`
- `SyntaxError`
- `DOMException`
- `AggregateError`

### createRequest

Create GraphQL `Request` object.

#### Example

```ts
import { createRequest } from "https://deno.land/x/graphql_http@$VERSION/mod.ts";

const [request, err] = createRequest({
  url: "<graphql-endpoint>",
  query: `query Greet(name: $name) {
    hello(name: $name)
  }`,
  method: "GET",
});

if (!err) {
  const res = await fetch(request);
}
```

#### Generics

- `T extends jsonObject`

#### Parameters

| N | Name          | Required / Default | Description                                                                                                                                                 |
| - | ------------- | :----------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | params        | :white_check_mark: | Parameters                                                                                                                                                  |
|   | url           | :white_check_mark: | `string` &#124; `URL`<br>GraphQL URL endpoint.                                                                                                              |
|   | query         | :white_check_mark: | `string`<br>GraphQL query                                                                                                                                   |
|   | method        | :white_check_mark: | `"GET"` &#124; `"POST"` &#124; `({} & string)`<br>HTTP Request method. According to the GraphQL over HTTP Spec, all GraphQL servers accept `POST` requests. |
| 2 | options       |         -          | Options                                                                                                                                                     |
|   | variables     |         -          | `jsonObject`<br> GraphQL variables.                                                                                                                         |
|   | operationName |         -          | `string`<br>GraphQL operation name.                                                                                                                         |

#### ReturnType

`[data: Request, error: undefined] | [data: undefined, error: TypeError]`

#### resolveResponse

Resolve GraphQL over HTTP response safety.

#### Example

```ts
import {
  resolveResponse,
} from "https://deno.land/x/graphql_http@$VERSION/mod.ts";

const res = new Response(); // any Response
const { data, errors, extensions } = await resolveResponse(res);
```

#### Parameters

| Name |      Required      | Description                    |
| ---- | :----------------: | ------------------------------ |
| res  | :white_check_mark: | `Request`<br> `Request` object |

#### ReturnType

`Promise<Result<T>>`

```ts
import { GraphQLError } from "https://esm.sh/graphql@$VERSION";
import { json } from "https://deno.land/x/pure_json@$VERSION/mod.ts";
type PickBy<T, K> = {
  [k in keyof T as (K extends T[k] ? k : never)]: T[k];
};

type SerializedGraphQLError = PickBy<GraphQLError, json | undefined>;
type Result<
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  data?: T;
  errors?: SerializedGraphQLError[];
  extensions?: unknown;
};
```

#### Throws

- `Error`
- `AggregateError`
- `SyntaxError`
- `TypeError`

## Recipes

- [std/http](./examples/std_http/README.md)
- [fresh](./examples/fresh/README.md)

## License

Copyright © 2022-present [TomokiMiyauci](https://github.com/TomokiMiyauci).

Released under the [MIT](./LICENSE) license