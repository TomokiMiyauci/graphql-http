import {
  contentType,
  describe,
  expect,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  it,
  queryString,
  Status,
} from "./dev_deps.ts";
import graphqlHttp from "./graphql_http.ts";

const QueryRootType = new GraphQLObjectType({
  name: "QueryRoot",
  fields: {
    test: {
      type: GraphQLString,
      args: {
        who: { type: GraphQLString },
      },
      resolve: (_root, args: { who?: string }) =>
        "Hello " + (args.who ?? "World"),
    },
    thrower: {
      type: GraphQLString,
      resolve() {
        throw new Error("Throws!");
      },
    },
  },
});

/**
 * schema {
 *   query: QueryRoot
 *   mutation: MutationRoot
 * }
 *
 * type QueryRoot {
 *   test(who: String): String
 *   thrower: String
 * }
 *
 * type MutationRoot {
 *   writeTest: QueryRoot
 * }
 */
const schema = new GraphQLSchema({
  query: QueryRootType,
  mutation: new GraphQLObjectType({
    name: "MutationRoot",
    fields: {
      writeTest: {
        type: QueryRootType,
        resolve: () => ({}),
      },
    },
  }),
});

const responser = graphqlHttp({
  schema,
});

const BASE_URL = "https://test.test";

const describeTests = describe("graphqlHttp");

describe("HTTP method is GET", () => {
  it(
    describeTests,
    "should return 400 when query string is not exists",
    async () => {
      const res = await responser(new Request(new URL(BASE_URL).toString()));

      expect(res.status).toBe(Status.BadRequest);
      expect(res.headers.get("content-type")).toEqual(
        "application/json; charset=UTF-8",
      );
      await expect(res.json()).resolves.toEqual({
        errors: [{ message: `The parameter is required. "query"` }],
      });
    },
  );

  it("allows GET with query param", async () => {
    const url = new URL(
      `?query={test}`,
      BASE_URL,
    );
    const req = new Request(url.toString());
    const res = await responser(req);

    expect(res.status).toBe(Status.OK);
    expect(res.headers.get("content-type")).toEqual(
      "application/json; charset=UTF-8",
    );
    await expect(res.json()).resolves.toEqual({
      data: { test: "Hello World" },
    });
  });

  it("allows GET with variable values", async () => {
    const url = queryString(BASE_URL, {
      query: `query helloWho($who: String){ test(who: $who) }`,
      variables: `{"who":"Dolly"}`,
    });
    const req = new Request(url);
    const res = await responser(req);

    expect(res.status).toBe(Status.OK);
    expect(res.headers.get("content-type")).toEqual(
      "application/json; charset=UTF-8",
    );
    await expect(res.json()).resolves.toEqual({
      data: { test: "Hello Dolly" },
    });
  });

  it("allows GET with operation name", async () => {
    const url = queryString(BASE_URL, {
      query: `
        query helloYou { test(who: "You"), ...shared }
        query helloWorld { test(who: "World"), ...shared }
        query helloDolly { test(who: "Dolly"), ...shared }
        fragment shared on QueryRoot {
          shared: test(who: "Everyone")
        }
      `,
      operationName: "helloWorld",
    });

    const res = await responser(new Request(url));
    expect(res.status).toBe(Status.OK);
    await expect(res.json()).resolves.toEqual({
      data: {
        test: "Hello World",
        shared: "Hello Everyone",
      },
    });
  });

  it("Allows a mutation to exist within a GET", async () => {
    const url = queryString(BASE_URL, {
      operationName: "TestQuery",
      query: `
      mutation TestMutation { writeTest { test } }
      query TestQuery { test }
    `,
    });

    const res = await responser(new Request(url));

    expect(res.status).toEqual(Status.OK);
    await expect(res.json()).resolves.toEqual({
      data: {
        test: "Hello World",
      },
    });
  });
});

describe("HTTP method is POST", () => {
  it("Allows POST with JSON encoding", async () => {
    const req = new Request(BASE_URL, {
      body: JSON.stringify({ query: "{test}" }),
      method: "POST",
      headers: {
        "content-type": contentType(".json"),
      },
    });
    const res = await responser(req);

    expect(res.status).toBe(Status.OK);
    expect(res.headers.get("content-type")).toBe(contentType(".json"));
    expect(res.json()).resolves.toEqual({ data: { test: "Hello World" } });
  });

  it("Allows sending a mutation via POST", async () => {
    const req = new Request(BASE_URL, {
      body: JSON.stringify({
        query: "mutation TestMutation { writeTest { test } }",
      }),
      method: "POST",
      headers: {
        "content-type": contentType(".json"),
      },
    });
    const res = await responser(req);

    expect(res.status).toBe(Status.OK);
    expect(res.headers.get("content-type")).toBe(contentType(".json"));
    expect(res.json()).resolves.toEqual({
      data: { writeTest: { test: "Hello World" } },
    });
  });

  it(`return with errors when "Content-Type" is not exists`, async () => {
    const req = new Request(BASE_URL, {
      method: "POST",
    });
    const res = await responser(req);

    expect(res.status).toBe(Status.BadRequest);
    expect(res.headers.get("content-type")).toBe(contentType(".json"));
    expect(res.json()).resolves.toEqual({
      errors: [{ message: 'The header is required. "Content-Type"' }],
    });
  });

  it("return with errros when message body is invalid JSON format", async () => {
    const req = new Request(BASE_URL, {
      method: "POST",
      headers: {
        "content-type": contentType(".json"),
      },
    });
    const res = await responser(req);

    expect(res.status).toBe(Status.BadRequest);
    expect(res.headers.get("content-type")).toBe(contentType(".json"));
    expect(res.json()).resolves.toEqual({
      errors: [{
        message: "The message body is invalid. Invalid JSON format.",
      }],
    });
  });

  it("Allows POST with url encoding", async () => {
    const url = queryString(BASE_URL, {
      query: `{test}`,
    });
    const req = new Request(url, {
      body: JSON.stringify({}),
      method: "POST",
      headers: {
        "content-type": contentType(".json"),
      },
    });
    const res = await responser(req);

    expect(res.status).toBe(Status.OK);
    expect(res.headers.get("content-type")).toBe(contentType(".json"));
    expect(res.json()).resolves.toEqual({ data: { test: "Hello World" } });
  });

  it("should return 200 when body includes variables", async () => {
    const req = new Request(BASE_URL, {
      body: JSON.stringify({
        query: "query helloWho($who: String){ test(who: $who) }",
        variables: { who: "Dolly" },
      }),
      method: "POST",
      headers: {
        "content-type": contentType(".json"),
      },
    });

    const res = await responser(req);

    expect(res.status).toBe(Status.OK);
    expect(res.headers.get("content-type")).toBe(contentType(".json"));
    expect(res.json()).resolves.toEqual({ data: { test: "Hello Dolly" } });
  });
});