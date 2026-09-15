import React, { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

export function MathRenderer({ text, className = "" }: { text: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";
    if (!text) return;

    const wrapper = document.createElement("div");

    try {
      // 1. Handle Code blocks (Multi-line ```code``` and inline `code`)
      let processedText = text
        .replace(/```([\s\S]*?)```/g, (_, code) => {
          const escapedCode = code
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          return `<pre class="my-2 overflow-x-auto rounded-lg border bg-muted/60 p-3 font-mono text-[0.85em] leading-relaxed"><code>${escapedCode.trim()}</code></pre>`;
        })
        .replace(/`([^`]+)`/g, (_, code) => {
          const escapedInline = code
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          return `<code class="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]">${escapedInline}</code>`;
        });

      // 2. Handle Display Math ($$ ... $$)
      processedText = processedText.replace(/\$\$(.*?)\$\$/g, (_, math) => {
        try {
          return katex.renderToString(math, { throwOnError: false, displayMode: true });
        } catch {
          return `$$${math}$$`;
        }
      });

      // 3. Handle Inline Math (\( ... \))
      processedText = processedText.replace(/\\\((.*?)\\\)/g, (_, math) => {
        try {
          return katex.renderToString(math, { throwOnError: false, displayMode: false });
        } catch {
          return `\\(${math}\\)`;
        }
      });

      wrapper.innerHTML = processedText;
    } catch {
      wrapper.textContent = text;
    }

    containerRef.current.appendChild(wrapper);
  }, [text]);

  return <div ref={containerRef} className={className} />;
}