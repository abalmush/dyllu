import React from "react";

import UnderlineLink from "@modules/common/components/interactive-link";

import AccountNav from "../components/account-nav";
import { HttpTypes } from "@medusajs/types";

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null;
  children: React.ReactNode;
}

const AccountLayout: React.FC<AccountLayoutProps> = ({
  customer,
  children,
}) => {
  return (
    <div className="flex-1 small:py-12" data-testid="account-page">
      <div className="content-container mx-auto flex h-full max-w-5xl flex-1 flex-col bg-card">
        <div className="grid grid-cols-1 py-12 small:grid-cols-[240px_1fr]">
          <div>{customer && <AccountNav customer={customer} />}</div>
          <div className="flex-1">{children}</div>
        </div>
        <div className="flex flex-col items-end justify-between gap-8 border-gray-200 py-12 small:flex-row small:border-t">
          <div>
            <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight">
              Ai întrebări?
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Răspunsurile la întrebările frecvente le găsești pe pagina de
              suport pentru clienți.
            </p>
          </div>
          <div>
            <UnderlineLink href="/contact">Contact și suport</UnderlineLink>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountLayout;
