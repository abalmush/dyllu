import { HttpTypes } from "@medusajs/types";
import { Hammer, Truck, Undo2 } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/atoms/accordion";

type Props = {
  product: HttpTypes.StoreProduct;
};

export default function ProductTabs({ product }: Props) {
  const specs = [
    { label: "Material", value: product.material || "—" },
    { label: "Țară origine", value: product.origin_country || "—" },
    { label: "Tip", value: product.type?.value || "—" },
    {
      label: "Greutate",
      value: product.weight ? `${product.weight} g` : "—",
    },
    {
      label: "Dimensiuni",
      value:
        product.length && product.width && product.height
          ? `${product.length}L × ${product.width}W × ${product.height}H`
          : "—",
    },
  ];

  return (
    <Accordion type="multiple" defaultValue={["specs"]} className="w-full">
      <AccordionItem value="specs">
        <AccordionTrigger className="text-base font-semibold">
          <span className="flex items-center gap-2">
            <Hammer className="size-4 text-primary" /> Specificații
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <dl className="grid grid-cols-1 gap-3 text-sm small:grid-cols-2">
            {specs.map((s) => (
              <div
                key={s.label}
                className="flex flex-col gap-0.5 rounded-lg bg-surface-subtle px-3 py-2.5"
              >
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </dt>
                <dd className="font-medium text-foreground">{s.value}</dd>
              </div>
            ))}
          </dl>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="shipping">
        <AccordionTrigger className="text-base font-semibold">
          <span className="flex items-center gap-2">
            <Truck className="size-4 text-primary" /> Livrare
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Livrare în 24–48h în Chișinău, 2–4 zile lucrătoare în restul țării.
            Comenzi peste 1.000 MDL beneficiază de transport gratuit.
            Ridicare din magazin disponibilă în aceeași zi.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="returns">
        <AccordionTrigger className="text-base font-semibold">
          <span className="flex items-center gap-2">
            <Undo2 className="size-4 text-primary" /> Retur și garanție
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            30 de zile pentru retur fără explicații. Toate produsele beneficiază
            de garanția producătorului — minimum 12 luni, până la 24 luni pentru
            sculele profesionale. Suport tehnic pentru utilizare disponibil L–V,
            9:00–18:00.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
