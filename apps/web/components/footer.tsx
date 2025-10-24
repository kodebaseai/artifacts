import type { JSX } from "react";
import { FooterMenu } from "./nav-menus";

export default function Footer(): JSX.Element {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="flex flex-wrap gap-base justify-between items-start lg:items-center w-full max-w-screen-xl mx-auto px-base font-light leading-none text-white/64">
      <div className="flex items-center gap-base">
        <span className="text-sm">©{currentYear}, Kodebase</span>
      </div>
      <FooterMenu />
    </footer>
  );
}
