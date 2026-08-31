import { Writable } from "node:stream";
import type { Request, Response } from "express";

export type RouteHandler = (req: never, res: never) => unknown;

export type RouteResult = {
  status: number;
  body: unknown;
  headers: Record<string, unknown>;
};

export type TestUser = {
  id: string;
  role: string;
  email: string | null;
  emailVerified: boolean;
};

export const asManager = (id: string): TestUser => ({
  id,
  role: "manager",
  email: null,
  emailVerified: true,
});

export const asTenant = (id: string): TestUser => ({
  id,
  role: "tenant",
  email: null,
  emailVerified: true,
});

type RequestShape = {
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: unknown;
  user?: TestUser;
  files?: unknown[];
  headers?: Record<string, string>;
};

export const callRoute = async (
  handler: RouteHandler,
  request: RequestShape,
): Promise<RouteResult> => {
  const sink = new Writable({ write: (_chunk, _enc, done) => done() });

  const res = Object.assign(sink, {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, unknown>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    send(payload: unknown) {
      this.body = payload;
      return this;
    },
    setHeader(key: string, value: unknown) {
      this.headers[key] = value;
      return this;
    },
    attachment() {
      return this;
    },
  });

  const invoke = handler as (req: Request, res: Response) => unknown;
  await invoke(
    {
      params: {},
      query: {},
      body: {},
      headers: {},
      ...request,
    } as unknown as Request,
    res as unknown as Response,
  );

  return { status: res.statusCode, body: res.body, headers: res.headers };
};