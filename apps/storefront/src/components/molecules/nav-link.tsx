"use client";

import * as React from "react";
import { Link, usePathname } from "@/i18n/navigation";

import { cn } from "@lib/utils";

export interface NavLinkProps extends Omit<
  React.ComponentProps<typeof Link>,
  "className"
> {
  className?: string;
  activeClassName?: string;
  exact?: boolean;
}

export function NavLink({
  href,
  className,
  activeClassName = "text-foreground",
  exact = false,
  ...props
}: NavLinkProps) {
  const pathname = usePathname();
  const path = typeof href === "string" ? href : href.pathname || "";
  const isActive = exact
    ? pathname === path
    : path !== "/" && pathname.startsWith(path);

  return (
    <Link
      href={href}
      className={cn(
        "text-muted-foreground hover:text-foreground text-sm font-medium tracking-tight transition-colors",
        isActive && activeClassName,
        className
      )}
      {...props}
    />
  );
}
