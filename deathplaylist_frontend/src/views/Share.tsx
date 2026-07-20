import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Link2 } from 'lucide-react';
import { API_BASE } from '../lib/api';
import type { Song } from '../lib/api';
import { analytics } from '../lib/analytics';

interface ShareProps {
  playlistId: string;
  userName: string;
  playlistIntro: string;
  suggestedIntro: string;
  addedSongs: Song[];
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

/** Draw share card — matches miniprogram share.js style exactly */
async function drawShareCard(opts: {
  userName: string;
  intro: string;
  songs: Song[];
  qrSrc: string;
}): Promise<string> {
  // Dimensions match miniprogram (logical px, scale 2x for retina)
  const W = 340;
  const pad = 16;
  const artSize = 44;
  const songItemH = 54;
  const songListH = opts.songs.length * songItemH;
  const footerH = 60;
  const titleY = pad + 18;
  const introY = titleY + 22;
  const songStartY = introY + 16;
  const H = songStartY + songListH + 16 + footerH + pad;

  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // Background — plain black
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(opts.userName + '的死亡歌单', W / 2, titleY);

  // Intro
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = 'italic 12px sans-serif';
  const intro = opts.intro || '暂无简介';
  ctx.fillText(intro.length > 24 ? intro.slice(0, 24) + '...' : intro, W / 2, introY);

  // Load album art images
  const artX = pad;
  const images = await Promise.all(opts.songs.map((song) => {
    return new Promise<HTMLImageElement | null>((resolve) => {
      if (!song.albumArt) { resolve(null); return; }
      let settled = false;
      loadImg(proxyUrl(song.albumArt))
        .then((img) => { if (!settled) { settled = true; resolve(img); } })
        .catch(() => { if (!settled) { settled = true; resolve(null); } });
      setTimeout(() => { if (!settled) { settled = true; resolve(null); } }, 5000);
    });
  }));

  // Load QR code image
  let qrImg: HTMLImageElement | null = null;
  try {
    qrImg = await loadImg(opts.qrSrc);
  } catch {}

  // Songs
  ctx.textAlign = 'left';
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e'];
  const textX = pad + artSize + 12;
  const maxTextW = W - pad - textX;

  opts.songs.forEach((song, i) => {
    const y = songStartY + i * songItemH + songItemH / 2;
    const artY = y - artSize / 2;

    // Album art with rounded corners
    if (images[i]) {
      ctx.save();
      roundRect(ctx, artX, artY, artSize, artSize, 7);
      ctx.clip();
      ctx.drawImage(images[i], artX, artY, artSize, artSize);
      ctx.restore();
    } else {
      ctx.fillStyle = colors[i % colors.length] + '40';
      roundRect(ctx, artX, artY, artSize, artSize, 7);
      ctx.fill();
    }

    // Song title
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 15px sans-serif';
    ctx.fillText(truncateText(ctx, song.title, maxTextW), textX, y - 4);

    // Artist
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '12px sans-serif';
    ctx.fillText(truncateText(ctx, song.artist, maxTextW), textX, y + 12);
  });

  // Divider
  const dividerY = songStartY + songListH + 8;
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, dividerY);
  ctx.lineTo(W - pad, dividerY);
  ctx.stroke();

  // Footer
  const footerY = dividerY + 12;

  // QR code on the right
  const qrSize = 44;
  const qrX = W - pad - qrSize;
  const qrY = footerY;

  if (qrImg) {
    ctx.save();
    roundRect(ctx, qrX, qrY, qrSize, qrSize, 4);
    ctx.clip();
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    ctx.restore();
  }

  // Footer text on the left
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.textAlign = 'left';
  ctx.fillText('死亡歌单', pad, footerY + 14);

  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = 'italic 8px sans-serif';
  ctx.fillText('定义自己生命的最后乐章', pad, footerY + 28);

  return canvas.toDataURL('image/jpeg', 0.9);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + '...').width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '...';
}

export function Share({ playlistId, userName, playlistIntro, suggestedIntro, addedSongs, isViewing, onGoBack, onToast }: ShareProps) {
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const shareUrl = `https://www.deuce.monster/deathplaylist/?playlist=${playlistId}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareUrl)}`;

  const saveImage = async () => {
    try {
      const dataUrl = await drawShareCard({
        userName,
        intro: playlistIntro || suggestedIntro,
        songs: addedSongs,
        qrSrc,
      });
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
      analytics.playlistShared('save_image');
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
        analytics.playlistShared('copy_link');
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
      analytics.playlistShared('copy_link');
      onToast('链接已复制');
    } catch {
      onToast('复制失败');
    }
  };

  // Intro text for display (truncate like miniprogram)
  const displayIntro = (playlistIntro || suggestedIntro || '暂无简介');
  const truncatedIntro = displayIntro.length > 24 ? displayIntro.slice(0, 24) + '...' : displayIntro;

  return (
    <>
      <motion.main
        key="share"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="relative z-10 flex flex-col items-center h-screen max-w-lg mx-auto bg-black overflow-y-auto pt-6 pb-24 px-4"
      >
        {/* Share Card — visual preview matching miniprogram style */}
        <div
          className="w-full max-w-[340px] bg-black rounded-3xl overflow-hidden shadow-2xl border-2 border-white/15 shrink-0 select-none"
          style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
        >
          <div className="p-4 pt-4 flex flex-col items-center">
            {/* Title */}
            <h2 className="text-[15px] font-bold">{userName}的死亡歌单</h2>
            {/* Intro */}
            <p className="text-[12px] text-white/60 italic mt-1.5">{truncatedIntro}</p>
          </div>

          {/* Songs */}
          <div className="px-4 space-y-0">
            {addedSongs.map((song, idx) => {
              const y = 27 + idx * 54;
              return (
                <div key={`share-${song.id}`} className="flex items-center" style={{ height: 54 }}>
                  <img
                    src={song.albumArt}
                    alt={song.title}
                    className="w-[44px] h-[44px] rounded-lg object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0 ml-3">
                    <div className="text-[15px] font-semibold truncate">{song.title}</div>
                    <div className="text-[12px] text-white/60 truncate">{song.artist}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-white/60">死亡歌单</div>
              <div className="text-[8px] text-white/30 italic">定义自己生命的最后乐章</div>
            </div>
            <div className="w-11 h-11 rounded overflow-hidden shrink-0">
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
            className="w-full py-2 text-white/60 hover:text-white transition-colors text-xs"
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
              className="max-w-full max-h-[70vh] rounded-3xl shadow-2xl"
              style={{ WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'default' }}
            />
            <p className="mt-4 text-white/60 text-sm">长按图片保存到相册</p>
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
