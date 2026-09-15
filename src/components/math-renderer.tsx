import React, { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

export function MathRenderer({ text, className = "" }: { text: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous contents
    containerRef.current.innerHTML = "";

    if (!text) return;

    // Simple parser to split normal text and LaTeX math blocks 
    // This handles both \( ... \) inline and raw expressions
    const wrapper = document.createElement("div");
    
    try {
      // Preprocess common shorthand if needed, or let KaTeX render the inner HTML string
      // We replace inline math markers \( ... \) with safe HTML spans for KaTeX
      let processedText = text
        .replace(/\\\((.*?)\\\)/g, (_, math) => {
          try {
            return katex.renderToString(math, { throwOnError: false, displayMode: false });
          } catch {
            return `\\(${math}\\)`;
          }
        })
        .replace(/\$\$(.*?)\$\$/g, (_, math) => {
          try {
            return katex.renderToString(math, { throwOnError: false, displayMode: true });
          } catch {
            return `$$${math}$$`;
          }
        });

      // If text contains un-delimited explicit latex commands like \frac{x}{y} outside brackets,
      // you can optionally parse them or render the string directly via katex auto-render or innerHTML.
      wrapper.innerHTML = processedText;
    } catch (e) {
      wrapper.textContent = text;
    }

    containerRef.current.appendChild(wrapper);
  }, [text]);

  return <div ref={containerRef} className={className} />;
}