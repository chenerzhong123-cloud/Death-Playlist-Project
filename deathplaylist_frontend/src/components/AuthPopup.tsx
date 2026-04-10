import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle } from 'lucide-react';

interface AuthPopupProps {
  show: boolean;
  nickname: string;
  onNicknameChange: (v: string) => void;
  onLogin: () => void;
  onClose: () => void;
}

export function AuthPopup({ show, nickname, onNicknameChange, onLogin, onClose }: AuthPopupProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-zinc-900 border border-white/10 p-8 rounded-[32px] w-full max-w-xs text-center space-y-6 shadow-2xl"
          >
            <div className="w-16 h-16 bg-[#07C160] rounded-full flex items-center justify-center mx-auto mb-2">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">设置昵称</h3>
              <p className="text-sm text-white/60">输入你的昵称开始使用</p>
            </div>
            <input
              type="text"
              value={nickname}
              onChange={(e) => onNicknameChange(e.target.value)}
              placeholder="输入昵称"
              maxLength={15}
              className="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 text-center text-sm outline-none focus:border-white/40 placeholder:text-white/30"
              onKeyDown={(e) => e.key === 'Enter' && onLogin()}
            />
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={onLogin}
                className="w-full bg-[#07C160] text-white py-3.5 rounded-2xl font-bold text-lg active:scale-95 transition-transform"
              >
                开始使用
              </button>
              <button
                onClick={onClose}
                className="w-full bg-white/5 text-white/40 py-3 rounded-2xl font-medium active:scale-95 transition-transform"
              >
                暂不登录
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
