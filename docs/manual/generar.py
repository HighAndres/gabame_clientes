"""Arma `manual-usuario.html` a partir de `manual-usuario.md`.

Un solo archivo que se puede mandar por correo o imprimir: las capturas viajan dentro, en base64,
y el estilo usa los colores del sistema de diseno (docs/diseno.md).

    python docs/manual/generar.py

Markdown reconocido: titulos, parrafos, listas, tablas, imagenes, negritas, codigo y enlaces.
Es el subconjunto que usa el manual; si el manual crece, crece esto.
"""

import base64
import html
import mimetypes
import pathlib
import re
import sys

AQUI = pathlib.Path(__file__).parent
FUENTE = AQUI / "manual-usuario.md"
SALIDA = AQUI / "manual-usuario.html"

ESTILO = """
:root { --azul:#3d7cc9; --gris:#504f51; --tinta:#2b2b2d; --suave:#6b6f76; --borde:#e3e6ea; --fondo:#f6f7f9; }
body { margin:0; background:var(--fondo); color:var(--tinta); font:16px/1.6 "Segoe UI", system-ui, sans-serif; }
main { max-width: 960px; margin: 0 auto; padding: 32px 20px 80px; }
h1 { color: var(--gris); font-size: 2rem; border-bottom: 3px solid var(--azul); padding-bottom: 8px; }
h2 { color: var(--gris); margin-top: 2.5em; }
h3 { color: var(--gris); margin-top: 1.8em; }
figure { margin: 16px 0 24px; }
figure img { width: 100%; height: auto; border: 1px solid var(--borde); border-radius: 10px; }
figcaption { font-size: .85rem; color: var(--suave); margin-top: 6px; }
table { border-collapse: collapse; width: 100%; margin: 12px 0; }
th, td { border: 1px solid var(--borde); padding: 8px 10px; text-align: left; vertical-align: top; }
th { background: #eaf1fa; color: #2b5a91; }
code { background: #eef0f3; padding: 1px 5px; border-radius: 4px; font-size: .9em; }
a { color: var(--azul); }
strong { color: var(--gris); }
@media print { body { background:#fff; } figure { break-inside: avoid; } h2 { break-before: page; } }
"""


def en_linea(texto: str) -> str:
    """Negritas, codigo, enlaces. Se escapa antes para no confiar en el markdown."""
    t = html.escape(texto)
    t = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    return t


def imagen(ruta: str, alt: str) -> str:
    archivo = AQUI / ruta
    if not archivo.exists():
        print(f"FALTA la captura {ruta}", file=sys.stderr)
        sys.exit(1)
    tipo = mimetypes.guess_type(archivo.name)[0] or "image/png"
    datos = base64.b64encode(archivo.read_bytes()).decode("ascii")
    return (
        f'<figure><img src="data:{tipo};base64,{datos}" alt="{html.escape(alt)}">'
        f"<figcaption>{html.escape(alt)}</figcaption></figure>"
    )


def convertir(md: str) -> str:
    salida: list[str] = []
    lineas = md.splitlines()
    i = 0
    while i < len(lineas):
        linea = lineas[i]

        if not linea.strip():
            i += 1
            continue

        if linea.startswith("#"):
            nivel = len(linea) - len(linea.lstrip("#"))
            salida.append(f"<h{nivel}>{en_linea(linea[nivel:].strip())}</h{nivel}>")
            i += 1
            continue

        # Una linea que solo trae imagenes (pueden ser dos, una al lado de otra).
        if re.fullmatch(r"(!\[[^\]]*\]\([^)]+\)\s*)+", linea.strip()):
            for alt, ruta in re.findall(r"!\[([^\]]*)\]\(([^)]+)\)", linea):
                salida.append(imagen(ruta, alt))
            i += 1
            continue

        if linea.lstrip().startswith(("- ", "1. ")):
            etiqueta = "ul" if linea.lstrip().startswith("- ") else "ol"
            items: list[str] = []
            while i < len(lineas) and lineas[i].strip():
                actual = lineas[i].strip()
                if re.match(r"^(-|\d+\.)\s", actual):
                    items.append(re.sub(r"^(-|\d+\.)\s", "", actual))
                else:  # continuacion de la linea anterior
                    items[-1] += " " + actual
                i += 1
            salida.append(f"<{etiqueta}>" + "".join(f"<li>{en_linea(x)}</li>" for x in items) + f"</{etiqueta}>")
            continue

        if linea.startswith("|"):
            filas = []
            while i < len(lineas) and lineas[i].startswith("|"):
                filas.append([c.strip() for c in lineas[i].strip().strip("|").split("|")])
                i += 1
            cabecera, *resto = [f for f in filas if not all(set(c) <= set("-: ") for c in f)]
            cuerpo = "".join(
                "<tr>" + "".join(f"<td>{en_linea(c)}</td>" for c in fila) + "</tr>" for fila in resto
            )
            salida.append(
                "<table><thead><tr>"
                + "".join(f"<th>{en_linea(c)}</th>" for c in cabecera)
                + f"</tr></thead><tbody>{cuerpo}</tbody></table>"
            )
            continue

        parrafo = []
        while i < len(lineas) and lineas[i].strip() and not lineas[i].startswith(("#", "|", "-", "1. ", "!")):
            parrafo.append(lineas[i].strip())
            i += 1
        salida.append(f"<p>{en_linea(' '.join(parrafo))}</p>")

    return "".join(salida)


def main() -> None:
    md = FUENTE.read_text(encoding="utf-8")
    titulo = md.splitlines()[0].lstrip("# ").strip()
    SALIDA.write_text(
        "<!doctype html>\n"
        '<html lang="es-MX"><head><meta charset="utf-8">'
        f"<title>{html.escape(titulo)}</title>"
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        f"<style>{ESTILO}</style></head><body><main>\n{convertir(md)}\n</main></body></html>\n",
        encoding="utf-8",
    )
    print(f"{SALIDA.name}: {SALIDA.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
