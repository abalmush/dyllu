import * as React from "react";

import { cn } from "@lib/utils";
import { Badge as BadgeAtom, type BadgeProps as BadgeAtomProps } from "@/components/atoms/badge";
import { Button as ButtonAtom, type ButtonProps as ButtonAtomProps } from "@/components/atoms/button";
import { Checkbox } from "@/components/atoms/checkbox";
import { Container } from "@/components/atoms/container";
import { Heading as HeadingAtom, type HeadingProps as HeadingAtomProps } from "@/components/atoms/heading";
import { Input } from "@/components/atoms/input";
import { Label as LabelAtom } from "@/components/atoms/label";
import { RadioGroup as RadioGroupAtom, RadioGroupItem } from "@/components/atoms/radio-group";
import {
  Table as TableAtom,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/atoms/table";
import { Text as TextAtom, type TextProps as TextAtomProps } from "@/components/atoms/text";

export const clx = cn;

type LegacyButtonVariant =
  | "primary"
  | "secondary"
  | "transparent"
  | "danger"
  | "default"
  | "outline"
  | "ghost"
  | "link"
  | "destructive"
  | "soft";

const variantBridge: Record<LegacyButtonVariant, ButtonAtomProps["variant"]> = {
  primary: "default",
  secondary: "outline",
  transparent: "ghost",
  danger: "destructive",
  default: "default",
  outline: "outline",
  ghost: "ghost",
  link: "link",
  destructive: "destructive",
  soft: "soft",
};

type LegacyButtonSize =
  | "small"
  | "base"
  | "large"
  | "xlarge"
  | "sm"
  | "default"
  | "lg"
  | "xl"
  | "icon";

const sizeBridge: Record<LegacyButtonSize, ButtonAtomProps["size"]> = {
  small: "sm",
  base: "default",
  large: "lg",
  xlarge: "xl",
  sm: "sm",
  default: "default",
  lg: "lg",
  xl: "xl",
  icon: "icon",
};

export type ButtonProps = Omit<ButtonAtomProps, "variant" | "size"> & {
  variant?: LegacyButtonVariant;
  size?: LegacyButtonSize;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "default", ...props }, ref) => (
    <ButtonAtom
      ref={ref}
      variant={variantBridge[variant] ?? "default"}
      size={sizeBridge[size] ?? "default"}
      {...props}
    />
  )
);
Button.displayName = "Button";

export type HeadingProps = Omit<HeadingAtomProps, "size"> & {
  level?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
};

const levelToSize: Record<NonNullable<HeadingProps["level"]>, HeadingAtomProps["size"]> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
};

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ level = "h2", ...props }, ref) => (
    <HeadingAtom
      ref={ref}
      as={level}
      size={levelToSize[level]}
      {...props}
    />
  )
);
Heading.displayName = "Heading";

export type TextProps = TextAtomProps;
export const Text = TextAtom;

export type BadgeProps = Omit<BadgeAtomProps, "variant"> & {
  size?: string;
  color?: string;
  variant?: BadgeAtomProps["variant"];
};
export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ variant = "secondary", size: _size, color: _color, ...props }, ref) => (
    <BadgeAtom ref={ref as React.Ref<HTMLDivElement>} variant={variant} {...props} />
  )
);
Badge.displayName = "Badge";

type LegacyLabelProps = React.ComponentPropsWithoutRef<typeof LabelAtom> & {
  size?: string;
};
export const Label = React.forwardRef<
  React.ElementRef<typeof LabelAtom>,
  LegacyLabelProps
>(({ size: _size, ...props }, ref) => <LabelAtom ref={ref} {...props} />);
Label.displayName = "Label";

export const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "transparent" | "ghost" | "outline" | "default";
  }
>(({ className, variant: _variant, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "inline-grid size-9 place-items-center rounded-md text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
));
IconButton.displayName = "IconButton";

export const IconBadge = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "inline-flex size-7 items-center justify-center rounded-md border border-border bg-card text-foreground",
      className
    )}
    {...props}
  />
));
IconBadge.displayName = "IconBadge";

type RadioGroupComponent = ((
  props: React.ComponentPropsWithoutRef<typeof RadioGroupAtom>
) => React.ReactElement) & {
  Item: typeof RadioGroupItem;
};

function RadioGroupBase(
  props: React.ComponentPropsWithoutRef<typeof RadioGroupAtom>
) {
  return <RadioGroupAtom {...props} />;
}

export const RadioGroup = Object.assign(RadioGroupBase, {
  Item: RadioGroupItem,
}) as RadioGroupComponent;
export { RadioGroupItem };

type TableComponent = ((
  props: React.HTMLAttributes<HTMLTableElement>
) => React.ReactElement) & {
  Header: typeof TableHeader;
  Body: typeof TableBody;
  Footer: typeof TableFooter;
  Row: typeof TableRow;
  Cell: typeof TableCell;
  HeaderCell: typeof TableHead;
  Caption: typeof TableCaption;
};

function TableBase(props: React.HTMLAttributes<HTMLTableElement>) {
  return <TableAtom {...props} />;
}

export const Table = Object.assign(TableBase, {
  Header: TableHeader,
  Body: TableBody,
  Footer: TableFooter,
  Row: TableRow,
  Cell: TableCell,
  HeaderCell: TableHead,
  Caption: TableCaption,
}) as TableComponent;

export {
  Checkbox,
  Container,
  Input,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
};

export { toast, Toaster, useToggleState } from "@lib/ui-compat-client";
