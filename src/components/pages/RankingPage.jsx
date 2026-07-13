import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  ChevronDown,
  Clock3,
  Crown,
  Dumbbell,
  Flame,
  LockKeyhole,
  Medal,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  Trophy,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import Achievement3D from '../ranking/Achievement3D';
import {
  getPointsToAdvance,
  normalizeRanking,
  RANKING_SCORING,
} from '../../domain/ranking';

const BRAND_PINK = '#FE0972';
const BRAND_BLUE = '#0A3CFF';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const BADGE_CATALOG = [
  { key: 'consistency_10', label: 'Consistência', detail: '10 dias', criteria: 'Treine em 10 dias diferentes na mesma temporada.', description: 'Marca o atleta que construiu ritmo e presença ao longo do mês.', kind: 'target', Icon: Target },
  { key: 'hybrid_complete', label: 'Híbrido completo', detail: '4 fichas', criteria: 'Complete quatro fichas diferentes durante a temporada.', description: 'Reconhece variedade real entre força, corrida e condicionamento.', kind: 'dumbbell', Icon: Dumbbell },
  { key: 'streak_7', label: 'Em sequência', detail: '7 dias', criteria: 'Mantenha uma sequência ativa de sete dias.', description: 'Uma medalha para quem protegeu o compromisso diário.', kind: 'flame', Icon: Flame },
  { key: 'top_10', label: 'Top 10', detail: 'Elite global', criteria: 'Finalize a temporada entre os dez melhores atletas.', description: 'Seu nome entrou na faixa de destaque da competição global.', kind: 'medal', Icon: Award },
  { key: 'podium', label: 'Finalista', detail: 'Top 3', criteria: 'Finalize a temporada entre os três primeiros.', description: 'Concedida aos atletas que alcançaram o pódio mensal.', kind: 'trophy', Icon: Medal },
  { key: 'champion', label: 'Lenda', detail: 'Top 1', criteria: 'Conquiste o primeiro lugar ao fim da temporada.', description: 'O troféu máximo da Arena, reservado ao campeão do mês.', kind: 'crown', Icon: Crown },
];

const formatPoints = (value) => new Intl.NumberFormat('pt-BR').format(Number(value) || 0);

const formatSeasonLabel = (value, fallback) => {
  if (!value) return fallback || 'Temporada encerrada';
  const [year, month] = String(value).split('-').map(Number);
  if (!year || !month) return fallback || 'Temporada encerrada';
  return `${MONTH_NAMES[month - 1]} ${year}`;
};

function getInitials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function RankAvatar({ name, photoUrl, size = 44, ring = 'blue', eager = false, className = '' }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => setImageFailed(false), [photoUrl]);

  const ringClass = ring === 'pink'
    ? 'ring-2 ring-[#FE0972] ring-offset-2 ring-offset-[var(--arena-panel)]'
    : ring === 'muted'
      ? 'ring-1 ring-[var(--arena-border-strong)]'
      : 'ring-2 ring-[#0A3CFF] ring-offset-2 ring-offset-[var(--arena-panel)]';

  if (photoUrl && !imageFailed) {
    return (
      <img
        src={photoUrl}
        alt={`Foto de ${name}`}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setImageFailed(true)}
        className={`block shrink-0 rounded-full object-cover ${ringClass} ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      aria-label={`Iniciais de ${name}`}
      className={`flex shrink-0 items-center justify-center rounded-full bg-[#18243A] font-bold text-white ${ringClass} ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }}
    >
      {getInitials(name)}
    </div>
  );
}

function SeasonHeader({ daysRemaining, athleteCount }) {
  const month = MONTH_NAMES[new Date().getMonth()];
  return (
    <header className="flex items-start justify-between gap-3 px-1">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#FE0972]/14 text-[#FE0972] ring-1 ring-[#FE0972]/28">
            <Shield size={19} strokeWidth={2.1} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[1.125rem] font-bold leading-tight text-[var(--arena-text)]">Temporada {month}</h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-[0.75rem] font-medium text-[var(--arena-muted)]">
              <Users size={12} aria-hidden="true" />
              Ranking global · {athleteCount} atleta{athleteCount === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 pt-1 text-right text-[var(--arena-pink-text)]">
        <Clock3 size={15} strokeWidth={2.2} aria-hidden="true" />
        <span className="text-[0.75rem] font-bold tabular-nums">{daysRemaining} dias</span>
      </div>
    </header>
  );
}

function AthleteShield({ viewer, total }) {
  if (!viewer) return null;
  return (
    <section className="hc-arena-shield mt-5" aria-label="Sua posição na temporada">
      <div className="hc-arena-shield__inner">
        <RankAvatar name={viewer.display_name} photoUrl={viewer.avatar_url} size={76} eager />
        <div className="min-w-0 flex-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--arena-muted)]">Sua posição</p>
          <div className="mt-1 flex items-end gap-2">
            <strong className="text-[3.25rem] font-extrabold leading-[0.84] tracking-[-0.04em] text-[#0A3CFF] tabular-nums">
              {viewer.rank}
            </strong>
            <span className="mb-0.5 truncate text-[0.875rem] font-bold text-[var(--arena-text)]">{viewer.division}</span>
          </div>
          <p className="mt-2 text-[0.75rem] font-semibold text-[#8FB1FF]">Top {viewer.percentile}% entre {total} atletas</p>
        </div>
        <div className="hidden min-w-[86px] border-l border-[var(--arena-border)] pl-4 text-right min-[370px]:block">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-[var(--arena-muted)]">Pontos</p>
          <strong className="mt-1 block text-[1.5rem] font-bold tracking-[-0.03em] text-[var(--arena-text)] tabular-nums">
            {formatPoints(viewer.points)}
          </strong>
          <p className="mt-1 truncate text-[0.6875rem] font-semibold text-[var(--arena-pink-text)]">{viewer.title || 'Em evolução'}</p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--arena-border)] px-4 py-2 min-[370px]:hidden">
        <span className="text-[0.6875rem] font-medium text-[var(--arena-muted)]">Pontos na temporada</span>
        <strong className="text-[0.875rem] font-bold text-[var(--arena-text)] tabular-nums">{formatPoints(viewer.points)}</strong>
      </div>
    </section>
  );
}

