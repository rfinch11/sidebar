"use client";

import Image from "next/image";

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className }: LogoProps) {
  return (
    <>
      <Image
        src="/logo-light.svg"
        alt="Sidebar"
        width={size}
        height={size}
        className={`dark:hidden ${className ?? ""}`}
      />
      <Image
        src="/logo-dark.svg"
        alt="Sidebar"
        width={size}
        height={size}
        className={`hidden dark:block ${className ?? ""}`}
      />
    </>
  );
}
