import { createContext, useCallback, useContext, useMemo, useState } from "react";

const SettingsContext = createContext(null);

const KEY_NAME = "tmtf:key";
const MODEL_NAME = "tmtf:model";

function read(storage, name) {
	try {
		return storage.getItem(name) ?? "";
	} catch {
		return "";
	}
}

function write(storage, name, value) {
	try {
		if (value) storage.setItem(name, value);
		else storage.removeItem(name);
	} catch {
		// Storage may be blocked; the setting then lasts only for this page view.
	}
}

function load() {
	const remembered = read(localStorage, KEY_NAME);
	return {
		key: remembered || read(sessionStorage, KEY_NAME),
		remember: Boolean(remembered),
		model: read(localStorage, MODEL_NAME),
	};
}

/**
 * The Gemini key lives in the browser only. By default it is kept for this tab
 * (sessionStorage); "remember" moves it to localStorage. It is sent to our server
 * on each request and never stored there.
 */
export function SettingsProvider({ children }) {
	const [settings, setSettings] = useState(load);
	const [dialogOpen, setDialogOpen] = useState(false);

	const save = useCallback((next) => {
		write(localStorage, KEY_NAME, next.remember ? next.key : "");
		write(sessionStorage, KEY_NAME, next.remember ? "" : next.key);
		write(localStorage, MODEL_NAME, next.model);
		setSettings(next);
	}, []);

	const value = useMemo(
		() => ({ settings, save, dialogOpen, openDialog: () => setDialogOpen(true), closeDialog: () => setDialogOpen(false) }),
		[settings, save, dialogOpen],
	);
	return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
	const value = useContext(SettingsContext);
	if (!value) throw new Error("useSettings must be used inside <SettingsProvider>");
	return value;
}
