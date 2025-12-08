import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './auth/AuthContext';
import LoginView from './components/LoginView';
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  Plus,
  Search,
  FileText,
  Trash2,
  Edit3,
  MoreVertical,
  Send,
  Mic,
  Image as ImageIcon,
  ChevronRight,
  Bot,
  User,
  X,
  AlertCircle,
  Clock,
  Menu
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { getOverview, getFrequentQuestions, getUsageTrends, getUnansweredQuestions } from './api/analytics';
import { getBusinessCategories, getScenariosByBusiness, getDocuments, createDocument, deleteDocument, getDocument, updateDocument, syncDouyinKnowledge } from './api/kb';
import { mergeDocs, addLocalDoc, replaceLocalDoc, removeLocalDocByTempId, loadLocalDocs } from './store/kbStore';
import DocumentViewer from './components/DocumentViewer';
import { getSessions, createSession, getSessionMessages, sendMessageStream, deleteSession, updateSessionTitle } from './api/chat';

const CATEGORIES = {
  '商家入驻': ['资质审核', '保证金', '店铺命名'],
  '商品管理': ['上架规范', '违禁词', '库存管理'],
  '售后服务': ['退换货', '纠纷处理']
};

const INITIAL_DOCS = [
  { id: 1, title: '2024年食品类目入驻资质标准.pdf', category: '商家入驻', subCategory: '资质审核', status: 'active', updateTime: '2024-05-20', views: 1240 },
  { id: 2, title: '直播间违禁词汇表_V3.0.docx', category: '商品管理', subCategory: '违禁词', status: 'active', updateTime: '2024-05-18', views: 3500 },
  { id: 3, title: '退换货运费险理赔流程', category: '售后服务', subCategory: '退换货', status: 'reviewing', updateTime: '2024-05-15', views: 890 },
  { id: 4, title: '个人店升级企业店操作指引', category: '商家入驻', subCategory: '店铺命名', status: 'inactive', updateTime: '2024-01-10', views: 450 }
];

const CHART_DATA_HOT = [
  { name: '资质审核', value: 4000 },
  { name: '违禁词查询', value: 3000 },
  { name: '发货规则', value: 2000 },
  { name: '保证金', value: 2780 },
  { name: '运费险', value: 1890 }
];

const CHART_DATA_TREND = [
  { name: '周一', visits: 4000, queries: 2400 },
  { name: '周二', visits: 3000, queries: 1398 },
  { name: '周三', visits: 2000, queries: 9800 },
  { name: '周四', visits: 2780, queries: 3908 },
  { name: '周五', visits: 1890, queries: 4800 },
  { name: '周六', visits: 2390, queries: 3800 },
  { name: '周日', visits: 3490, queries: 4300 }
];

