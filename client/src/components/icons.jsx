const base = {
	width: 20,
	height: 20,
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 2,
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": true,
};

export const SendIcon = (props) => (
	<svg {...base} {...props}>
		<path d="M5 12h14M13 6l6 6-6 6" />
	</svg>
);

export const StopIcon = (props) => (
	<svg {...base} fill="currentColor" stroke="none" {...props}>
		<rect x="6" y="6" width="12" height="12" rx="2" />
	</svg>
);

export const DocIcon = (props) => (
	<svg {...base} {...props}>
		<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
		<path d="M14 3v5h5M9 13h6M9 17h4" />
	</svg>
);

export const UploadIcon = (props) => (
	<svg {...base} {...props}>
		<path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
	</svg>
);

export const CloseIcon = (props) => (
	<svg {...base} {...props}>
		<path d="M6 6l12 12M18 6L6 18" />
	</svg>
);

export const GearIcon = (props) => (
	<svg {...base} {...props}>
		<circle cx="12" cy="12" r="3" />
		<path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
	</svg>
);

export const ListIcon = (props) => (
	<svg {...base} {...props}>
		<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
	</svg>
);

export const CheckIcon = (props) => (
	<svg {...base} {...props}>
		<path d="M5 12l5 5 9-10" />
	</svg>
);
