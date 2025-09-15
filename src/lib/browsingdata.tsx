import { openDB } from "idb";
import toast from "solid-toast";
import type { BrowsingData } from "./types";
import { setImportStatus, setExportStatus } from "../routes/settings";
import { createSuccessToast } from "../components/toast";

export async function exportData() {
  setExportStatus(false);
  const db = await openDB("__op", 1, {
    upgrade(db) {
      const store = db.createObjectStore("cookies", {
        keyPath: "id",
      });
      store.createIndex("path", "path");
    },
  });
  const data: BrowsingData = {
    cookies: [],
    localStorage: [],
  };

  // Local storage
  for (const key in localStorage) {
    if (key.startsWith("__uv$")) {
      const value = localStorage.getItem(key);
      if (!value) continue;

      data.localStorage?.push({
        key,
        value,
      });
    }
  }

  // Cookies
  const cookies = await db.getAll("cookies");
  data.cookies = cookies;

  const link = document.createElement("a");
  const file = new Blob([JSON.stringify(data)], { type: "text/plain" });
  link.href = URL.createObjectURL(file);
  link.download = `mocha-export-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();

  toast.custom(createSuccessToast("Browsing data exported."));

  setExportStatus(true);
}

export async function importData(fileImport: HTMLInputElement) {
  setImportStatus(false);
  const db = await openDB("__op", 1, {
    upgrade(db) {
      const store = db.createObjectStore("cookies", {
        keyPath: "id",
      });
      store.createIndex("path", "path");
    },
  });
  fileImport.click();

  fileImport.addEventListener("change", (event) => {
    if (!(event.target as HTMLInputElement).files) return;

    const file = (event.target as HTMLInputElement).files;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result;

      const data: BrowsingData = JSON.parse(content as string);

      await resetData(false);

      if (data.localStorage) {
        for (const item of data.localStorage) {
          localStorage.setItem(item.key, item.value);
        }
      }

      if (data.cookies) {
        for (const item of data.cookies) {
          if (item.set) item.set = new Date(item.set as string);
          if (item.expires) item.expires = new Date(item.expires as string);

          await db.add("cookies", item);
        }
      }

      toast.custom(createSuccessToast(`Browsing data imported from ${file.item(0)?.name}`));

      setImportStatus(true);
    };

    const item = file.item(0);
    if (!item) return;

    reader.readAsText(item);
  });
}

export async function resetData(showNotification = true) {
  const db = await openDB("__op", 1, {
    upgrade(db) {
      const store = db.createObjectStore("cookies", {
        keyPath: "id",
      });
      store.createIndex("path", "path");
    },
  });

  for (const key in localStorage) {
    if (key.startsWith("__uv$")) localStorage.removeItem(key);
  }

  await db.clear("cookies");

  if (showNotification)
    toast.custom(createSuccessToast("Browsing data deleted."));
}
