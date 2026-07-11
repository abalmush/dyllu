"use client";

import React from "react";

import { HttpTypes } from "@medusajs/types";
import { Button } from "@lib/ui-compat";

import UnderlineLink from "@modules/common/components/interactive-link";

type MyInformationProps = {
  customer: HttpTypes.StoreCustomer;
};

const ProfileEmail: React.FC<MyInformationProps> = ({ customer }) => {
  return (
    <div className="text-small-regular" data-testid="account-email-editor">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col">
          <span className="uppercase text-ui-fg-base">Email</span>
          <span className="font-semibold" data-testid="current-info">
            {customer.email}
          </span>
        </div>
        <Button variant="secondary" className="min-h-[25px] py-1" disabled>
          Verifică cu suportul
        </Button>
      </div>
      <div className="mt-4 rounded-rounded border border-ui-border-base bg-ui-bg-subtle p-4 text-sm text-ui-fg-subtle">
        Pentru schimbarea adresei de email, contactează echipa DYLLU din pagina{" "}
        <UnderlineLink href="/contact">Contact</UnderlineLink>.
      </div>
    </div>
  );
};

export default ProfileEmail;
