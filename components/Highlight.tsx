
import React from 'react';

interface HighlightProps {
  text: string | undefined;
  query: string;
}

const Highlight: React.FC<HighlightProps> = ({ text, query }) => {
  if (!text) return null;
  if (!query) return <>{text}</>;

  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));

  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 text-slate-900 rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

export default Highlight;
