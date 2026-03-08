import React, { useState } from 'react';
import { Download, Search, Loader2, Video, Music, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Format {
  itag: string;
  qualityLabel: string | null;
  container: string;
  hasVideo: boolean;
  hasAudio: boolean;
  contentLength: string | null;
  mimeType: string;
}

interface VideoInfo {
  title: string;
  thumbnail: string;
  author: string;
  lengthSeconds: string;
  formats: Format[];
}

export default function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);

  const formatDuration = (seconds: string) => {
    const s = parseInt(seconds, 10);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes: string | null) => {
    if (!bytes) return 'Unknown size';
    const b = parseInt(bytes, 10);
    if (b === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const fetchVideoInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setVideoInfo(null);

    try {
      const response = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch video info');
      }

      setVideoInfo(data);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (itag: string, container: string) => {
    if (!videoInfo) return;
    const title = encodeURIComponent(videoInfo.title);
    window.location.href = `/api/download?itag=${encodeURIComponent(itag)}&title=${title}&ext=${container}`;
  };

  // Group formats
  const videoFormats = videoInfo?.formats.filter(f => f.hasVideo) || [];
  const audioFormats = videoInfo?.formats.filter(f => !f.hasVideo && f.hasAudio) || [];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <main className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl mb-4">
              YouTube Downloader
            </h1>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              Download your favorite YouTube videos and audio in high quality. Fast, free, and secure.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl shadow-zinc-200/50 p-6 sm:p-8 mb-8 border border-zinc-100"
        >
          <form onSubmit={fetchVideoInfo} className="relative flex items-center">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-zinc-400" />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste YouTube URL here (e.g., https://www.youtube.com/watch?v=...)"
              className="block w-full pl-12 pr-32 py-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow text-lg"
              required
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="absolute right-2 top-2 bottom-2 px-6 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[120px]"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Fetch Video'
              )}
            </button>
          </form>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl flex items-start overflow-hidden"
              >
                <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {videoInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-xl shadow-zinc-200/50 overflow-hidden border border-zinc-100"
            >
              <div className="md:flex">
                <div className="md:w-2/5 relative">
                  <img
                    src={videoInfo.thumbnail}
                    alt={videoInfo.title}
                    className="w-full h-full object-cover aspect-video md:aspect-auto"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-3 right-3 bg-black/80 text-white text-xs font-medium px-2 py-1 rounded">
                    {formatDuration(videoInfo.lengthSeconds)}
                  </div>
                </div>
                <div className="p-6 md:w-3/5 flex flex-col justify-center">
                  <h2 className="text-2xl font-bold text-zinc-900 mb-2 line-clamp-2" title={videoInfo.title}>
                    {videoInfo.title}
                  </h2>
                  <p className="text-zinc-600 font-medium mb-6">
                    {videoInfo.author}
                  </p>
                </div>
              </div>

              <div className="border-t border-zinc-100 bg-zinc-50 p-6">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Video Formats */}
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center">
                      <Video className="h-5 w-5 mr-2 text-indigo-600" />
                      Video Downloads
                    </h3>
                    <div className="space-y-3">
                      {videoFormats.length > 0 ? (
                        videoFormats.map((format, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-zinc-200 hover:border-indigo-300 transition-colors">
                            <div className="flex flex-col">
                              <span className="font-medium text-zinc-900">
                                {format.qualityLabel || 'Unknown Quality'}
                              </span>
                              <span className="text-xs text-zinc-500 uppercase">
                                {format.container} • {format.hasAudio ? 'Video + Audio' : 'Video Only'} • {formatSize(format.contentLength)}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDownload(format.itag, format.container)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Download"
                            >
                              <Download className="h-5 w-5" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-zinc-500 italic">No video formats available.</p>
                      )}
                    </div>
                  </div>

                  {/* Audio Formats */}
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center">
                      <Music className="h-5 w-5 mr-2 text-indigo-600" />
                      Audio Only
                    </h3>
                    <div className="space-y-3">
                      {audioFormats.length > 0 ? (
                        audioFormats.map((format, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-zinc-200 hover:border-indigo-300 transition-colors">
                            <div className="flex flex-col">
                              <span className="font-medium text-zinc-900">
                                Audio
                              </span>
                              <span className="text-xs text-zinc-500 uppercase">
                                {format.container} • {formatSize(format.contentLength)}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDownload(format.itag, format.container)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Download"
                            >
                              <Download className="h-5 w-5" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-zinc-500 italic">No audio formats available.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
