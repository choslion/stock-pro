import { useQuery } from "@tanstack/react-query";
import { Q, fetchers } from "../lib/queries";

export default function NewsTicker() {
  const { data } = useQuery({
    queryKey: Q.news(),
    queryFn:  fetchers.news,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });

  const items = data?.items ?? [];
  if (items.length === 0) return null;

  const duration = Math.max(items.length * 7, 40);
  const doubled  = [...items, ...items];

  return (
    <div className="overflow-hidden bg-gray-950/60 border-b border-gray-800/50 py-1.5 select-none">
      <div
        className="flex gap-10 whitespace-nowrap hover:[animation-play-state:paused]"
        style={{ animation: `news-ticker ${duration}s linear infinite` }}
      >
        {doubled.map((item, i) => (
          <a
            key={i}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <span className="text-blue-400 font-medium mr-1.5">{item.source}</span>
            {item.title}
          </a>
        ))}
      </div>

      <style>{`
        @keyframes news-ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
