import { useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from 'react';

export interface Route { path: string; params: URLSearchParams; }

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  return { path: path.startsWith('/') ? path : `/${path}`, params: new URLSearchParams(query) };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const onChange = () => { setRoute(parse()); window.scrollTo({ top: 0 }); };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(to: string) {
  window.location.hash = to.startsWith('#') ? to : `#${to}`;
}

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  children: ReactNode;
  active?: boolean;
}

export function Link({ to, children, active, className, ...rest }: LinkProps) {
  const cls = [className, active ? 'is-active' : ''].filter(Boolean).join(' ') || undefined;
  return <a href={`#${to}`} className={cls} aria-current={active ? 'page' : undefined} {...rest}>{children}</a>;
}
