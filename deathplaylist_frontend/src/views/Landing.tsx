import { motion } from 'motion/react';
import { Users } from 'lucide-react';

interface LandingProps {
  hasPlaylist: boolean;
  onNewPlaylist: () => void;
  onFriends: () => void;
}

export function Landing({ hasPlaylist, onNewPlaylist, onFriends }: LandingProps) {
  return (
    <motion.main
      key="landing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -20 }}
      className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center max-w-lg mx-auto overflow-hidden"
    >
      {/* Light beam effect — ported from miniprogram */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: [
            'radial-gradient(ellipse at 95% 2%, rgba(255,255,255,0.25) 0%, transparent 27%)',
            `conic-gradient(
              from 180deg at 100% 0%,
              transparent 0deg,
              rgba(255,255,255,0.02) 8deg,
              rgba(255,255,255,0.08) 16deg,
              rgba(255,255,255,0.16) 21deg,
              rgba(255,255,255,0.2) 26deg,
              rgba(255,255,255,0.22) 30deg,
              rgba(255,255,255,0.2) 34deg,
              rgba(255,255,255,0.16) 39deg,
              rgba(255,255,255,0.08) 46deg,
              rgba(255,255,255,0.02) 52deg,
              transparent 57deg
            )`,
          ].join(', '),
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 space-y-8"
      >
        <div className="space-y-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="flex justify-center mb-4"
          >
            <img
              src="/logo.png"
              alt="死亡歌单"
              className="w-24 h-24 rounded-full border border-white/20"
            />
          </motion.div>

          <h1 className="text-5xl font-bold tracking-tighter sm:text-6xl italic serif">
            死亡歌单
          </h1>

          <p className="text-lg text-white/60 font-light leading-relaxed max-w-xs mx-auto">
            哀乐和唢呐太千篇一律？
            <br />
            来定义自己生命的最后乐章
          </p>
        </div>

        <div className="flex flex-col gap-4 w-full pt-8">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNewPlaylist}
            className="flex items-center justify-center gap-3 bg-white text-black py-4 px-8 rounded-2xl font-semibold text-lg transition-colors hover:bg-white/90"
          >
            {hasPlaylist ? '我的歌单' : '新的歌单'}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onFriends}
            className="flex items-center justify-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 text-white py-4 px-8 rounded-2xl font-semibold text-lg transition-colors hover:bg-white/20"
          >
            <Users className="w-5 h-5" />
            看朋友们的歌单
          </motion.button>
        </div>
      </motion.div>
    </motion.main>
  );
}
