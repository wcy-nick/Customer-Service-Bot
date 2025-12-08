import React, { useEffect, useState } from 'react';
import { httpBlob } from '../api/http';
import { getDocument, updateDocument } from '../api/kb';

const getUrl = (base, url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (!base) return url;
  const b = base.replace(/\/+$/, '');
  const p = url.startsWith('/') ? url : '/' + url;
  return b + p;
};

export default function DocumentViewer({ doc, onClose, apiBase }) {
  const d = doc || {};
  const fileUrl = d.fileUrl || d.file_url || d.source_url || d.url || '';
  const fullUrl = getUrl(apiBase, fileUrl);
  const ext = (d.fileName || d.filename || fileUrl || '').toLowerCase();
  const [blobUrl, setBlobUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  const display = detail || d;
  const displayFileUrl = display.fileUrl || display.file_url || display.url || fileUrl;
  const displayFullUrl = getUrl(apiBase, displayFileUrl);
  const displayExt = (display.fileName || display.filename || displayFileUrl || '').toLowerCase();

  useEffect(() => {
    let revoked = false;
    if (!detail && d.id && !d.content) {
      setLoading(true);
      setError('');
      getDocument(d.id)
        .then((res) => setDetail(res || {}))
      .catch(() => setError('获取文档详情失败'))
      .finally(() => setLoading(false));
    }
    if (!(detail?.content) && displayFullUrl) {
      setLoading(true);
      setError('');
      // Use displayFileUrl (relative or absolute) for httpBlob. 
      // If absolute, httpBlob handles it (but might fail CORS). 
      // If relative, httpBlob joins with API_BASE (or uses proxy in dev).
      httpBlob(displayFileUrl).then(({ blob }) => {
        const url = URL.createObjectURL(blob);
        if (!revoked) setBlobUrl(url);
      }).catch(() => setError('预览加载失败'))
        .finally(() => setLoading(false));
    }
    return () => {
      revoked = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [displayFullUrl, d.id]);

  if (!doc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-800 truncate">{display.title || display.name || display.fileName || '文档预览'}</h3>
          <div className="flex items-center gap-2">
            {display.id && (
              editing ? (
                <button disabled={saving} onClick={async () => {
                  setSaving(true);
                  try {
                    await updateDocument(display.id, { title: editTitle, content: editContent });
                    setDetail({ ...(detail || display), title: editTitle, content: editContent });
                    setEditing(false);
                  } catch (e) {}
                  setSaving(false);
                }} className={`px-3 py-1 rounded ${saving ? 'bg-gray-300 text-gray-600' : 'bg-indigo-600 text-white'}`}>保存</button>
              ) : (
                <button onClick={() => { setEditTitle(display.title || ''); setEditContent(display.content || ''); setEditing(true); }} className="px-3 py-1 rounded bg-gray-100 text-gray-700">编辑</button>
              )
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">关闭</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {editing ? (
            <div className="space-y-3">
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full border border-gray-300 rounded p-2" placeholder="标题" />
              <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full border border-gray-300 rounded p-2 h-64" placeholder="内容" />
            </div>
          ) : display.content ? (
            <pre className="whitespace-pre-wrap text-sm text-gray-800">{display.content}</pre>
          ) : loading ? (
            <div className="text-gray-500 text-sm">正在加载预览...</div>
          ) : error ? (
            <div className="text-red-600 text-sm">{error}</div>
          ) : blobUrl ? (
            displayExt.includes('.pdf') ? (
              <iframe title="preview" src={blobUrl} className="w-full h-full border rounded" />
            ) : (
              <object data={blobUrl} className="w-full h-full" />
            )
          ) : displayFullUrl ? (
            <a href={displayFullUrl} target="_blank" rel="noreferrer" className="text-indigo-600">打开文件</a>
          ) : (
            <div className="text-gray-500 text-sm">暂无可预览内容</div>
          )}
        </div>
      </div>
    </div>
  );
}
