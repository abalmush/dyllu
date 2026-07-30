import { generateEntityId } from "@medusajs/framework/utils";

import { Clock, IdGenerator } from "../application/ports";

const prefixes = {
  proposal: "mcpprop",
  revision: "mcprev",
  event: "mcpevt",
} as const;

export class SystemClock implements Clock {
  now() {
    return new Date();
  }
}

export class MedusaIdGenerator implements IdGenerator {
  next(prefix: keyof typeof prefixes) {
    return generateEntityId(undefined, prefixes[prefix]);
  }
}
