import Link from "next/link";
import type { JSX } from "react";
import KodebaseLogo from "@/components/kodebase-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { MainHeaderMenu, MainMenu, SubMenu } from "./nav-menus";

export default function Header(): JSX.Element {
  return (
    <header className="w-full max-w-screen-xl mx-auto px-base z-10">
      <div className="hidden md:flex justify-between">
        <div className="flex items-center gap-base">
          <Link href="/" className="text-sm">
            <KodebaseLogo />
          </Link>
          <MainHeaderMenu />
        </div>

        <SubMenu />
      </div>

      <div className="md:hidden flex justify-between">
        <Link href="/">
          <KodebaseLogo />
        </Link>
        <SidebarTrigger />
        <MobileMenu />
      </div>
    </header>
  );
}

function MobileMenu(): JSX.Element {
  const currentYear = new Date().getFullYear();
  return (
    <Sidebar side="right" className="border-black">
      <SidebarContent>
        <div className="flex flex-col justify-between h-full p-base">
          <SidebarHeader className="flex flex-col items-end gap-base">
            <SidebarTrigger className="text-white" />
            <SubMenu />
          </SidebarHeader>

          <div className="text-white">
            <MainMenu />
          </div>

          <SidebarFooter className="flex flex-row items-end justify-between">
            <span className="text-xs font-light text-white">
              ©{currentYear}, Kodebase
            </span>
            <Link href="/">
              <KodebaseLogo />
            </Link>
          </SidebarFooter>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
