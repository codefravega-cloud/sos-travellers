import { Component, type ReactNode } from "react";

type Locale = "es" | "en" | "pt" | "fr";

const copy: Record<Locale, { title: string; text: string; retry: string }> = {
  es: { title: "Algo salió mal", text: "No pudimos mostrar esta página. Intenta nuevamente en un momento.", retry: "Recargar" },
  en: { title: "Something went wrong", text: "We could not show this page. Please try again in a moment.", retry: "Reload" },
  pt: { title: "Algo deu errado", text: "Não foi possível mostrar esta página. Tente novamente em instantes.", retry: "Recarregar" },
  fr: { title: "Une erreur est survenue", text: "Impossible d'afficher cette page. Réessayez dans un instant.", retry: "Recharger" },
};

function savedLocale(): Locale {
  try {
    const value = localStorage.getItem("sos-language");
    return value && value in copy ? value as Locale : "es";
  } catch {
    return "es";
  }
}

// Without this, one error while drawing leaves the visitor with a blank page and nothing to do.
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const t = copy[savedLocale()];
    return <main className="team team-gate" role="alert">
      <h1>{t.title}</h1>
      <p>{t.text}</p>
      <button type="button" onClick={() => window.location.reload()}>{t.retry}</button>
    </main>;
  }
}
