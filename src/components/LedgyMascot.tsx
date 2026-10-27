'use client';

import React from 'react';

/**
 * 智帳君吉祥物 (與 App logo 同款的笑臉帳本)
 * - idle：輕飄浮 + 眨眼
 * - listening：戴上耳機、兩側音波跟著 --mic-level 音量跳動
 * - writing：低頭拿鉛筆在封面上做筆記
 */
export type LedgyMascotState = 'idle' | 'listening' | 'writing';

export interface LedgyMascotProps {
  state?: LedgyMascotState;
  className?: string;
}

export const LedgyMascot: React.FC<LedgyMascotProps> = ({ state = 'idle', className = '' }) => {
  const uid = React.useId().replace(/:/g, '');
  const bookId = `ledgy-book-${uid}`;
  const coinId = `ledgy-coin-${uid}`;

  return (
    <svg
      viewBox="0 0 120 120"
      className={`ledgy-mascot ledgy-${state} ${className}`}
      role="img"
      aria-label={
        state === 'listening' ? '智帳君正在聆聽' : state === 'writing' ? '智帳君正在記筆記' : '智帳君'
      }
    >
      <defs>
        <linearGradient id={bookId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0fdf4" />
          <stop offset="100%" stopColor="#c7f0dc" />
        </linearGradient>
        <linearGradient id={coinId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      {/* AI 星光 */}
      <g className="ledgy-sparkles" fill="#ffffff">
        <path className="ledgy-spark-a" d="M14 14 L16 20 L22 22 L16 24 L14 30 L12 24 L6 22 L12 20 Z" />
        <path className="ledgy-spark-b" d="M28 4 L29.3 8 L33 9 L29.3 10 L28 14 L26.7 10 L23 9 L26.7 8 Z" />
      </g>

      {/* 收音音波 (聆聽時) */}
      <g className="ledgy-waves" fill="none" stroke="#d1fae5" strokeWidth="3.2" strokeLinecap="round">
        <path className="ledgy-wave-1" d="M10 50 Q5 60 10 70" />
        <path className="ledgy-wave-2" d="M4 44 Q-3 60 4 76" />
        <path className="ledgy-wave-1" d="M110 50 Q115 60 110 70" />
        <path className="ledgy-wave-2" d="M116 44 Q123 60 116 76" />
      </g>

      <g className="ledgy-body">
        <g transform="rotate(-6 57 63)">
          {/* 後方疊層紙張 */}
          <rect x="34" y="18" width="62" height="80" rx="11" fill="#a7f3d0" opacity="0.55" transform="rotate(9 65 58)" />
          <rect x="30" y="20" width="62" height="82" rx="11" fill="#d1fae5" opacity="0.8" transform="rotate(4 61 61)" />

          {/* 帳本本體與書背 */}
          <rect x="24" y="22" width="66" height="82" rx="12" fill={`url(#${bookId})`} />
          <path d="M36 22 H30 a6 6 0 0 0 -6 6 V98 a6 6 0 0 0 6 6 H36 Z" fill="#a7f3d0" />
          {/* 書籤絲帶 */}
          <path d="M40 102 V114 L45 110 L50 114 V102 Z" fill="#34d399" />

          {/* 臉 */}
          <g className="ledgy-face">
            <g className="ledgy-eyes" fill="#065f46">
              <ellipse cx="49" cy="54" rx="4.6" ry="6.6" />
              <ellipse cx="73" cy="54" rx="4.6" ry="6.6" />
            </g>
            <path d="M54 67 Q61 73 68 67" fill="none" stroke="#065f46" strokeWidth="3.6" strokeLinecap="round" />
          </g>

          {/* 筆記線條 (記筆記時逐行寫出) */}
          <g className="ledgy-notes" fill="none" stroke="#10b981" strokeWidth="2.6" strokeLinecap="round">
            <path className="ledgy-line-1" d="M44 82 H78" pathLength={1} />
            <path className="ledgy-line-2" d="M44 89 H72" pathLength={1} />
            <path className="ledgy-line-3" d="M44 96 H64" pathLength={1} />
          </g>

          {/* 耳機 (聆聽時) */}
          <g className="ledgy-headphones">
            <path d="M20 58 C20 10 98 10 98 58" fill="none" stroke="#047857" strokeWidth="5" strokeLinecap="round" />
            <rect x="13" y="47" width="13" height="24" rx="6" fill="#10b981" stroke="#047857" strokeWidth="2.5" />
            <rect x="92" y="47" width="13" height="24" rx="6" fill="#10b981" stroke="#047857" strokeWidth="2.5" />
          </g>

          {/* 鉛筆 (記筆記時)：筆尖在原點，沿著筆記線條移動 */}
          <g className="ledgy-pencil">
            <g transform="rotate(62)">
              <path d="M0 0 L-4 -10 H4 Z" fill="#fcd9a8" />
              <path d="M0 0 L-1.4 -3.5 H1.4 Z" fill="#334155" />
              <rect x="-4" y="-30" width="8" height="20" fill="#fbbf24" />
              <rect x="-0.8" y="-30" width="1.6" height="20" fill="#f59e0b" />
              <rect x="-4" y="-35" width="8" height="5" fill="#cbd5e1" />
              <rect x="-4" y="-42" width="8" height="8" rx="3" fill="#fb7185" />
            </g>
          </g>
        </g>

        {/* 金幣 */}
        <g className="ledgy-coin">
          <circle cx="93" cy="96" r="13" fill={`url(#${coinId})`} />
          <circle cx="93" cy="96" r="8.5" fill="none" stroke="#fef3c7" strokeWidth="2" opacity="0.8" />
        </g>
      </g>
    </svg>
  );
};
