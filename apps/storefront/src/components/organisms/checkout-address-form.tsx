import * as React from "react";

import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";

type Field = {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  span2?: boolean;
};

const FIELDS: Field[] = [
  { id: "firstName", label: "Prenume", placeholder: "Ion" },
  { id: "lastName", label: "Nume", placeholder: "Popescu" },
  {
    id: "phone",
    label: "Telefon",
    type: "tel",
    placeholder: "+373 6X XXX XXX",
  },
  { id: "email", label: "Email", type: "email", placeholder: "ion@exemplu.md" },
  {
    id: "address",
    label: "Adresă",
    placeholder: "Str. Ștefan cel Mare 1, ap. 4",
    span2: true,
  },
  { id: "city", label: "Oraș", placeholder: "Chișinău" },
  { id: "zip", label: "Cod poștal", placeholder: "MD-2001" },
];

export function CheckoutAddressForm() {
  return (
    <section className="clip-corner-cut-lg bg-card p-6 ring-1 ring-border">
      <h2 className="mb-5 font-display text-lg font-bold text-foreground">
        Adresă de livrare
      </h2>
      <div className="grid gap-4 small:grid-cols-2">
        {FIELDS.map((field) => (
          <div
            key={field.id}
            className={field.span2 ? "small:col-span-2" : undefined}
          >
            <Label htmlFor={field.id} className="mb-1.5 block text-sm">
              {field.label}
            </Label>
            <Input
              id={field.id}
              type={field.type}
              placeholder={field.placeholder}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
