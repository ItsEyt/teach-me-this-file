import { useEffect, useRef } from "react";
import { CloseIcon } from "./icons.jsx";

/**
 * A dialog that slides up from the bottom on phones and sits at the side on larger screens.
 * Closes on Escape or a tap outside, and returns focus to where it was opened from.
 */
export function Sheet({ title, onClose, children }) {
	const closeRef = useRef(null);

	useEffect(() => {
		const opener = document.activeElement;
		closeRef.current?.focus();
		const onKey = (event) => event.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		return () => {
			window.removeEventListener("keydown", onKey);
			opener?.focus?.();
		};
	}, [onClose]);

	return (
		<div className="fixed inset-0 z-40 flex items-end md:items-stretch md:justify-end">
			<button
				type="button"
				aria-label="Close"
				tabIndex={-1}
				onClick={onClose}
				className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
			/>
			<section
				role="dialog"
				aria-modal="true"
				aria-label={title}
				className="relative flex max-h-[85dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl md:max-h-none md:w-105 md:rounded-none">
				<header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
					<h2 className="text-base font-semibold">{title}</h2>
					<button
						ref={closeRef}
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="rounded-full p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600">
						<CloseIcon />
					</button>
				</header>
				<div className="overflow-y-auto px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
			</section>
		</div>
	);
}