function PodiumAthlete({ entry, place }) {
  const champion = place === 1;
  if (!entry) return <div aria-hidden="true" />;

  return (
    <article className={`relative flex min-w-0 flex-col items-center ${champion ? 'order-2 -mt-4' : place === 2 ? 'order-1' : 'order-3'}`}>
      <span className={`mb-2 flex h-7 min-w-7 items-center justify-center rounded-[8px] px-2 text-[0.75rem] font-extrabold ${champion ? 'bg-[#FE0972] text-white' : 'bg-[#0A3CFF] text-white'}`}>
        {place}
      </span>
      {champion && <Crown className="absolute top-7 text-[#FE0972]" size={20} fill="currentColor" aria-hidden="true" />}
      <RankAvatar
        name={entry.display_name}
        photoUrl={entry.avatar_url}
        size={champion ? 74 : 58}
        ring={champion ? 'pink' : 'blue'}
        eager={champion}
        className={champion ? 'mt-2' : ''}
      />
      <p className="mt-3 w-full truncate text-center text-[0.75rem] font-bold text-[var(--arena-text)]">{entry.display_name}</p>
      <p className={`mt-0.5 text-[0.75rem] font-bold tabular-nums ${champion ? 'text-[#FE0972]' : 'text-[#AFC5FF]'}`}>
        {formatPoints(entry.points)} pts
      </p>
    </article>
  );
}

function ArenaPodium({ podium }) {
  return (
    <section className="mt-8" aria-labelledby="podium-title">
      <div className="mb-5 flex items-center justify-between">
        <h2 id="podium-title" className="text-[0.875rem] font-bold text-[var(--arena-text)]">Pódio da temporada</h2>
        <span className="text-[0.6875rem] font-semibold text-[var(--arena-muted)]">Atualizado agora</span>
      </div>
      <div className="hc-arena-podium grid grid-cols-3 items-end gap-1 px-2 pb-4 pt-6">
        <PodiumAthlete entry={podium[0]} place={1} />
        <PodiumAthlete entry={podium[1]} place={2} />
        <PodiumAthlete entry={podium[2]} place={3} />
      </div>
    </section>
  );
}