const DashboardView = () => {
  const [overview, setOverview] = useState({ total_sessions: 0, total_messages: 0, total_users: 0, average_session_duration: 0, satisfaction_score: 0 });
  const [hot, setHot] = useState([]);
  const [trend, setTrend] = useState([]);
  const [unanswered, setUnanswered] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [ov, h, t, u] = await Promise.all([
          getOverview(),
          getFrequentQuestions(),
          getUsageTrends(),
          getUnansweredQuestions()
        ]);
        setOverview(ov || {});
        setHot(Array.isArray(h) ? h : []);
        setTrend(Array.isArray(t) ? t : []);
        setUnanswered(Array.isArray(u?.items) ? u.items : []);
      } catch (e) {
        setOverview({ total_sessions: 0, total_messages: 0, total_users: 0, average_session_duration: 0, satisfaction_score: 0 });
        setHot([]);
        setTrend([]);
        setUnanswered([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-gray-800">数据洞察看板</h2>
        <p className="text-gray-500 text-sm mt-1">实时监控知识库覆盖率与用户提问趋势</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: '会话总数', value: String(overview.total_sessions || 0), icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-100' },
          { label: '消息总数', value: String(overview.total_messages || 0), icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: '用户总数', value: String(overview.total_users || 0), icon: User, color: 'text-purple-600', bg: 'bg-purple-100' },
          { label: '平均会话时长(s)', value: String(overview.average_session_duration || 0), icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-100' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
            <div className={`p-3 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <h3 className="text-2xl font-bold text-gray-800">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <span className="w-1 h-5 bg-indigo-500 mr-2 rounded"></span>
            高频问题 Top 10
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hot} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#f3f4f6' }} />
                <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <span className="w-1 h-5 bg-green-500 mr-2 rounded"></span>
            会话量与知识调用趋势
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="sessions" stroke="#4f46e5" strokeWidth={2} dot={false} activeDot={{ r: 6 }} name="会话量" />
                <Line type="monotone" dataKey="messages" stroke="#10b981" strokeWidth={2} dot={false} name="消息量" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-red-600 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            知识库盲区（零命中问题）
          </h3>
          <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">导出报表</button>
        </div>
        <div className="overflow-hidden">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="py-3 px-4 font-medium text-gray-500">用户提问</th>
                <th className="py-3 px-4 font-medium text-gray-500">提问频次</th>
                <th className="py-3 px-4 font-medium text-gray-500">建议分类</th>
                <th className="py-3 px-4 font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(loading ? [] : unanswered).map((row) => (
                <tr key={row.id}>
                  <td className="py-3 px-4">{row.question}</td>
                  <td className="py-3 px-4">{row.count}</td>
                  <td className="py-3 px-4"><span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">未分类</span></td>
                  <td className="py-3 px-4 text-indigo-600 cursor-pointer">创建知识</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const KnowledgeBaseView = () => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterCat, setFilterCat] = useState('All');
  const [businesses, setBusinesses] = useState([]);
  const [scenariosMap, setScenariosMap] = useState({});
  const [searchText, setSearchText] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formBusinessId, setFormBusinessId] = useState('');
  const [formScenarioId, setFormScenarioId] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formFile, setFormFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [viewerDoc, setViewerDoc] = useState(null);

  const statusMap = {
    published: { text: '生效中', color: 'bg-green-100 text-green-800' },
    draft: { text: '草稿', color: 'bg-yellow-100 text-yellow-800' },
    archived: { text: '已归档', color: 'bg-gray-100 text-gray-800' }
  };

  useEffect(() => {
    getBusinessCategories()
      .then((list) => {
        setBusinesses(list || []);
        (list || []).forEach(async (b) => {
          const scs = await getScenariosByBusiness(b.id);
          setScenariosMap((prev) => ({ ...prev, [b.id]: scs || [] }));
        });
      })
      .finally(() => {});
    getDocuments()
      .then((list) => setDocs(mergeDocs(list || [])))
      .finally(() => setLoading(false));
  }, []);

  const refreshDocs = async () => {
    setLoading(true);
    const list = await getDocuments();
    setDocs(mergeDocs(list || []));
    setLoading(false);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">知识库管理</h2>
          <p className="text-gray-500 text-sm mt-1">管理商家经营所需的标准文档与问答对</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>新增知识</span>
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="搜索文档标题或内容..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white transition-all"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
          >
            <option value="All">所有业务场景</option>
            {businesses.map((b) => (
              <option key={b.id} value={String(b.id)}>{b.name || b.title || b.label || b.id}</option>
            ))}
          </select>
          <select className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option>所有状态</option>
            <option>生效中</option>
            <option>草稿</option>
            <option>已归档</option>
          </select>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">文档名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">业务场景</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">更新时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">热度</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(
                loading
                  ? []
                  : (Array.isArray(docs) ? docs : (Array.isArray(docs?.items) ? docs.items : []))
              )
                .filter((d) => {
                  if (filterCat === 'All') return true;
                  return String(d.businessId || d.business_id) === String(filterCat);
                })
                .filter((d) => !searchText || (d.title || '').toLowerCase().includes(searchText.toLowerCase()))
                .map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-indigo-50 rounded-lg text-indigo-600">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{doc.title || doc.name}</div>
                        <div className="text-xs text-gray-500">{doc.fileType || '文档'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{doc.businessName || doc.businessId}</div>
                    <div className="text-xs text-gray-500">{doc.scenarioName || doc.scenarioId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      doc.tempId ? 'bg-yellow-100 text-yellow-800' : (statusMap[doc.status || 'draft']?.color || 'bg-gray-100 text-gray-800')
                    }`}>
                      {doc.tempId ? '未同步' : (statusMap[doc.status || 'draft']?.text || (doc.status || '未知'))}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.updatedAt || doc.updateTime || ''}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5 mr-2">
                        <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min((doc.views || 0) / 50, 100)}%` }}></div>
                      </div>
                      <span className="text-xs">{doc.views || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-gray-700 hover:text-gray-900 mr-3" onClick={async () => {
                      const d = doc.tempId ? doc : await getDocument(doc.id);
                      setViewerDoc(d);
                    }}>查看</button>
                    {String((doc.source_type || doc.sourceType)) === 'douyin' ? (
                      <span className="text-xs text-gray-400">系统只读</span>
                    ) : (
                      <>
                        <button className="text-indigo-600 hover:text-indigo-900 mr-3" onClick={async () => {
                          const d = await getDocument(doc.id);
                          setEditingId(doc.id);
                          setFormTitle(d.title || '');
                          setFormBusinessId(String(d.businessId || ''));
                          setFormScenarioId(String(d.scenarioId || ''));
                          setFormContent(d.content || '');
                          setFormFile(null);
                          setShowModal(true);
                        }}><Edit3 className="w-4 h-4" /></button>
                        <button className="text-red-600 hover:text-red-900" onClick={async () => { if (doc.tempId) { removeLocalDocByTempId(doc.tempId); setDocs(mergeDocs(await getDocuments())); } else { await deleteDocument(doc.id); refreshDocs(); } }}><Trash2 className="w-4 h-4" /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 m-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">{editingId ? '编辑知识' : '新增知识'}</h3>
              <button onClick={() => { setShowModal(false); setEditingId(null); setFormTitle(''); setFormBusinessId(''); setFormScenarioId(''); setFormContent(''); setFormFile(null); }} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">知识标题</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="输入知识标题" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">一级业务</label>
                  <select value={formBusinessId} onChange={async (e) => { setFormBusinessId(e.target.value); setFormScenarioId(''); if (e.target.value) { const scs = await getScenariosByBusiness(e.target.value); setScenariosMap((prev) => ({ ...prev, [e.target.value]: scs || [] })); } }} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">请选择业务</option>
                    {businesses.map((b) => <option key={b.id} value={String(b.id)}>{b.name || b.title || b.label || b.id}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">二级场景</label>
                  <select value={formScenarioId} onChange={(e) => setFormScenarioId(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">请选择场景</option>
                    {(scenariosMap[formBusinessId] || []).map((s) => <option key={s.id} value={String(s.id)}>{s.name || s.title || s.label || s.id}</option>)}
                  </select>
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all">
                <div className="mx-auto h-12 w-12 text-gray-400 flex items-center justify-center">
                  <FileText className="w-8 h-8" />
                </div>
                <p className="mt-2 text-sm text-gray-600">点击上传 PDF, Word 或 Markdown 文件</p>
                <p className="text-xs text-gray-400 mt-1">支持拖拽上传</p>
                <input type="file" className="mt-3 w-full" onChange={(e) => setFormFile(e.target.files ? e.target.files[0] : null)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">或手动输入内容</label>
                <textarea value={formContent} onChange={(e) => setFormContent(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 h-24 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="在此输入知识详情..."></textarea>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">取消</button>
              <button onClick={async () => {
                const payload = { title: formTitle || (formFile ? formFile.name : ''), businessId: formBusinessId ? Number(formBusinessId) : undefined, scenarioId: formScenarioId ? Number(formScenarioId) : undefined, content: formContent, file: formFile || undefined };
                if (editingId) {
                  await updateDocument(editingId, payload);
                } else {
                  const tempId = 'local-' + Date.now();
                  addLocalDoc({ tempId, title: payload.title, businessId: payload.businessId, scenarioId: payload.scenarioId, status: 'draft', content: payload.content, fileName: formFile ? formFile.name : undefined });
                  setDocs(mergeDocs(await getDocuments()));
                  try {
                    const res = await createDocument(payload);
                    if (res && (res.id || res.data?.id)) {
                      replaceLocalDoc(tempId, res);
                    } else {
                      // 204 或返回无体：刷新后端列表，并移除本地条目
                      replaceLocalDoc(tempId, null);
                    }
                    setDocs(mergeDocs(await getDocuments()));
                  } catch (e) {
                    // 保留本地未同步项，用户可重试
                  }
                }
                setShowModal(false);
                setEditingId(null);
                setFormTitle('');
                setFormBusinessId('');
                setFormScenarioId('');
                setFormContent('');
                setFormFile(null);
              }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm">{editingId ? '保存' : '确认创建'}</button>
            </div>
          </div>
        </div>
      )}

      {viewerDoc && (
        <DocumentViewer doc={viewerDoc} onClose={() => setViewerDoc(null)} apiBase={process.env.REACT_APP_API_BASE} />
      )}
    </div>
  );
};

const SystemKnowledgeView = () => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewerDoc, setViewerDoc] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formFile, setFormFile] = useState(null);
  const [formSourceType, setFormSourceType] = useState('douyin');

  useEffect(() => {
    getDocuments()
      .then((list) => setDocs((list || []).filter((d) => (d.source_type || d.sourceType) === 'douyin')))
      .finally(() => setLoading(false));
  }, []);

  const refreshDocs = async () => {
    setLoading(true);
    const list = await getDocuments();
    setDocs((list || []).filter((d) => (d.source_type || d.sourceType) === 'douyin'));
    setLoading(false);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">系统知识库管理</h2>
          <p className="text-gray-500 text-sm mt-1">数据源自抖音电商官网，用户只读，管理员可同步更新</p>
        </div>
        <button
          onClick={async () => { await syncDouyinKnowledge(); refreshDocs(); }}
          className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <span>同步系统知识</span>
        </button>
        <button
          onClick={() => { setEditingId(null); setFormTitle(''); setFormContent(''); setFormFile(null); setFormSourceType('douyin'); setShowModal(true); }}
          className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <span>新增知识</span>
        </button>
      </header>

      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">标题</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">来源</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">更新时间</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(loading ? [] : docs).map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{doc.title || doc.name}</div>
                    <div className="text-xs text-gray-500">系统 • 只读</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.source_url || doc.url || ''}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.updated_at || doc.updatedAt || ''}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-gray-700 hover:text-gray-900 mr-3" onClick={async () => { const d = await getDocument(doc.id); setViewerDoc(d); }}>查看</button>
                    <button className="text-indigo-600 hover:text-indigo-900 mr-3" onClick={async () => {
                      const d = await getDocument(doc.id);
                      setEditingId(doc.id);
                      setFormTitle(d.title || '');
                      setFormContent(d.content || '');
                      setFormFile(null);
                      setFormSourceType(String(d.source_type || d.sourceType || 'douyin'));
                      setShowModal(true);
                    }}><Edit3 className="w-4 h-4" /></button>
                    <button className="text-red-600 hover:text-red-900" onClick={async () => { await deleteDocument(doc.id); refreshDocs(); }}><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 m-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">{editingId ? '编辑系统知识' : '新增系统知识'}</h3>
              <button onClick={() => { setShowModal(false); setEditingId(null); }} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">来源类型</label>
                <select value={formSourceType} onChange={(e) => setFormSourceType(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="douyin">douyin（系统）</option>
                  <option value="manual">manual（手动）</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">上传文件（可选）</label>
                <input type="file" className="mt-1 w-full" onChange={(e) => setFormFile(e.target.files ? e.target.files[0] : null)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">内容（可选）</label>
                <textarea value={formContent} onChange={(e) => setFormContent(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 h-24 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">取消</button>
              <button onClick={async () => {
                const payload = { title: formTitle, content: formContent, file: formFile || undefined, sourceType: formSourceType };
                if (editingId) {
                  await updateDocument(editingId, payload);
                } else {
                  await createDocument(payload);
                }
                setShowModal(false);
                setEditingId(null);
                setFormTitle('');
                setFormContent('');
                setFormFile(null);
                setFormSourceType('douyin');
                refreshDocs();
              }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm">{editingId ? '保存' : '确认创建'}</button>
            </div>
          </div>
        </div>
      )}

      {viewerDoc && (
        <DocumentViewer doc={viewerDoc} onClose={() => setViewerDoc(null)} apiBase={process.env.REACT_APP_API_BASE} />
      )}
    </div>
  );
};

const ChatBotView = () => {
  const [sessions, setSessions] = useState([]);
  const [currentId, setCurrentId] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [renamingId, setRenamingId] = useState('');
  const [renamingTitle, setRenamingTitle] = useState('');

  const mdToHtml = (text) => {
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const renderInline = (s) => s
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
    const parts = String(text || '').split(/```/);
    let out = '';
    for (let i = 0; i < parts.length; i++) {
      const segment = parts[i];
      if (i % 2 === 1) {
        out += `<pre class="rounded bg-gray-100 p-3 overflow-auto"><code>${esc(segment)}</code></pre>`;
      } else {
        const lines = segment.split(/\r?\n/);
        let inUL = false, inOL = false;
        const closeLists = () => { if (inUL) { out += '</ul>'; inUL = false; } if (inOL) { out += '</ol>'; inOL = false; } };
        for (let ln of lines) {
          if (/^#{1,6}\s/.test(ln)) {
            closeLists();
            const level = ln.match(/^#+/)[0].length;
            const txt = ln.replace(/^#{1,6}\s*/, '');
            out += `<h${level} class="text-gray-800 font-semibold">${renderInline(esc(txt))}</h${level}>`;
          } else if (/^\d+\.\s+/.test(ln)) {
            if (!inOL) { closeLists(); out += '<ol class="list-decimal ml-5">'; inOL = true; }
            const txt = ln.replace(/^\d+\.\s+/, '');
            out += `<li>${renderInline(esc(txt))}</li>`;
          } else if (/^[-*]\s+/.test(ln)) {
            if (!inUL) { closeLists(); out += '<ul class="list-disc ml-5">'; inUL = true; }
            const txt = ln.replace(/^[-*]\s+/, '');
            out += `<li>${renderInline(esc(txt))}</li>`;
          } else if (ln.trim() === '') {
            closeLists();
          } else {
            closeLists();
            out += `<p>${renderInline(esc(ln))}</p>`;
          }
        }
        closeLists();
      }
    }
    return out;
  };

  const normalizeMessage = (m) => {
    const role = m.role || m.type || m.sender || 'bot';
    return { id: m.id || Date.now(), type: role === 'user' ? 'user' : 'bot', content: m.content || m.text || '', timestamp: new Date(m.createdAt || Date.now()), sources: m.sources || [] };
  };

  useEffect(() => {
    getSessions().then((list) => {
      setSessions(list || []);
      const first = (list || [])[0];
      if (first && first.id) {
        setCurrentId(String(first.id));
        getSessionMessages(first.id).then((msgs) => setMessages((msgs || []).map(normalizeMessage)));
      } else {
        setMessages([{ id: 1, type: 'bot', content: '您好！我是商家智能助手。请开始新的对话。', timestamp: new Date(), sources: [] }]);
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const startNewSession = async () => {
    const res = await createSession({ title: '新对话' });
    const id = res?.id || res?.data?.id || String(Date.now());
    setSessions((prev) => [{ id, title: res?.title || '新对话' }, ...prev]);
    setCurrentId(String(id));
    setMessages([{ id: Date.now(), type: 'bot', content: '您好！我在，您可以开始提问。', timestamp: new Date() }]);
  };

  const loadSessionMessages = async (id) => {
    setCurrentId(String(id));
    const msgs = await getSessionMessages(id);
    setMessages((msgs || []).map(normalizeMessage));
  };

  const handleDeleteSession = async (id) => {
    await deleteSession(id);
    const next = sessions.find((s) => String(s.id) !== String(id));
    setSessions((prev) => prev.filter((s) => String(s.id) !== String(id)));
    if (String(currentId) === String(id)) {
      if (next) {
        loadSessionMessages(next.id);
      } else {
        setCurrentId('');
        setMessages([{ id: 1, type: 'bot', content: '您好！我是商家智能助手。请开始新的对话。', timestamp: new Date(), sources: [] }]);
      }
    }
  };

  const beginRename = (id, title) => {
    setRenamingId(String(id));
    setRenamingTitle(title || '');
  };

  const saveRename = async () => {
    if (!renamingId) return;
    const t = renamingTitle.trim() || '未命名对话';
    await updateSessionTitle(renamingId, t);
    setSessions((prev) => prev.map((s) => (String(s.id) === String(renamingId) ? { ...s, title: t } : s)));
    setRenamingId('');
    setRenamingTitle('');
  };

  const cancelRename = () => {
    setRenamingId('');
    setRenamingTitle('');
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    let sid = currentId;
    if (!sid) {
      const res = await createSession({ title: '新对话' });
      sid = res?.id || res?.data?.id || String(Date.now());
      setSessions((prev) => [{ id: sid, title: res?.title || '新对话' }, ...prev]);
      setCurrentId(String(sid));
    }
    const userMsg = { id: Date.now(), type: 'user', content: input, timestamp: new Date() };
    const botId = 'stream-' + Date.now();
    setMessages((prev) => [...prev, userMsg, { id: botId, type: 'bot', content: '', timestamp: new Date() }]);
    setInput('');
    setIsTyping(true);
    try {
      await sendMessageStream(sid, { content: userMsg.content }, {
        onChunk: (text) => {
          setMessages((prev) => prev.map((m) => (m.id === botId ? { ...m, content: (m.content || '') + text } : m)));
        },
        onDone: () => {
          setIsTyping(false);
        }
      });
    } catch (e) {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
      <div className="w-64 bg-gray-50 border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <button onClick={startNewSession} className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            <span>新对话</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="px-3 py-2 text-gray-400">加载中...</div>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className={`px-3 py-2 rounded-lg text-sm transition-colors ${String(s.id) === String(currentId) ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-gray-600 hover:bg-gray-100'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 truncate cursor-pointer" onClick={() => loadSessionMessages(s.id)}>
                    {String(renamingId) === String(s.id) ? (
                      <input
                        value={renamingTitle}
                        onChange={(e) => setRenamingTitle(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm"
                        placeholder="输入对话标题"
                      />
                    ) : (
                      <span className="truncate">{s.title || '未命名对话'}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {String(renamingId) === String(s.id) ? (
                      <>
                        <button onClick={saveRename} className="px-2 py-1 text-xs rounded bg-indigo-600 text-white">保存</button>
                        <button onClick={cancelRename} className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700">取消</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => beginRename(s.id, s.title)} className="p-1 rounded hover:bg-gray-200">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteSession(s.id)} className="p-1 rounded hover:bg-gray-200 text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full relative">
        <div className="h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-semibold text-gray-700">智能助手在线</span>
          </div>
          <button className="text-gray-400 hover:text-gray-600">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[80%] ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.type === 'user' ? 'bg-gradient-to-br from-indigo-600 to-indigo-500 shadow-md' : 'bg-gradient-to-br from-green-600 to-emerald-500 shadow-md'}`}>
                  {msg.type === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                </div>

                <div className="flex flex-col gap-1">
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.type === 'user'
                      ? 'bg-gradient-to-br from-indigo-600 to-indigo-500 text-white rounded-tr-none shadow-md ring-1 ring-indigo-500/20'
                      : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none shadow-sm ring-1 ring-gray-200'
                  }`}>
                    {msg.type === 'bot' ? (
                      <div dangerouslySetInnerHTML={{ __html: mdToHtml(msg.content) }} />
                    ) : (
                      msg.content
                    )}
                    {msg.type === 'bot' && msg.content === '' && isTyping && (
                      <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1 align-middle"></span>
                    )}
                  </div>

                  {msg.type === 'bot' && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 text-xs flex flex-wrap gap-2">
                      <span className="text-gray-400 py-1">参考来源:</span>
                      {msg.sources.map((src) => (
                        <div key={src.id} className="flex items-center bg-blue-50 text-blue-600 px-2 py-1 rounded cursor-pointer hover:bg-blue-100 transition-colors border border-blue-100">
                          <BookOpen className="w-3 h-3 mr-1" />
                          <span className="max-w-[150px] truncate">{src.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                  <div className="text-xs text-gray-400 px-1">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-gray-200">
          <div className="relative flex items-end gap-2 bg-white border border-gray-200 rounded-2xl p-3 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400 transition-all">
            <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors">
              <ImageIcon className="w-5 h-5" />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              ref={inputRef}
              placeholder="输入您的问题，Shift+Enter 换行"
              className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-40 min-h-[44px] py-2.5 text-base text-gray-800 placeholder-gray-400"
              rows={1}
            />
            <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Mic className="w-5 h-5" />
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className={`px-3.5 py-2 rounded-xl transition-colors flex-shrink-0 ${
                input.trim() && !isTyping ? 'bg-gradient-to-br from-indigo-600 to-indigo-500 text-white hover:from-indigo-600 hover:to-indigo-600 shadow-md' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <div className="text-center mt-2">
            <p className="text-xs text-gray-400">内容由 AI 生成，仅供参考，请以官方发布规则为准。</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const { user, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (user?.role === 'admin') setActiveTab('dashboard');
      else setActiveTab('knowledge');
    }
  }, [loading, user]);

  const NavItem = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        setSidebarOpen(false);
      }}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        activeTab === id
          ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-200'
          : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'
      }`}
    >
      <Icon className={`w-5 h-5 ${activeTab === id ? 'text-white' : 'text-current'}`} />
      <span className="font-medium">{label}</span>
      {activeTab === id && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen bg-[#f3f4f6] font-sans text-gray-900 overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 bg-white border-r border-gray-200 shadow-xl lg:shadow-none transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}
      >
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3 shadow-sm">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-600">商家智脑</h1>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <div className="text-xs font-semibold text-gray-400 px-4 mb-2 uppercase tracking-wider">核心功能</div>
          {user?.role === 'admin' ? (
            <>
              <NavItem id="dashboard" icon={LayoutDashboard} label="数据洞察" />
              <NavItem id="system-knowledge" icon={BookOpen} label="系统知识库管理" />
            </>
          ) : (
            <>
              <NavItem id="knowledge" icon={BookOpen} label="知识库管理" />
              <NavItem id="chat" icon={MessageSquare} label="智能问答" />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
              {(user?.name || user?.username || 'U').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name || user?.username || '已登录用户'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
            </div>
            <button onClick={logout} className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 border border-red-200">退出</button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="lg:hidden h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-600">
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold text-gray-800">
            {activeTab === 'dashboard' && '数据洞察'}
            {activeTab === 'knowledge' && '知识库'}
            {activeTab === 'chat' && '智能问答'}
          </span>
          <div className="w-8"></div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {activeTab === 'dashboard' && user?.role === 'admin' && <DashboardView />}
            {activeTab === 'system-knowledge' && user?.role === 'admin' && <SystemKnowledgeView />}
            {activeTab === 'knowledge' && user?.role !== 'admin' && <KnowledgeBaseView />}
            {activeTab === 'chat' && user?.role !== 'admin' && <ChatBotView />}
          </div>
        </div>
      </main>
    </div>
  );
}
