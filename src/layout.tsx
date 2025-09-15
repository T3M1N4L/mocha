import { type ParentProps, onCleanup, onMount } from "solid-js";
import { Toaster } from "solid-toast";
import Navbar from "./components/navbar";

import { handleCloaking } from "./lib/ab-blob";
import { handleTabCloak } from "./lib/cloak";
import { handlePanicKey } from "./lib/panic";
import { handleTheme } from "./lib/theme";
import { setupProxy } from "./lib/proxy";
import { setBookmarks } from "./lib/bookmarks";
import type { Bookmark } from "./lib/types";
import store from "store2";

export default function Layout(props: ParentProps) {
  onMount(async () => {
    handleTabCloak();
    handleTheme();
    handleCloaking();
    setBookmarks(store("bookmarks") as Bookmark[]);
    await setupProxy();
    document.addEventListener("keydown", handlePanicKey);
  });

  onCleanup(() => {
    document.removeEventListener("keydown", handlePanicKey);
  });
  return (
    <div>
      <Navbar />
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          duration: 4000,
          style: {
            border: '1px solid oklch(var(--bc) / 0.2)',
            background: 'oklch(var(--b2))',
            color: 'oklch(var(--bc))',
            'border-radius': '0.5rem',
            'box-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            'backdrop-filter': 'blur(8px)',
          }
        }}
        containerStyle={{
          top: 'auto',
          right: '16px',
          bottom: '16px',
          left: 'auto',
        }}
        gutter={8}
      />
      {props.children}
    </div>
  );
}
