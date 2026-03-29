/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Plus, Users, Heart, Music2, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [bgImage, setBgImage] = useState('https://images.unsplash.com/photo-1514525253361-bee8718a340b?auto=format&fit=crop&q=80&w=1920');
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20 overflow-hidden relative">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 transition-all duration-1000 ease-in-out"
        style={{ 
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black" />
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="space-y-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-4"
            >
              <Music2 className="w-8 h-8 text-white/80" />
            </motion.div>
            
            <h1 className="text-5xl font-bold tracking-tighter sm:text-6xl italic serif">
              死亡歌单
            </h1>
            
            <p className="text-lg text-white/70 font-light leading-relaxed max-w-xs mx-auto">
              不想自己的葬礼还在吹唢呐放哀乐？
              <br />
              选择你的葬礼上播放的音乐吧
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 w-full pt-8">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-3 bg-white text-black py-4 px-8 rounded-2xl font-semibold text-lg transition-colors hover:bg-white/90"
            >
              <Plus className="w-5 h-5" />
              + 新的歌单
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 text-white py-4 px-8 rounded-2xl font-semibold text-lg transition-colors hover:bg-white/20"
            >
              <Users className="w-5 h-5" />
              看朋友们的歌单
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-3 bg-transparent border border-white/30 text-white/80 py-4 px-8 rounded-2xl font-medium text-lg transition-colors hover:bg-white/10"
            >
              <Heart className="w-5 h-5" />
              点赞投币
            </motion.button>
          </div>
        </motion.div>

        {/* Footer / Settings Toggle */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 text-white/40 hover:text-white/80 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </main>

      {/* Settings Modal (Simplified for Background Config) */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 p-8 rounded-3xl w-full max-w-md space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">配置背景图</h2>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="text-white/40 hover:text-white"
                >
                  关闭
                </button>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-white/60">图片 URL</label>
                <input 
                  type="text" 
                  value={bgImage}
                  onChange={(e) => setBgImage(e.target.value)}
                  placeholder="输入图片链接..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-white/40 transition-colors"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  'https://images.unsplash.com/photo-1514525253361-bee8718a340b?auto=format&fit=crop&q=80&w=400',
                  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=400',
                  'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?auto=format&fit=crop&q=80&w=400',
                ].map((url) => (
                  <button 
                    key={url}
                    onClick={() => setBgImage(url)}
                    className="aspect-video rounded-lg overflow-hidden border border-white/10 hover:border-white/40 transition-all"
                  >
                    <img src={url} alt="preset" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setShowSettings(false)}
                className="w-full bg-white text-black py-3 rounded-xl font-semibold"
              >
                保存配置
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
