import React, { useState, useEffect } from 'react';
import API from './api/axios';
import { 
  Play, 
  RefreshCw, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Video, 
  ExternalLink,
  Layers,
  Sparkles,
  Lock,
  Mail,
  X
} from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('accessToken'));
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [duration, setDuration] = useState(15);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [selectedVideos, setSelectedVideos] = useState(null);

  useEffect(() => {
    if (token) fetchHistory();
  }, [token]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setMsg({ text: '', type: '' });
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const res = await API.post(endpoint, { email, password });
      if (!isRegister) {
        localStorage.setItem('accessToken', res.data.data.accessToken);
        localStorage.setItem('refreshToken', res.data.data.refreshToken);
        setToken(res.data.data.accessToken);
      } else {
        setMsg({ text: 'Registrasi berhasil! Silakan login.', type: 'success' });
        setIsRegister(false);
      }
    } catch (err) {
      setMsg({ 
        text: err.response?.data?.message || 'Terjadi kesalahan pada autentikasi', 
        type: 'error' 
      });
    }
  };

  const handleLogout = async () => {
    try {
      await API.post('/auth/logout');
    } catch (e) {}
    localStorage.clear();
    setToken(null);
  };

  const submitJob = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });
    try {
      await API.post('/jobs', { duration });
      setMsg({ text: 'Job baru berhasil ditambahkan ke Redis Queue!', type: 'success' });
      fetchHistory();
    } catch (err) {
      setMsg({ text: 'Gagal mengirim job ke queue', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setRefreshing(true);
    try {
      const res = await API.get('/jobs/history');
      setJobs(res.data.data.jobs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  // Helper metrics
  const totalJobs = jobs.length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const processingJobs = jobs.filter(j => j.status === 'processing' || j.status === 'pending').length;
  const totalVideos = jobs.reduce((acc, j) => acc + (j.video_data?.length || 0), 0);

  // --- VIEW: LOGIN / REGISTER ---
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 backdrop-blur-xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 mb-4 border border-indigo-500/30">
              <Sparkles className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {isRegister ? 'Buat Akun Baru' : 'Selamat Datang Kembali'}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Sistem Otomasi Data YouTube Shorts
            </p>
          </div>

          {msg.text && (
            <div className={`p-4 rounded-xl mb-6 text-sm flex items-center gap-3 ${
              msg.type === 'error' 
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' 
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            }`}>
              {msg.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
              <span>{msg.text}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Email</label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="email" 
                  required 
                  placeholder="nama@email.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="password" 
                  required 
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20 mt-2">
              {isRegister ? 'Daftar Akun' : 'Masuk ke Dashboard'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => { setIsRegister(!isRegister); setMsg({ text: '', type: '' }); }}
              className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              {isRegister ? 'Sudah punya akun? Login di sini' : 'Belum punya akun? Registrasi gratis'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW: DASHBOARD MAIN ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      {/* Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-white tracking-tight leading-none">Automation Data</h1>
              <span className="text-xs text-slate-400">YouTube Shorts Scraper</span>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-800 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 text-slate-400 text-sm font-medium transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* Metric Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Job</p>
              <p className="text-2xl font-bold text-white mt-0.5">{totalJobs}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Selesai</p>
              <p className="text-2xl font-bold text-white mt-0.5">{completedJobs}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Proses / Antrean</p>
              <p className="text-2xl font-bold text-white mt-0.5">{processingJobs}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Video Terkumpul</p>
              <p className="text-2xl font-bold text-white mt-0.5">{totalVideos}</p>
            </div>
          </div>
        </div>

        {/* Submit New Automation Request */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Play className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Jalankan Otomasi Baru</h2>
              <p className="text-xs text-slate-400">Tentukan durasi (detik) untuk bot melakukan scrolling dan mengumpulkan data video</p>
            </div>
          </div>

          {msg.text && (
            <div className={`p-4 rounded-xl mb-6 text-sm flex items-center gap-3 ${
              msg.type === 'error' 
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' 
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            }`}>
              {msg.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
              <span>{msg.text}</span>
            </div>
          )}

          <form onSubmit={submitJob} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Pilih Durasi Cepat</label>
              <div className="flex flex-wrap gap-2 mb-4">
                {[15, 30, 60, 120].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDuration(s)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                      Number(duration) === s
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {s} Detik
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input 
                  type="number" 
                  min="5" 
                  max="300"
                  required
                  value={duration} 
                  onChange={e => setDuration(e.target.value)}
                  placeholder="Atur durasi kustom (detik)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <button 
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 shrink-0"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                <span>{loading ? 'Mengirim...' : 'Mulai Otomasi'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Job History Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Riwayat Eksekusi Job</h2>
              <p className="text-xs text-slate-400">Daftar permintaan scraping dan hasilnya</p>
            </div>
            <button 
              onClick={fetchHistory}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-300 text-xs font-medium transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-6">Job ID</th>
                  <th className="py-4 px-6">Durasi Minta</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Durasi Aktual</th>
                  <th className="py-4 px-6">Hasil Scraping</th>
                  <th className="py-4 px-6">Waktu Dibuat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-slate-500">
                      Belum ada data job. Mulai otomatisasi pertama kamu di atas.
                    </td>
                  </tr>
                ) : (
                  jobs.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6 font-mono font-medium text-indigo-400">#{j.id}</td>
                      <td className="py-4 px-6 text-slate-300">{j.duration} detik</td>
                      <td className="py-4 px-6">
                        <StatusBadge status={j.status} />
                      </td>
                      <td className="py-4 px-6 text-slate-400">
                        {j.actual_duration ? `${j.actual_duration}s` : '-'}
                      </td>
                      <td className="py-4 px-6">
                        {j.video_data && j.video_data.length > 0 ? (
                          <button
                            onClick={() => setSelectedVideos(j.video_data)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 text-xs font-medium transition-all"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Lihat {j.video_data.length} Video</span>
                          </button>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-400 text-xs">
                        {new Date(j.created_at).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Modal Video Results */}
      {selectedVideos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Daftar Video Hasil Scraping</h3>
                  <p className="text-xs text-slate-400">Ditemukan {selectedVideos.length} video</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedVideos(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3">
              {selectedVideos.map((v, idx) => (
                <div key={idx} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-start justify-between gap-4 hover:border-slate-700 transition-colors">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-slate-100 text-sm line-clamp-2">{v.title}</h4>
                    <p className="text-xs text-indigo-400 font-medium">{v.channel}</p>
                    <p className="text-[10px] text-slate-500">Discrape pada: {v.scraped_at}</p>
                  </div>
                  <a 
                    href={v.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 rounded-lg shrink-0 transition-colors"
                    title="Buka di YouTube"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
              <button 
                onClick={() => setSelectedVideos(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Sub-komponen Badge Status
function StatusBadge({ status }) {
  switch (status) {
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          COMPLETED
        </span>
      );
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          PROCESSING
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
          FAILED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
          PENDING
        </span>
      );
  }
}