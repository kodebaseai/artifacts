import { Zap } from "lucide-react";
import Link from "next/link";
import type { JSX } from "react";
import { Button } from "@/components/ui/button";
import {
  MAIN_NAV_MENU_ITEMS,
  type MainNavMenuItem,
  type MainNavMenuItemLink,
  NAV_MENU_ITEMS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./ui/navigation-menu";

export function MainHeaderMenu({
  className,
}: {
  className?: string;
}): JSX.Element {
  return (
    <NavigationMenu viewport={true}>
      <NavigationMenuList
        className={cn(
          "flex flex-col md:flex-row items-start md:items-center gap-base font-normal leading-none text-white",
          className,
        )}
      >
        {MAIN_NAV_MENU_ITEMS.map(({ label, href, links }: MainNavMenuItem) => (
          <NavigationMenuItem key={label}>
            {href && (
              <Link href={href}>
                <span className="text-sm font-normal leading-none">
                  {label}
                </span>
              </Link>
            )}

            {links && (
              <>
                <NavigationMenuTrigger className="-mr-4 text-sm font-normal leading-none">
                  {label}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="flex flex-col max-w-xs">
                    {links?.map((group: MainNavMenuItemLink[], groupIndex) => (
                      <div
                        key={`${label}-${groupIndex}/${group.length}`}
                        className="flex flex-col gap-2 border-b border-black/8 p-2"
                      >
                        {group.map(({ href, title, description, icon }) => (
                          <ListItem
                            key={`${groupIndex}-${title}`}
                            href={href}
                            title={title}
                            Icon={icon}
                          >
                            {description}
                          </ListItem>
                        ))}
                      </div>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </>
            )}
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function ListItem({
  title,
  children,
  href,
  Icon,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & {
  href: string;
  Icon?: React.ElementType;
}) {
  return (
    <li {...props} className="p-2 hover:bg-black/4 rounded-md">
      <Link href={href}>
        <div className={cn("flex gap-2", !children && "items-center")}>
          {Icon && <Icon size={16} strokeWidth={1.5} className="m-2" />}
          <div className={cn("flex flex-col gap-1", children && "pt-2")}>
            <span
              className={cn(
                "text-sm leading-none font-medium",
                !children && "py-2",
              )}
            >
              {title}
            </span>
            {children && (
              <p className="text-black/42 line-clamp-2 text-xs leading-snug">
                {children}
              </p>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

export function MainMenu({ className }: { className?: string }): JSX.Element {
  return (
    <nav
      className={cn(
        "flex flex-col md:flex-row items-start md:items-center gap-base font-normal leading-none",
        className,
      )}
    >
      {NAV_MENU_ITEMS.map(({ label, href }) => {
        if (!href) return null;
        return (
          <MenuLink key={label} href={href}>
            {label}
          </MenuLink>
        );
      })}
    </nav>
  );
}

export function FooterMenu({ className }: { className?: string }): JSX.Element {
  return (
    <nav
      className={cn(
        "grid grid-cols-2 lg:flex md:flex-row items-start lg:items-center gap-base font-normal leading-none",
        className,
      )}
    >
      {NAV_MENU_ITEMS.map(({ label, href }) => {
        if (!href) return null;
        return (
          <MenuLink key={label} href={href}>
            {label}
          </MenuLink>
        );
      })}
    </nav>
  );
}

export function SubMenu(): JSX.Element {
  return (
    <div className="w-full flex items-center justify-between md:justify-end gap-base font-normal leading-none text-white">
      <MenuLink href="/" className="text-xs">
        Login
      </MenuLink>
      <Button variant="outline" size="sm">
        <Zap size={12} strokeWidth={1.5} />
        <span>Early Access</span>
      </Button>
    </div>
  );
}

export function MenuLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <Link href={href}>
      <span className={cn("text-sm", className)}>{children}</span>
    </Link>
  );
}
