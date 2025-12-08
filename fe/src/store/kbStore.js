const KEY = 'kb_local_docs';

export function loadLocalDocs() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalDocs(arr) {
  localStorage.setItem(KEY, JSON.stringify(arr || []));
}

export function addLocalDoc(doc) {
  const arr = loadLocalDocs();
  arr.unshift(doc);
  saveLocalDocs(arr);
  return arr;
}

export function removeLocalDocByTempId(tempId) {
  const arr = loadLocalDocs().filter((d) => d.tempId !== tempId);
  saveLocalDocs(arr);
  return arr;
}

export function replaceLocalDoc(tempId, serverDoc) {
  const arr = loadLocalDocs();
  const idx = arr.findIndex((d) => d.tempId === tempId);
  if (idx !== -1) {
    arr.splice(idx, 1);
    saveLocalDocs(arr);
  }
  return arr;
}

export function mergeDocs(serverDocs) {
  const local = loadLocalDocs();
  const s = Array.isArray(serverDocs) ? serverDocs : (Array.isArray(serverDocs?.items) ? serverDocs.items : []);
  return [...local, ...s];
}
