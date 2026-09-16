import ReactMarkdown, { type ExtraProps } from "react-markdown";

/**
 * react-markdown pasa a cada componente el nodo del arbol (`node`). Esparcirlo sobre un elemento
 * del DOM lo convierte en un atributo `node="[object Object]"` y en una advertencia de React por
 * cada etiqueta; se retira antes.
 */
function sinNodo<P extends ExtraProps>({ node: _node, ...resto }: P): Omit<P, "node"> {
  return resto;
}

/** Markdown del contenido capturado por el admin. Sin HTML crudo: react-markdown lo escapa. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="flex flex-col gap-3 text-[15px] leading-relaxed">
      <ReactMarkdown
        components={{
          h1: (p) => <h3 className="mt-4 text-lg font-bold" {...sinNodo(p)} />,
          h2: (p) => <h3 className="mt-4 text-lg font-bold" {...sinNodo(p)} />,
          h3: (p) => <h4 className="mt-3 text-base font-bold" {...sinNodo(p)} />,
          ul: (p) => <ul className="list-disc space-y-1 pl-5" {...sinNodo(p)} />,
          ol: (p) => <ol className="list-decimal space-y-1 pl-5" {...sinNodo(p)} />,
          a: (p) => <a {...sinNodo(p)} className="text-primary underline" target="_blank" rel="noopener noreferrer" />,
          table: (p) => (
            <div className="overflow-x-auto">
              <table className="w-full border text-left text-sm" {...sinNodo(p)} />
            </div>
          ),
          th: (p) => <th className="border bg-background px-2 py-1" {...sinNodo(p)} />,
          td: (p) => <td className="border px-2 py-1" {...sinNodo(p)} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
