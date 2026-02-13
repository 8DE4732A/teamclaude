export interface Route {
  path: string;
  render: () => HTMLElement | Promise<HTMLElement>;
}

export interface Router {
  mount(container: HTMLElement): void;
  navigate(path: string): void;
  destroy(): void;
}

export function createRouter(routes: Route[], fallbackPath: string): Router {
  let container: HTMLElement | null = null;
  let onHashChange: (() => void) | null = null;

  function currentPath(): string {
    const hash = window.location.hash.replace(/^#/, '');
    return hash || fallbackPath;
  }

  async function renderCurrent(): Promise<void> {
    if (!container) return;
    const target = container;
    const path = currentPath();
    const route = routes.find((r) => r.path === path);
    const element = route ? await route.render() : await routes.find((r) => r.path === fallbackPath)!.render();
    if (!container) return;
    target.replaceChildren(element);
  }

  return {
    mount(target: HTMLElement) {
      container = target;
      onHashChange = () => void renderCurrent();
      window.addEventListener('hashchange', onHashChange);
      if (!window.location.hash) {
        window.location.hash = `#${fallbackPath}`;
      } else {
        void renderCurrent();
      }
    },
    navigate(path: string) {
      window.location.hash = `#${path}`;
    },
    destroy() {
      if (onHashChange) {
        window.removeEventListener('hashchange', onHashChange);
        onHashChange = null;
      }
      container = null;
    },
  };
}
