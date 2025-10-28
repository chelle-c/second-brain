import React from "react";

export function useClickOutside(ref: React.RefObject<any>, onClickOutside: Function) {
	let currentRef = ref.current;
	// Invoke Function onClick outside of element
	function handleClickOutside(event: { target: any }) {
		if (currentRef && !currentRef.contains(event.target)) {
			onClickOutside();
			currentRef = null;
		}
	}
	// Bind
	document.addEventListener("mousedown", handleClickOutside);
	return () => {
		// dispose
		document.removeEventListener("mousedown", handleClickOutside);
		currentRef = null;
	};
}
