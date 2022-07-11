# graphql-http

[![deno land](http://img.shields.io/badge/available%20on-deno.land/x-lightgrey.svg?logo=deno&labelColor=black&color=black)](https://deno.land/x/graphql_http)
[![deno doc](https://img.shields.io/badge/deno-doc-black)](https://doc.deno.land/https/deno.land/x/graphql_http/mod.ts)

GraphQL on HTTP middleware with built-in validations and GraphQL playground

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

const schema = `type Query {
  hello: String!
}
`;
const graphqlResponse = graphqlHttp({
  schema: buildSchema(schema),
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

## License

Copyright © 2022-present [TomokiMiyauci](https://github.com/TomokiMiyauci).

Released under the [MIT](./LICENSE) license