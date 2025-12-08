import { http } from './http';

export const getOverview = async () => {
  const res = await http('/api/analytics/dashboard/overview');
  const o = res || {};
  const trend = Array.isArray(o.trend_data) ? o.trend_data.map((t) => ({ name: t.date || '', sessions: t.sessions ?? 0, messages: t.messages ?? 0 })) : [];
  return {
    total_sessions: o.total_sessions ?? 0,
    total_messages: o.total_messages ?? 0,
    total_users: o.total_users ?? 0,
    average_session_duration: o.average_session_duration ?? 0,
    satisfaction_score: o.satisfaction_score ?? 0,
    trend
  };
};

export const getFrequentQuestions = async () => {
  const res = await http('/api/analytics/frequent-questions');
  const list = Array.isArray(res) ? res : (Array.isArray(res?.items) ? res.items : (Array.isArray(res?.data) ? res.data : []));
  return list.map((x) => ({ name: x.question || x.title || '', value: x.frequency ?? x.count ?? 0 }));
};

export const getUsageTrends = async () => {
  const res = await http('/api/analytics/usage-trends');
  const list = Array.isArray(res) ? res : (Array.isArray(res?.items) ? res.items : (Array.isArray(res?.data) ? res.data : []));
  const map = {};
  for (const x of list) {
    const d = x.date || x.day || '';
    if (!map[d]) map[d] = { name: d, sessions: 0, messages: 0 };
    if ((x.metric || '').toLowerCase() === 'sessions') map[d].sessions = x.value ?? x.sessions ?? 0;
    if ((x.metric || '').toLowerCase() === 'messages') map[d].messages = x.value ?? x.messages ?? 0;
  }
  return Object.values(map);
};

export const getUnansweredQuestions = async () => {
  const res = await http('/api/analytics/unanswered-questions');
  const items = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
  const total = Number(res?.meta?.total ?? (Array.isArray(items) ? items.length : 0));
  return { total, items: items.map((x) => ({ id: x.id || '', question: x.question || '', count: x.ask_count ?? x.count ?? 0 })) };
};
