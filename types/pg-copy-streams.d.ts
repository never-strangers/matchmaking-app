declare module "pg-copy-streams" {
  import type { Submittable } from "pg";
  import type { Writable } from "node:stream";

  /** pg `COPY ... FROM STDIN` target: `client.query(from(sql))` then pipe bytes in. */
  export function from(sql: string): Submittable & Writable;
}
