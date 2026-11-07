import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

const REMARK = [remarkMath];
const REHYPE = [rehypeKatex];

/** Renders tutor text: Markdown with LaTeX formulas. Raw HTML is never rendered. */
export function Markdown({ children }) {
	return (
		<div className="prose prose-sm prose-slate max-w-none prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0 prose-table:text-sm">
			<ReactMarkdown remarkPlugins={REMARK} rehypePlugins={REHYPE}>
				{children}
			</ReactMarkdown>
		</div>
	);
}
