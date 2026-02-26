import { afterEach, describe, expect, test } from "bun:test";

const LANGUAGE_PREF_KEY = "openwork.language";
const originalWindow = (globalThis as any).window;
const originalNavigator = (globalThis as any).navigator;

type WindowOptions = {
  language: string;
  languages?: string[];
  storedLocale?: string;
};

const createLocalStorage = (initial: Record<string, string> = {}) => {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
};

const installWindow = (options: WindowOptions) => {
  const navigatorStub = {
    language: options.language,
    languages: options.languages ?? [options.language],
  };
  const localStorage = createLocalStorage(
    options.storedLocale ? { [LANGUAGE_PREF_KEY]: options.storedLocale } : {},
  );

  (globalThis as any).window = {
    localStorage,
    navigator: navigatorStub,
  };
  (globalThis as any).navigator = navigatorStub;
};

const loadI18n = async () => {
  const nonce = `${Date.now()}-${Math.random()}`;
  return import(`../src/i18n/index.ts?test=${nonce}`);
};

afterEach(() => {
  if (typeof originalWindow === "undefined") {
    delete (globalThis as any).window;
  } else {
    (globalThis as any).window = originalWindow;
  }

  if (typeof originalNavigator === "undefined") {
    delete (globalThis as any).navigator;
  } else {
    (globalThis as any).navigator = originalNavigator;
  }
});

describe("i18n initLocale system default", () => {
  test("uses system zh when no stored preference", async () => {
    installWindow({ language: "zh-CN" });
    const i18n = await loadI18n();

    expect(i18n.initLocale()).toBe("zh");
    expect(i18n.currentLocale()).toBe("zh");
  });

  test("uses system en when no stored preference and system is en", async () => {
    installWindow({ language: "en-US" });
    const i18n = await loadI18n();

    expect(i18n.initLocale()).toBe("en");
    expect(i18n.currentLocale()).toBe("en");
  });

  test("stored preference overrides system language", async () => {
    installWindow({ language: "zh-CN", storedLocale: "en" });
    const i18n = await loadI18n();

    expect(i18n.initLocale()).toBe("en");
    expect(i18n.currentLocale()).toBe("en");
  });
});
