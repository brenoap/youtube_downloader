import express from 'express';
import cors from 'cors';
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

  // Use a public Piped API instance to bypass YouTube's IP blocks
  const PIPED_API_URL = 'https://pipedapi.kavin.rocks';

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

      const response = await fetch(`${PIPED_API_URL}/streams/${videoId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch video info from Piped API');
      }

      const info = await response.json();

      const formats: any[] = [];

      // Add video streams
      if (info.videoStreams) {
        info.videoStreams.forEach((stream: any) => {
          formats.push({
            itag: stream.url, // Use URL as the identifier for downloading
            qualityLabel: stream.quality,
            container: stream.format.toLowerCase(),
            hasVideo: true,
            hasAudio: !stream.videoOnly,
            contentLength: stream.contentLength?.toString() || null,
            mimeType: stream.mimeType
          });
        });
      }

      // Add audio streams
      if (info.audioStreams) {
        info.audioStreams.forEach((stream: any) => {
          formats.push({
            itag: stream.url,
            qualityLabel: 'Audio',
            container: stream.format.toLowerCase(),
            hasVideo: false,
            hasAudio: true,
            contentLength: stream.contentLength?.toString() || null,
            mimeType: stream.mimeType
          });
        });
      }

      res.json({
        title: info.title,
        thumbnail: info.thumbnailUrl,
        author: info.uploader,
        lengthSeconds: info.duration?.toString() || '0',
        formats
      });
    } catch (error: any) {
      console.error('Error fetching video info:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch video info' });
    }
  });

  app.get('/api/download', async (req, res) => {
    try {
      const streamUrl = req.query.itag as string; // We passed the URL as itag
      const title = (req.query.title as string || 'video').replace(/[^\w\s]/gi, '');
      const ext = req.query.ext as string || 'mp4';

      if (!streamUrl) {
        return res.status(400).json({ error: 'Missing stream URL' });
      }

      res.header('Content-Disposition', `attachment; filename="${title}.${ext}"`);
      
      // Proxy the stream from Piped to the client
      const response = await fetch(streamUrl);
      
      if (!response.ok || !response.body) {
        throw new Error('Failed to fetch stream from Piped API');
      }

      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.header('Content-Type', contentType);
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        res.header('Content-Length', contentLength);
      }

      // @ts-ignore - Node.js fetch body is a ReadableStream which can be piped in newer Node versions,
      // but to be safe we can use stream.Readable.fromWeb
      const { Readable } = await import('stream');
      const nodeStream = Readable.fromWeb(response.body as any);
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