function NextObjective({ viewer, athleteAhead }) {
  if (!viewer) return null;

  const isLeader = viewer.rank === 1;
  const pointsMissing = getPointsToAdvance(viewer, athleteAhead);
  const targetPoints = athleteAhead?.points || viewer.points;
  const progress = targetPoints > 0 ? Math.min(100, Math.round((viewer.points / targetPoints) * 100)) : 100;

  return (
    <section className="mt-4 rounded-[16px] bg-[var(--arena-panel-soft)] px-4 py-4 ring-1 ring-[var(--arena-border)]" aria-labelledby="objective-title">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#FE0972]/12 text-[#FE0972]">
          <Target size={19} strokeWidth={2.1} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p id="objective-title" className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--arena-muted)]">Próximo objetivo</p>
          <p className="mt-1 truncate text-[0.875rem] font-bold text-[var(--arena-text)]">
            {isLeader ? 'Defender a liderança' : `Ultrapassar ${athleteAhead?.display_name || 'a próxima posição'}`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <strong className="block text-[1rem] font-bold text-[var(--arena-text)] tabular-nums">{isLeader ? 'Top 1' : `${formatPoints(pointsMissing)} pts`}</strong>
          <span className="text-[0.625rem] font-medium text-[var(--arena-muted)]">{isLeader ? 'posição atual' : 'para avançar'}</span>
        </div>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--arena-track)]" aria-hidden="true">
        <div className="h-full rounded-full bg-[#0A3CFF] transition-[width] duration-300" style={{ width: `${progress}%` }} />
      </div>
    </section>
  );
}

function Movement({ previousRank, currentRank }) {
  if (!previousRank || previousRank === currentRank) return <span className="text-[#667085]">-</span>;
  const delta = previousRank - currentRank;
  return delta > 0 ? (
    <span className="flex items-center gap-0.5 font-bold text-[#FE0972]" aria-label={`Subiu ${delta} posições`}>
      <TrendingUp size={13} aria-hidden="true" /> {delta}
    </span>
  ) : (
    <span className="flex items-center gap-0.5 font-bold text-[#5E83FF]" aria-label={`Desceu ${Math.abs(delta)} posições`}>
      <TrendingDown size={13} aria-hidden="true" /> {Math.abs(delta)}
    </span>
  );
}

function RankingRow({ entry }) {
  return (
    <div className={`grid min-h-[58px] grid-cols-[30px_22px_40px_minmax(0,1fr)_auto] items-center gap-2 border-b border-[var(--arena-border)] px-2 py-2.5 last:border-b-0 ${entry.is_viewer ? 'rounded-[12px] border-b-0 bg-[#0A3CFF] px-3 text-white' : ''}`}>
      <span className="text-center text-[0.8125rem] font-bold tabular-nums">{entry.rank}</span>
      <span className="flex justify-center text-[0.6875rem]"><Movement previousRank={entry.previous_rank} currentRank={entry.rank} /></span>
      <RankAvatar name={entry.display_name} photoUrl={entry.avatar_url} size={34} ring={entry.is_viewer ? 'muted' : 'muted'} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[0.8125rem] font-bold">{entry.is_viewer ? 'Você' : entry.display_name}</p>
          {entry.title && <Sparkles size={11} className={entry.is_viewer ? 'text-white' : 'text-[#FE0972]'} aria-label={entry.title} />}
        </div>
        <p className={`mt-0.5 flex items-center gap-1 text-[0.625rem] font-medium ${entry.is_viewer ? 'text-white/74' : 'text-[var(--arena-muted)]'}`}>
          <Flame size={10} aria-hidden="true" /> {entry.streak || 0} dias · {entry.month_days || 0} treinos
        </p>
      </div>
      <strong className="text-right text-[0.8125rem] font-bold tabular-nums">{formatPoints(entry.points)}</strong>
    </div>
  );
}

function RankingList({ ranking, viewer }) {
  const [expanded, setExpanded] = useState(false);
  const rest = ranking.slice(3);
  const compact = useMemo(() => {
    if (expanded || rest.length <= 10) return rest;
    const first = rest.slice(0, 7);
    if (!viewer || viewer.rank <= 10) return first;
    const aroundViewer = rest.filter((entry) => Math.abs(entry.rank - viewer.rank) <= 1);
    return [...new Map([...first, ...aroundViewer].map((entry) => [entry.user_id, entry])).values()]
      .sort((a, b) => a.rank - b.rank);
  }, [expanded, rest, viewer]);

  if (rest.length === 0) return null;

  return (
    <section className="mt-7" aria-labelledby="global-ranking-title">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 id="global-ranking-title" className="text-[0.9375rem] font-bold text-[var(--arena-text)]">Ranking global</h2>
        <span className="text-[0.6875rem] font-semibold text-[var(--arena-muted)]">Pontos</span>
      </div>
      <div className="overflow-hidden rounded-[16px] bg-[var(--arena-panel)] ring-1 ring-[var(--arena-border)]">
        {compact.map((entry) => <RankingRow key={entry.user_id} entry={entry} />)}
      </div>
      {rest.length > 10 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-[12px] text-[0.75rem] font-bold text-[#0A3CFF] transition-colors hover:bg-[var(--arena-panel-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3CFF] active:bg-[var(--arena-panel-soft)]"
          aria-expanded={expanded}
        >
          {expanded ? 'Mostrar menos' : `Ver todos os ${rest.length} atletas`}
          <ChevronDown size={15} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      )}
    </section>
  );
}

