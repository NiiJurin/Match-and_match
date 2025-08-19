// components/MatchCard.tsx
import React from "react";

interface MatchCardProps {
  title: string;
  tags: string[];
  date: string;
  location: string;
  onApply?: () => void;
  positions: {
    [role: string]: {
      current: number;
      max: number;
    };
  };
}

const MatchCard: React.FC<MatchCardProps> = ({
  title,
  tags = [],                              // ← デフォルト
  date,
  location,
  positions,
  onApply,                                 // ← 受け取り
}) => {
  return (
    <div className="border rounded-2xl shadow p-4 mb-4 w-full bg-white">
      <h2 className="text-lg font-bold mb-1">{title}</h2>
      <div className="text-sm text-gray-500 mb-2">{location} | {date}</div>

      {!!tags.length && (
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag, i) => (
            <span key={i} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{tag}</span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        {Object.entries(positions).map(([role, data], i) => (
          <div key={i} className="flex justify-between items-center">
            <span>{role}</span>
            <span>{data.current}/{data.max}</span>
          </div>
        ))}
      </div>

      <button
        className="mt-2 w-full bg-blue-600 text-white py-1.5 rounded-xl hover:bg-blue-700 transition disabled:opacity-60"
        onClick={onApply}                     // ← これでOK
        disabled={!onApply}                   // 念のため
      >
        応募する
      </button>
    </div>
  );
};

export default MatchCard;