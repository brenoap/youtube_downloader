import express from 'express';
import cors from 'cors';
import { Innertube, UniversalCache, Log } from 'youtubei.js';

Log.setLevel(Log.Level.NONE);
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  function extractVideoId(url: string) {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    return match ? match[1] : null;
  }

  let yt: Innertube | null = null;

  app.get('/api/info', async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ error: 'Missing YouTube URL' });
      }

      const videoId = extractVideoId(url);
      if (!videoId) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
      }

      if (!yt) {
        yt = await Innertube.create({ cache: new UniversalCache(false) });
      }

      const info = await yt.getInfo(videoId);

      if (info.playability_status?.status === 'LOGIN_REQUIRED') {
        return res.status(403).json({ error: 'YouTube requires login to access this video. It might be age-restricted or YouTube is blocking the request.' });
      }
      if (info.playability_status?.status === 'ERROR') {
        return res.status(400).json({ error: info.playability_status.reason || 'Video is unavailable' });
      }

      const formats: any[] = [];

      // Add video formats
      const videoFormats = info.streaming_data?.formats || [];
      const adaptiveFormats = info.streaming_data?.adaptive_formats || [];
      
      const allFormats = [...videoFormats, ...adaptiveFormats];

      allFormats.forEach((stream: any) => {
        if (!stream.url && !stream.signature_cipher) return;
        
        const isVideo = stream.has_video;
        const isAudio = stream.has_audio;
        
        if (!isVideo && !isAudio) return;

        formats.push({
          itag: stream.itag.toString(),
          qualityLabel: stream.quality_label || 'Audio',
          container: stream.mime_type.split(';')[0].split('/')[1] || 'mp4',
          hasVideo: isVideo,
          hasAudio: isAudio,
          contentLength: stream.content_length?.toString() || null,
          mimeType: stream.mime_type.split(';')[0]
        });
      });

      // Deduplicate formats by itag
      const uniqueFormats = Array.from(new Map(formats.map(item => [item.itag, item])).values());

      res.json({
        title: info.basic_info.title,
        thumbnail: info.basic_info.thumbnail?.[0]?.url || '',
        author: info.basic_info.author,
        lengthSeconds: info.basic_info.duration?.toString() || '0',
        formats: uniqueFormats
      });
    } catch (error: any) {
      console.error('Error fetching video info:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch video info' });
    }
  });

  app.get('/api/download', async (req, res) => {
    try {
      const url = req.query.url as string;
      const itag = req.query.itag as string;
      const title = (req.query.title as string || 'video').replace(/[^\w\s]/gi, '');
      const ext = req.query.ext as string || 'mp4';

      if (!url || !itag) {
        return res.status(400).json({ error: 'Missing URL or itag' });
      }

      const videoId = extractVideoId(url);
      if (!videoId) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
      }

      if (!yt) {
        yt = await Innertube.create({ cache: new UniversalCache(false) });
      }

      res.header('Content-Disposition', `attachment; filename="${title}.${ext}"`);
      
      const stream = await yt.download(videoId, {
        type: 'video+audio',
        quality: 'best',
        format: ext as any,
        client: 'ANDROID'
      });

      // The stream is a ReadableStream
      // @ts-ignore
      const { Readable } = await import('stream');
      const nodeStream = Readable.fromWeb(stream as any);
      nodeStream.pipe(res);

    } catch (error: any) {
      console.error('Error downloading video:', error);
      res.status(500).json({ error: error.message || 'Failed to download video' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
