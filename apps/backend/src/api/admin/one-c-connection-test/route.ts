import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";

import { runOneCConnectionTest } from "../../../lib/one-c-connection-test";

export async function POST(
  _req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  res.setHeader("Cache-Control", "no-store");
  res.json(await runOneCConnectionTest());
}
