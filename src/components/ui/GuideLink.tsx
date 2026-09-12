import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

interface Props {
  section: string;
  label: string;
  className?: string;
}

export default function GuideLink({ section, label, className = '' }: Props) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/guide#${section}`)}
      className={`inline-flex items-center gap-1 text-[10px] text-accent-blue/70 hover:text-accent-blue transition-colors ${className}`}
      title={`查看新手必看 > ${label}`}
    >
      <BookOpen size={10} />
      <span>{label}</span>
    </button>
  );
}
