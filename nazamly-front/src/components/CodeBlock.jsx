import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

/**
 * CodeBlock component for professional syntax highlighting
 * @param {Object} props
 * @param {string} props.code - The code to highlight
 * @param {string} props.language - Programming language (cpp, javascript, python, java, emu8086, plsql)
 * @param {boolean} [props.showLineNumbers=true] - Whether to show line numbers
 * @param {number[]} [props.highlightLines=[]] - Array of line numbers to highlight
 */
export function CodeBlock({ 
  code, 
  language, 
  showLineNumbers = true,
  highlightLines = [] 
}) {
  return (
    <SyntaxHighlighter
      language={language}
      style={vscDarkPlus}
      showLineNumbers={showLineNumbers}
      wrapLines={true}
      lineProps={(lineNumber) => ({
        style: {
          backgroundColor: highlightLines.includes(lineNumber) 
            ? 'rgba(255, 255, 0, 0.1)' 
            : 'transparent',
        },
      })}
      customStyle={{
        borderRadius: '0.5rem',
        padding: '1rem',
        fontSize: '0.875rem',
        fontFamily: 'JetBrains Mono, Fira Code, Consolas, Monaco, monospace',
        margin: 0,
      }}
    >
      {code}
    </SyntaxHighlighter>
  );
}
