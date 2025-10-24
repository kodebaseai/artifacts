import { Bolt, PanelsTopLeft, ServerCog, SquareTerminal } from "lucide-react";

export type MainNavMenuItemLink = {
  href: string;
  title: string;
  description?: string;
  icon?: React.ElementType;
};

export type MainNavMenuItem = {
  label: string;
  href?: string;
  links?: MainNavMenuItemLink[][];
};

export const MAIN_NAV_MENU_ITEMS: MainNavMenuItem[] = [
  {
    label: "Features",
    links: [
      [
        {
          href: "/features",
          title: "Features overview",
          icon: Bolt,
        },
      ],
      [
        {
          href: "/features/cli",
          title: "CLI Tools",
          description: "A set of CLI tools for managing your data",
          icon: SquareTerminal,
        },
        {
          href: "/features/mcp",
          title: "MCP Server",
          description: "A set of MCP tools for managing your data",
          icon: ServerCog,
        },
        {
          href: "/features/web-ui",
          title: "Web UI",
          description: "A web app for managing your data",
          icon: PanelsTopLeft,
        },
      ],
    ],
  },
  {
    label: "Pricing",
    href: "/pricing",
  },
  {
    label: "Documentation",
    href: "/documentation",
  },
  {
    label: "Updates",
    href: "/updates",
  },
];

export const NAV_MENU_ITEMS: MainNavMenuItem[] = [
  {
    label: "Features",
    href: "/features",
  },
  {
    label: "Pricing",
    href: "/pricing",
  },
  {
    label: "Documentation",
    href: "/documentation",
  },
  {
    label: "Updates",
    href: "/updates",
  },
  {
    label: "Privacy",
    href: "/privacy",
  },
  {
    label: "Terms",
    href: "/terms",
  },
];
