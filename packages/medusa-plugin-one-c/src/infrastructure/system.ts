import { generateEntityId } from "@medusajs/framework/utils";

import { Clock, IdGenerator } from "../application/ports";

export class SystemClock implements Clock {
  now() {
    return new Date();
  }
}

export class MedusaIdGenerator implements IdGenerator {
  next(prefix: Parameters<IdGenerator["next"]>[0]) {
    return generateEntityId(undefined, prefix);
  }
}
