import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export function ChatMarkdown({ content }: { content: string }) {
  return (
    <div
      className={cn(
        "text-[15px] leading-7 text-foreground/95",
        "[&>p]:mb-3 [&>p:last-child]:mb-0",
        "[&>ul]:mb-3 [&>ul]:list-disc [&>ul]:space-y-1.5 [&>ul]:pl-5",
        "[&>ol]:mb-3 [&>ol]:list-decimal [&>ol]:space-y-1.5 [&>ol]:pl-5",
        "[&>h1]:mb-2 [&>h1]:mt-5 [&>h1]:text-xl [&>h1]:font-semibold",
        "[&>h2]:mb-2 [&>h2]:mt-5 [&>h2]:text-lg [&>h2]:font-semibold",
        "[&>h3]:mb-2 [&>h3]:mt-4 [&>h3]:text-base [&>h3]:font-semibold",
        "[&>blockquote]:border-l [&>blockquote]:border-border [&>blockquote]:pl-3 [&>blockquote]:text-muted-foreground",
        "[&>pre]:mb-3 [&>pre]:overflow-x-auto [&>pre]:rounded-lg [&>pre]:bg-surface-raised [&>pre]:p-3",
        "[&_code]:rounded [&>p_code]:bg-surface-raised [&>p_code]:px-1 [&>p_code]:py-0.5 [&>p_code]:text-[13px]",
        "[&_strong]:font-semibold",
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-border/70">
              <table className="w-full min-w-[420px] border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-border/70 bg-surface-raised/60 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border/40 px-3 py-2 align-top text-[13px]">{children}</td>
          ),
          a: ({ href, children }) => (
            <a href={href} className="underline decoration-border underline-offset-2 hover:text-foreground">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
