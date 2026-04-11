import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Link2 } from 'lucide-react';
import html2canvas from 'html2canvas';
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

export function Share({ playlistId, userName, playlistIntro, suggestedIntro, addedSongs, bgImage, isViewing, onGoBack, onToast }: ShareProps) {
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const shareUrl = `http://47.103.81.95/?playlist=${playlistId}`;

  const captureShareCard = async (): Promise<string> => {
    if (!shareCardRef.current) throw new Error('No card');
    const canvas = await html2canvas(shareCardRef.current, {
      useCORS: true,
      scale: 2,
      backgroundColor: '#18181b',
    });
    return canvas.toDataURL('image/jpeg', 0.7);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      onToast('链接已复制');
    } catch {
      onToast('复制失败，请手动复制');
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
        {/* Share Card */}
        <div
          ref={shareCardRef}
          className="w-full max-w-[340px] bg-zinc-900 border-[12px] border-white/10 rounded-[40px] overflow-hidden shadow-2xl relative flex flex-col shrink-0"
        >
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover' }} />

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
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareUrl)}`}
                alt="QR Code"
                className="w-full h-full"
              />
            </div>
          </div>
        </div>

        {/* Share Actions */}
        <div className="mt-8 w-full max-w-[340px] space-y-4 shrink-0">
          <div className="flex gap-4">
            <button
              onClick={async () => {
                try {
                  const url = await captureShareCard();
                  setImagePreviewUrl(url);
                } catch {
                  onToast('生成图片失败');
                }
              }}
              className="flex-1 flex flex-col items-center gap-2 p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"
            >
              <Download className="w-5 h-5" />
              <span className="text-[10px]">保存</span>
            </button>
            <button
              onClick={copyLink}
              className="flex-1 flex flex-col items-center gap-2 p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"
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
            <img src={imagePreviewUrl} alt="死亡歌单" className="max-w-full max-h-[70vh] rounded-2xl shadow-2xl" />
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
