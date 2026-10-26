# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "marimo",
#     "numpy",
#     "matplotlib",
# ]
# ///

import marimo

__generated_with = "0.25.2"
app = marimo.App(width="medium", app_title="Démo / Demo")


@app.cell
def _():
    import marimo as mo
    import numpy as np
    import matplotlib.pyplot as plt

    # Langue lue dans l'URL : /nb/demo/?lang=fr  ou  ?lang=en
    lang = mo.query_params().get("lang") or "fr"
    if lang not in ("fr", "en"):
        lang = "fr"

    T = {
        "fr": {
            "title": "Oscillation amortie",
            "intro": "Déplacez les curseurs : la figure se met à jour.",
            "freq": "Fréquence (Hz)",
            "tau": "Constante d'amortissement (s)",
            "xlabel": "Temps (s)",
            "ylabel": "Amplitude (u.a.)",
        },
        "en": {
            "title": "Damped oscillation",
            "intro": "Move the sliders: the figure updates.",
            "freq": "Frequency (Hz)",
            "tau": "Damping constant (s)",
            "xlabel": "Time (s)",
            "ylabel": "Amplitude (a.u.)",
        },
    }[lang]
    return T, mo, np, plt


@app.cell
def _(T, mo):
    freq = mo.ui.slider(1, 20, value=6, label=T["freq"])
    tau = mo.ui.slider(0.1, 3.0, step=0.1, value=1.0, label=T["tau"])
    mo.vstack([mo.md(f"# {T['title']}\n\n{T['intro']}"), freq, tau])
    return freq, tau


@app.cell
def _(T, freq, np, plt, tau):
    t = np.linspace(0, 4, 800)
    y = np.exp(-t / tau.value) * np.cos(2 * np.pi * freq.value * t)
    fig, ax = plt.subplots(figsize=(7, 3))
    ax.plot(t, y, color="#1b5e7a", lw=1.6)
    ax.set_xlabel(T["xlabel"])
    ax.set_ylabel(T["ylabel"])
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    fig
    return


if __name__ == "__main__":
    app.run()
