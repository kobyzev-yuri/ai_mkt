export interface NavItem {
  href: string;
  label: string;
  match?: string[];
}

export interface NavBlock {
  label: string;
  items: NavItem[];
}

export function navItemActive(item: NavItem, pathname: string): boolean {
  const hrefs = [item.href, ...(item.match ?? [])];
  return hrefs.some((href) => {
    if (href === "/" || href === "/buy" || href === "/sell" || href === "/office") {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  });
}
