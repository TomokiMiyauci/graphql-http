export { graphql, type GraphQLArgs } from "https://esm.sh/graphql@16.5.0";
export {
  contentType,
  parseMediaType,
} from "https://deno.land/std@0.147.0/media_types/mod.ts";
export {
  isNull,
  isObject,
  isString,
} from "https://deno.land/x/isx@v1.0.0-beta.17/mod.ts";
export {
  JSON,
  type json,
} from "https://deno.land/x/pure_json@1.0.0-beta.1/mod.ts";
export type { RenderPageOptions } from "https://esm.sh/graphql-playground-html@1.6.30";

export type PartialBy<T, K = keyof T> =
  Omit<T, K & keyof T> & Partial<Pick<T, K & keyof T>> extends infer U
    ? { [K in keyof U]: U[K] }
    : never;
