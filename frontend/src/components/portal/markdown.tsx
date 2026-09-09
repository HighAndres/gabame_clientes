import ReactMarkdown from "react-markdown";

/** Markdown del contenido capturado por el admin. Sin HTML crudo: react-markdown lo escapa. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="flex flex-col gap-3 text-[15px] leading-relaxed">
      <ReactMarkdown
        components={{
          h1: (p) => <h3 className="mt-4 text-lg font-bold" {...p} />,
          h2: (p) => <h3 className="mt-4 text-lg font-bold" {...p} />,
          h3: (p) => <h4 className="mt-3 text-base font-bold" {...p} />,
          ul: (p) => <ul className="list-disc space-y-1 pl-5" {...p} />,
          ol: (p) => <ol className="list-decimal space-y-1 pl-5" {...p} />,
          a: (p) => <a className="text-primary underline" target="_blank" rel="noopener noreferrer" {...p} />,
          table: (p) => (
            <div className="overflow-x-auto">
              <table className="w-full border text-left text-sm" {...p} />
            </div>
          ),
          th: (p) => <th className="border bg-background px-2 py-1" {...p} />,
          td: (p) => <td className="border px-2 py-1" {...p} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
