"use client";

import { Link } from "@/i18n/navigation";
import React from "react";

const LocalizedClientLink = ({
  children,
  href,
  ...props
}: {
  children?: React.ReactNode;
  href: string;
  className?: string;
  onClick?: () => void;
  passHref?: true;
  [x: string]: any;
}) => {
  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  );
};

export default LocalizedClientLink;