function AchievementDetail({ badge, unlocked, onClose }) {
  const dialogRef = React.useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    if (!dialog.open) dialog.showModal();
    const handleCancel = (event) => {
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  const Icon = badge.Icon;
  return (
    <dialog ref={dialogRef} className="hc-achievement-dialog" aria-labelledby="achievement-detail-title">
      <div className="hc-achievement-dialog__surface">
        <button type="button" onClick={onClose} className="hc-achievement-dialog__close" aria-label="Fechar detalhes da conquista">
          <X size={19} aria-hidden="true" />
        </button>
        <div className="hc-achievement-dialog__stage">
          <Achievement3D kind={badge.kind} unlocked={unlocked} label={badge.label} />
          <span className={`hc-achievement-dialog__status ${unlocked ? 'is-earned' : ''}`}>
            {unlocked ? <Icon size={13} aria-hidden="true" /> : <LockKeyhole size={13} aria-hidden="true" />}
            {unlocked ? 'Conquistada' : 'Bloqueada'}
          </span>
        </div>
        <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[var(--arena-pink-text)]">Medalha da Arena</p>
          <h2 id="achievement-detail-title" className="mt-1 text-[1.5rem] font-extrabold text-[var(--arena-text)]">{badge.label}</h2>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--arena-muted)]">{badge.description}</p>
          <div className="mt-5 border-t border-[var(--arena-border)] pt-4">
            <p className="text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[var(--arena-muted)]">Como conquistar</p>
            <p className="mt-1.5 text-[0.8125rem] font-semibold leading-relaxed text-[var(--arena-text)]">{badge.criteria}</p>
          </div>
          <p className="mt-4 text-center text-[0.625rem] font-medium text-[var(--arena-muted)]">Arraste a medalha para observar todos os ângulos.</p>
        </div>
      </div>
    </dialog>
  );
}

function AchievementRail({ viewer, history }) {
  const [selectedBadge, setSelectedBadge] = useState(null);
  const earned = new Set([
    ...(viewer?.badges || []),
    ...history.flatMap((season) => season.badges || []),
  ]);

  return (
    <section className="mt-7" aria-labelledby="achievements-title">
      <div className="mb-3 flex items-end justify-between px-1">
        <div>
          <h2 id="achievements-title" className="text-[0.9375rem] font-bold text-[var(--arena-text)]">Conquistas</h2>
          <p className="mt-0.5 text-[0.6875rem] font-medium text-[var(--arena-muted)]">Toque em uma medalha para explorar.</p>
        </div>
        <span className="text-[0.6875rem] font-bold text-[var(--arena-pink-text)]">{earned.size}/{BADGE_CATALOG.length}</span>
      </div>
      <div className="hc-achievement-rail -mx-5 flex snap-x gap-2.5 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {BADGE_CATALOG.map((badge) => {
          const { key, label, detail, Icon } = badge;
          const unlocked = earned.has(badge.key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedBadge(badge)}
              className={`hc-achievement-card ${unlocked ? 'is-earned' : ''}`}
              aria-label={`${label}: ${unlocked ? 'conquistada' : 'bloqueada'}. Abrir detalhes.`}
            >
              <span className="hc-achievement-card__medal" aria-hidden="true">
                <span className="hc-achievement-card__rim">
                  <Icon size={23} strokeWidth={1.9} />
                </span>
              </span>
              <span className={`mt-3 block text-[0.6875rem] font-bold leading-tight ${unlocked ? 'text-[var(--arena-text)]' : 'text-[var(--arena-muted)]'}`}>{label}</span>
              <span className="mt-1 block text-[0.625rem] font-medium text-[var(--arena-muted)]">{detail}</span>
              <span className="absolute right-2.5 top-2.5 text-[var(--arena-muted)]">
                {unlocked ? <Icon size={20} strokeWidth={2} aria-hidden="true" /> : <LockKeyhole size={17} aria-hidden="true" />}
              </span>
            </button>
          );
        })}
      </div>
      {selectedBadge && (
        <AchievementDetail
          badge={selectedBadge}
          unlocked={earned.has(selectedBadge.key)}
          onClose={() => setSelectedBadge(null)}
        />
      )}
    </section>
  );
}

