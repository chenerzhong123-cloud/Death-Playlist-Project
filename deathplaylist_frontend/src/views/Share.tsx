import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Link2, User } from 'lucide-react';
import { API_BASE } from '../lib/api';
import type { Song } from '../lib/api';

interface ShareProps {
  playlistId: string;
  userName: string;
  playlistIntro: string;
  suggestedIntro: string;
  addedSongs: Song[];
  bgImage: string;
  isViewing?: boolean;
  onGoBack: () => void;
  onToast: (msg: string) => void;
}

const proxyUrl = (url: string) =>
  `${API_BASE}/utils/image-proxy?url=${encodeURIComponent(url)}`;

const loadImg = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/** Draw the share card using Canvas 2D API */
async function drawShareCard(opts: {
  userName: string;
  intro: string;
  songs: Song[];
  bgImage: string;
  qrSrc: string;
}): Promise<string> {
  const W = 680;
  const PAD = 48;
  const CARD_R = 48;

  // Measure canvas for text wrapping
  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d')!;

  const songRowH = 64;
  const gapBetweenSongs = 12;
  const songsBlockH = opts.songs.length * songRowH + (opts.songs.length - 1) * gapBetweenSongs;

  const titleY = PAD + 80;
  const introY = titleY + 50;
  const songsStartY = introY + 60;

  // Intro text wrapping to compute actual height
  const introText = opts.intro || '';
  const maxIntroW = W - PAD * 2 - 40;
  const introLines = wrapText(measureCtx, introText, maxIntroW, 'italic 20px system-ui, -apple-system, sans-serif');
  const introBlockH = Math.min(introLines.length, 3) * 28;
  const actualSongsStartY = Math.max(songsStartY, introY + introBlockH + 20);

  const songsEndY = actualSongsStartY + songsBlockH;
  const footerY = songsEndY + 40;
  const H = footerY + 120;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, CARD_R);
  ctx.fill();

  // Semi-transparent bg image
  try {
    const bgImg = await loadImg(proxyUrl(opts.bgImage));
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, CARD_R);
    ctx.clip();
    const scale = Math.max(W / bgImg.width, H / bgImg.height);
    const dw = bgImg.width * scale;
    const dh = bgImg.height * scale;
    ctx.drawImage(bgImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
    ctx.restore();
  } catch {}

  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.roundRect(6, 6, W - 12, H - 12, CARD_R - 4);
  ctx.stroke();

  // Title: "{userName}的死亡歌单"
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${opts.userName}的死亡歌单`, W / 2, titleY);

  // Intro
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = 'italic 20px system-ui, -apple-system, sans-serif';
  let curY = introY;
  for (const line of introLines.slice(0, 3)) {
    ctx.fillText(line, W / 2, curY);
    curY += 28;
  }

  // Songs
  ctx.textAlign = 'left';
  for (let i = 0; i < opts.songs.length; i++) {
    const song = opts.songs[i];
    const y = actualSongsStartY + i * (songRowH + gapBetweenSongs);

    // Index
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '16px monospace';
    ctx.fillText(String(i + 1).padStart(2, '0'), PAD, y + 30);

    // Album art
    try {
      const artImg = await loadImg(proxyUrl(song.albumArt));
      ctx.drawImage(artImg, PAD + 40, y + 4, 56, 56);
    } catch {}

    const textX = PAD + 112;
    const titleMaxW = W - textX - PAD - 20;

    // Song title
    ctx.fillStyle = '#ffffff';
    ctx.font = '22px system-ui, -apple-system, sans-serif';
    ctx.fillText(truncateText(ctx, song.title, titleMaxW), textX, y + 26);

    // Song artist
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '18px system-ui, -apple-system, sans-serif';
    ctx.fillText(truncateText(ctx, song.artist, titleMaxW), textX, y + 50);

    // Separator
    if (i < opts.songs.length - 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(PAD, y + songRowH + gapBetweenSongs / 2 - 0.5, W - PAD * 2, 1);
    }
  }

  // Footer
  const actualFooterY = actualSongsStartY + opts.songs.length * (songRowH + gapBetweenSongs) + 20;
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(PAD, actualFooterY, W - PAD * 2, 1);

  const footerTextY = actualFooterY + 36;
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('死 亡 歌 单', PAD + 16, footerTextY);

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.font = 'italic 12px system-ui, -apple-system, sans-serif';
  ctx.fillText('扫码查看完整歌单', PAD + 16, footerTextY + 22);

  // QR code
  try {
    const qrImg = await loadImg(opts.qrSrc);
    const qrSize = 96;
    const qrX = W - PAD - qrSize - 8;
    const qrY = actualFooterY + 8;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 16);
    ctx.fill();
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  } catch {}

  return canvas.toDataURL('image/jpeg', 0.85);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, font: string): string[] {
  ctx.font = font;
  const lines: string[] = [];
  let current = '';
  for (const char of text) {
    const test = current + char;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = char;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

export function Share({ playlistId, userName, playlistIntro, suggestedIntro, addedSongs, bgImage, isViewing, onGoBack, onToast }: ShareProps) {
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const shareUrl = `http://47.103.81.95/?playlist=${playlistId}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareUrl)}`;

  const saveImage = async () => {
    try {
      const dataUrl = await drawShareCard({
        userName,
        intro: playlistIntro || suggestedIntro,
        songs: addedSongs,
        bgImage,
        qrSrc,
      });
      // Single download via blob to avoid duplicate triggers
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = '死亡歌单.jpg';
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      setImagePreviewUrl(dataUrl);
    } catch (e) {
      console.error('Save image failed:', e);
      onToast('生成图片失败');
    }
  };

  const copyLink = async () => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        onToast('链接已复制');
        return;
      } catch {}
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      onToast('链接已复制');
    } catch {
      onToast('复制失败');
    }
  };

  return (
    <>
      <motion.main
        key="share"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="relative z-10 flex flex-col items-center h-screen max-w-2xl mx-auto bg-black/90 backdrop-blur-3xl overflow-y-auto pt-12 pb-24 px-6"
      >
        {/* Share Card — visual only, canvas draws independently */}
        <div
          className="w-full max-w-[340px] bg-zinc-900 border-[12px] border-white/10 rounded-[40px] overflow-hidden shadow-2xl relative flex flex-col shrink-0 select-none"
          style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
        >
          <div
            data-bg
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover' }}
          />

          <div className="relative p-8 flex flex-col space-y-6">
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold italic serif">{userName}的死亡歌单</h2>
              <p className="text-xs text-white/70 italic px-4 leading-relaxed">{playlistIntro || suggestedIntro}</p>
            </div>

            <div className="space-y-1">
              {addedSongs.map((song, idx) => (
                <div key={`share-${song.id}`} className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
                  <div className="text-[10px] font-mono text-white/20 w-4 shrink-0">{String(idx + 1).padStart(2, '0')}</div>
                  <img
                    src={song.albumArt}
                    alt={song.title}
                    className="w-8 h-8 rounded-md object-cover bg-zinc-800 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{song.title}</div>
                    <div className="text-[10px] text-white/40 truncate">{song.artist}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative bg-white/5 p-6 border-t border-white/10 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">死亡歌单</div>
              <div className="text-[8px] text-white/20 italic">扫码查看完整歌单</div>
            </div>
            <div className="w-16 h-16 bg-white p-1 rounded-xl shadow-lg shrink-0">
              <img src={qrSrc} alt="QR Code" className="w-full h-full" />
            </div>
          </div>
        </div>

        {/* Share Actions */}
        <div className="mt-8 w-full max-w-[340px] space-y-4 shrink-0">
          <div className="flex gap-4">
            <button
              onClick={saveImage}
              className="flex-1 flex flex-col items-center gap-2 p-3 bg-white/5 rounded-2xl hover:bg-white/10 active:bg-white/15 transition-colors"
            >
              <Download className="w-5 h-5" />
              <span className="text-[10px]">保存</span>
            </button>
            <button
              onClick={copyLink}
              className="flex-1 flex flex-col items-center gap-2 p-3 bg-white/5 rounded-2xl hover:bg-white/10 active:bg-white/15 transition-colors"
            >
              <Link2 className="w-5 h-5" />
              <span className="text-[10px]">复制链接</span>
            </button>
          </div>
          <button
            onClick={onGoBack}
            className="w-full py-2 text-white/40 hover:text-white transition-colors text-xs"
          >
            {isViewing ? '返回首页' : '返回预览'}
          </button>
        </div>
      </motion.main>

      {/* Image Preview Overlay */}
      <AnimatePresence>
        {imagePreviewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-6"
          >
            <img
              src={imagePreviewUrl}
              alt="死亡歌单"
              className="max-w-full max-h-[70vh] rounded-2xl shadow-2xl"
              style={{ WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'default' }}
            />
            <p className="mt-4 text-white/50 text-sm">长按图片保存到相册</p>
            <button
              onClick={() => setImagePreviewUrl(null)}
              className="mt-3 text-white/30 text-xs underline underline-offset-4"
            >
              关闭
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
