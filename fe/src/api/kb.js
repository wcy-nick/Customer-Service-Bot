import { http } from './http';

const normalize = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res && res.items)) return res.items;
  if (Array.isArray(res && res.data)) return res.data;
  return [];
};

const mapDoc = (d) => ({
  ...d,
  url: d?.source_url || d?.url || '',
  updatedAt: d?.updated_at || d?.updatedAt,
  views: d?.read_count ?? d?.views,
  businessId: d?.business_category_id ?? d?.businessId,
  scenarioId: d?.scenario_category_id ?? d?.scenarioId,
});

export const getBusinessCategories = async () => normalize(await http('/api/business-categories'));
export const createBusinessCategory = (payload) => http('/api/business-categories', { method: 'POST', body: payload });
export const updateBusinessCategory = (id, payload) => http(`/api/business-categories/${id}`, { method: 'PUT', body: payload });
export const deleteBusinessCategory = (id) => http(`/api/business-categories/${id}`, { method: 'DELETE' });
export const getScenariosByBusiness = async (businessId) => normalize(await http(`/api/business-categories/${businessId}/scenarios`));
export const createScenario = (businessId, payload) => http(`/api/business-categories/${businessId}/scenarios`, { method: 'POST', body: payload });
export const updateScenario = (id, payload) => http(`/api/scenarios/${id}`, { method: 'PUT', body: payload });
export const deleteScenario = (id) => http(`/api/scenarios/${id}`, { method: 'DELETE' });

export const getDocuments = async (params) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const res = await http(`/api/documents${qs}`);
  return normalize(res).map(mapDoc);
};

export const getDocument = async (id) => {
  const d = await http(`/api/documents/${id}`);
  return mapDoc(d || {});
};
export const updateDocument = (id, payload) => http(`/api/documents/${id}`, { method: 'PUT', body: payload });
export const deleteDocument = (id) => http(`/api/documents/${id}`, { method: 'DELETE' });
export const publishDocument = (id) => http(`/api/documents/${id}/publish`, { method: 'POST' });
export const archiveDocument = (id) => http(`/api/documents/${id}/archive`, { method: 'POST' });
export const vectorizeDocument = (id) => http(`/api/documents/${id}/vectorize`, { method: 'POST' });
export const getDocumentVersions = async (id) => normalize(await http(`/api/documents/${id}/versions`));
export const getDocumentVersion = (id, version) => http(`/api/documents/${id}/versions/${version}`);
export const rollbackDocumentVersion = (id, version) => http(`/api/documents/${id}/rollback/${version}`, { method: 'POST' });

export const createDocument = (payload) => {
  if (payload && payload.file) {
    const fd = new FormData();
    if (payload.title) fd.append('title', payload.title);
    if (payload.businessId) fd.append('businessId', String(payload.businessId));
    if (payload.scenarioId) fd.append('scenarioId', String(payload.scenarioId));
    fd.append('file', payload.file);
    if (payload.content) fd.append('content', payload.content);
    if (payload.sourceType) fd.append('sourceType', payload.sourceType);
    return http('/api/documents', { method: 'POST', headers: {}, body: fd });
  }
  return http('/api/documents', { method: 'POST', body: payload });
};

export const syncDouyinKnowledge = () => http('/api/sync/douyin-knowledge', { method: 'POST' });