function SeasonHistory({ history }) {
  if (history.length === 0) return null;
  return (
    <section className="mt-7" aria-labelledby="history-title">
      <h2 id="history-title" className="px-1 text-[0.9375rem] font-bold text-[var(--arena-text)]">Temporadas anteriores</h2>
      <div className="mt-3 space-y-2">
        {history.slice(0, 3).map((season) => (
          <div key={season.season_start} className="flex items-center gap-3 rounded-[14px] bg-[var(--arena-panel)] px-3.5 py-3 ring-1 ring-[var(--arena-border)]">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#FE0972]/12 text-[#FE0972]">
              <Trophy size={17} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.75rem] font-bold text-[var(--arena-text)]">{formatSeasonLabel(season.season_start, season.season_label)}</p>
              <p className="mt-0.5 truncate text-[0.625rem] font-medium text-[var(--arena-muted)]">{season.title || season.division}</p>
            </div>
            <div className="text-right">
              <strong className="block text-[0.875rem] font-bold text-[var(--arena-text)]">#{season.final_rank}</strong>
              <span className="text-[0.625rem] font-medium text-[var(--arena-muted)]">{formatPoints(season.points)} pts</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RankingRules({ rules }) {
  return (
    <details className="mt-6 rounded-[14px] bg-[var(--arena-panel)] px-4 py-1 ring-1 ring-[var(--arena-border)]">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-[0.75rem] font-bold text-[#0A3CFF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3CFF]">
        Como os pontos funcionam
        <ChevronDown size={15} aria-hidden="true" />
      </summary>
      <div className="grid gap-2 border-t border-[var(--arena-border)] py-3 text-[0.6875rem] font-medium text-[var(--arena-muted)]">
        <p><strong className="text-[var(--arena-text)]">{rules.trainingDay} pontos</strong> por dia com treino salvo.</p>
        <p><strong className="text-[var(--arena-text)]">{rules.activeStreakDay} pontos</strong> por dia de sequência ativa.</p>
        <p><strong className="text-[var(--arena-text)]">{rules.workoutVariety} pontos</strong> por ficha diferente no mês.</p>
      </div>
    </details>
  );
}

function RankingSkeleton() {
  return (
    <div className="hc-ranking-arena -mx-5 -mt-5 min-h-[calc(100dvh-8rem)] px-5 pb-32 pt-5" aria-label="Carregando ranking">
      <div className="animate-pulse">
        <div className="flex justify-between">
          <div className="h-10 w-44 rounded-[10px] bg-[var(--arena-skeleton)]" />
          <div className="h-5 w-20 rounded bg-[var(--arena-skeleton)]" />
        </div>
        <div className="mt-5 h-40 rounded-[16px] bg-[var(--arena-skeleton)]" />
        <div className="mt-8 grid grid-cols-3 items-end gap-2">
          <div className="h-36 rounded-[14px] bg-[var(--arena-skeleton)]" />
          <div className="h-44 rounded-[14px] bg-[var(--arena-skeleton)]" />
          <div className="h-36 rounded-[14px] bg-[var(--arena-skeleton)]" />
        </div>
        <div className="mt-5 h-20 rounded-[16px] bg-[var(--arena-skeleton)]" />
        <div className="mt-7 space-y-2">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-14 rounded-[12px] bg-[var(--arena-skeleton)]" />)}
        </div>
      </div>
    </div>
  );
}

function RankingError({ message, onRetry }) {
  return (
    <div className="hc-ranking-arena -mx-5 -mt-5 flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center px-8 pb-32 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#FE0972]/12 text-[#FE0972]">
        <Trophy size={22} aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-[1rem] font-bold">O ranking não carregou</h1>
      <p className="mt-2 max-w-[30ch] text-[0.8125rem] leading-relaxed text-[var(--arena-muted)]">{message}</p>
      <button type="button" onClick={onRetry} className="mt-5 flex min-h-11 items-center gap-2 rounded-[12px] bg-[#0A3CFF] px-5 text-[0.8125rem] font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8FB1FF] active:scale-[0.98]">
        <RefreshCw size={15} aria-hidden="true" /> Tentar novamente
      </button>
    </div>
  );
}

export default function RankingPage({ userId, viewerAvatarUrl = '', avatarRefreshKey = 0 }) {
  const [ranking, setRanking] = useState([]);
  const [history, setHistory] = useState([]);
  const [rules, setRules] = useState(RANKING_SCORING);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const run = async ({ quiet = false } = {}) => {
      if (!isSupabaseConfigured) {
        if (isMounted) {
          setError('O Supabase não está configurado neste ambiente.');
          setLoading(false);
        }
        return;
      }

      if (!quiet) setLoading(true);
      try {
        const [{ data, error: rankingError }, historyResponse, rulesResponse] = await Promise.all([
          supabase.rpc('get_monthly_ranking', { p_viewer_id: userId || null }),
          supabase.rpc('get_ranking_season_history', { p_viewer_id: userId || null }),
          supabase.rpc('get_ranking_rules'),
        ]);
        if (rankingError) throw rankingError;
        if (!isMounted) return;
        setRanking(normalizeRanking(data || [], userId, viewerAvatarUrl));
        setHistory(historyResponse.error ? [] : (historyResponse.data || []));
        if (!rulesResponse.error && rulesResponse.data?.[0]) {
          setRules({
            trainingDay: Number(rulesResponse.data[0].training_day_points) || RANKING_SCORING.trainingDay,
            activeStreakDay: Number(rulesResponse.data[0].active_streak_day_points) || RANKING_SCORING.activeStreakDay,
            workoutVariety: Number(rulesResponse.data[0].workout_variety_points) || RANKING_SCORING.workoutVariety,
          });
        }
        setError(null);
      } catch (requestError) {
        if (isMounted) setError(requestError?.message || 'Confira sua conexão e tente novamente.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    run();
    const onVisible = () => { if (!document.hidden) run({ quiet: true }); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    const syncTimer = window.setInterval(() => run({ quiet: true }), 30000);
    const profileChannel = supabase
      .channel('ranking-arena-sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => run({ quiet: true }))
      .subscribe();

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.clearInterval(syncTimer);
      supabase.removeChannel(profileChannel);
    };
  }, [userId, viewerAvatarUrl, avatarRefreshKey, refreshKey]);

  const viewer = ranking.find((entry) => entry.is_viewer || entry.user_id === userId) || null;
  const podium = ranking.slice(0, 3);
  const athleteAhead = viewer?.rank > 1 ? ranking[viewer.rank - 2] : null;
  const now = new Date();
  const daysRemaining = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

  if (loading) return <RankingSkeleton />;
  if (error && ranking.length === 0) return <RankingError message={error} onRetry={() => setRefreshKey((value) => value + 1)} />;

  return (
    <div className="hc-ranking-arena relative -mx-5 -mt-5 min-h-[calc(100dvh-8rem)] overflow-hidden px-5 pb-32 pt-5">
      <div className="hc-ranking-arena__light" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-[430px]">
        <SeasonHeader daysRemaining={daysRemaining} athleteCount={ranking.length} />

        {ranking.length === 0 ? (
          <section className="mt-8 rounded-[16px] bg-[var(--arena-panel)] px-5 py-12 text-center ring-1 ring-[var(--arena-border)]">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#FE0972]/12 text-[#FE0972]">
              <Trophy size={22} aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-[1rem] font-bold">A temporada começa com o primeiro treino</h2>
            <p className="mx-auto mt-2 max-w-[30ch] text-[0.8125rem] leading-relaxed text-[var(--arena-muted)]">
              Salve uma sessão de força ou corrida para entrar na Arena de {MONTH_NAMES[now.getMonth()]}.
            </p>
          </section>
        ) : (
          <>
            <AthleteShield viewer={viewer} total={ranking.length} />
            <ArenaPodium podium={podium} />
            <NextObjective viewer={viewer} athleteAhead={athleteAhead} />
            <RankingList ranking={ranking} viewer={viewer} />
            <AchievementRail viewer={viewer} history={history} />
            <SeasonHistory history={history} />
            <RankingRules rules={rules} />
          </>
        )}
      </div>
    </div>
  );
}

export { BRAND_PINK, BRAND_BLUE };
