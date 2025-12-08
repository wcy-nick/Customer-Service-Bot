import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { register as registerApi } from '../api/auth';
import { Bot, User as UserIcon, Lock, Mail } from 'lucide-react';

export default function LoginView() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      if (isRegister) {
        if (password !== confirmPwd) {
          setError('两次输入的密码不一致');
          return;
        }
        await registerApi({ username, password, email });
        setSuccessMsg('注册成功，请登录');
        setIsRegister(false);
      } else {
        await login(username, password);
      }
    } catch (err) {
      setError(isRegister ? '注册失败，请检查信息是否正确' : '登录失败，请检查账号或密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold">商家智脑</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">用户名</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="输入用户名"
              />
            </div>
          </div>
          {isRegister && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">邮箱</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="输入邮箱"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-600 mb-1">密码</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="输入密码"
              />
            </div>
          </div>
          {isRegister && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">确认密码</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="再次输入密码"
                />
              </div>
            </div>
          )}
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {successMsg && <div className="text-green-600 text-sm">{successMsg}</div>}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg text-white ${loading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'} transition-colors`}
          >
            {loading ? (isRegister ? '注册中...' : '登录中...') : (isRegister ? '注册' : '登录')}
          </button>
          <div className="text-center text-sm text-gray-600">
            {isRegister ? (
              <button type="button" onClick={() => setIsRegister(false)} className="text-indigo-600">已有账号？去登录</button>
            ) : (
              <button type="button" onClick={() => setIsRegister(true)} className="text-indigo-600">没有账号？注册</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
