import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  ChevronDown,
  Clock3,
  Crown,
  Dumbbell,
  Flame,
  LockKeyhole,
  LoaderCircle,
  Medal,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import Achievement3D from '../ranking/Achievement3D';
import Podium3D from '../ranking/Podium3D';
import SeasonTrophy3D from '../ranking/SeasonTrophy3D';
import ProfileAvatar from '../profile/ProfileAvatar';
import { getAvatarFrameReward, getPrimaryGoalLabel } from '../../domain/profile';
import {
  FINAL_PLACEMENT_BADGES,
  normalizeRankingProfile,
  normalizeRanking,
  RANKING_SCORING,
} from '../../domain/ranking';

const BRAND_PINK = '#FE0972';
const BRAND_BLUE = '#0A3CFF';
const getFrameRewardLabel = (badgeKey) => {
  const frame = getAvatarFrameReward(badgeKey);
  return frame ? `Moldura ${frame.label}` : null;
};

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const BADGE_CATALOG = [
  { key: 'consistency_10', label: 'Consistencia', detail: '10 dias', criteria: 'Treine em 10 dias diferentes na mesma temporada.', description: 'Marca o atleta que construiu ritmo e presenca ao longo do mes.', reward: getFrameRewardLabel('consistency_10'), kind: 'target', geometry: 'route', Icon: Target },
  { key: 'hybrid_complete', label: 'Hibrido completo', detail: '4 fichas', criteria: 'Complete quatro fichas diferentes durante a temporada.', description: 'Reconhece variedade real entre forca, corrida e condicionamento.', reward: getFrameRewardLabel('hybrid_complete'), kind: 'dumbbell', geometry: 'knot', Icon: Dumbbell },
  { key: 'streak_7', label: 'Em sequencia', detail: '7 dias', criteria: 'Mantenha uma sequencia ativa de sete dias.', description: 'Uma medalha para quem protegeu o compromisso diario.', reward: getFrameRewardLabel('streak_7'), kind: 'flame', geometry: 'split', Icon: Flame },
  { key: 'top_10', label: 'Top 10', detail: 'Elite global', criteria: 'Finalize a temporada entre os dez melhores atletas.', description: 'Seu nome entrou na faixa de destaque da competicao global.', reward: getFrameRewardLabel('top_10'), kind: 'medal', geometry: 'split', Icon: Award },
  { key: 'podium', label: 'Finalista', detail: 'Top 3', criteria: 'Finalize a temporada entre os tres primeiros.', description: 'Concedida aos atletas que alcancaram o podio mensal.', reward: getFrameRewardLabel('podium'), kind: 'trophy', geometry: 'route', Icon: Medal },
  { key: 'champion', label: 'Lenda', detail: 'Top 1', criteria: 'Conquiste o primeiro lugar ao fim da temporada.', description: 'O trofeu maximo da Arena, reservado ao campeao do mes.', reward: getFrameRewardLabel('champion'), kind: 'crown', geometry: 'knot', Icon: Crown },
];

const BADGE_PRIORITY = ['champion', 'podium', 'top_10', 'hybrid_complete', 'streak_7', 'consistency_10'];
const BADGE_BY_KEY = new Map(BADGE_CATALOG.map((badge) => [badge.key, badge]));

const formatPoints = (value) => new Intl.NumberFormat('pt-BR').format(Number(value) || 0);

const formatSeasonLabel = (value, fallback) => {
  if (!value) return fallback || 'Temporada encerrada';
  const [year, month] = String(value).split('-').map(Number);
  if (!year || !month) return fallback || 'Temporada encerrada';
  return `${MONTH_NAMES[month - 1]} ${year}`;
};

function normalizeAchievementShowcase(rows = []) {
  const now = new Date();
  const currentSeasonKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return rows
    .map((row) => {
      const key = String(row.badge_key || '');
      const isPrematurePlacement = FINAL_PLACEMENT_BADGES.includes(key)
        && String(row.latest_season_start || '').slice(0, 7) === currentSeasonKey;
      const timesEarned = Math.max(0, (Number(row.times_earned) || 1) - (isPrematurePlacement ? 1 : 0));
      if (timesEarned === 0) return null;
      return {
        key,
        timesEarned,
        latestSeasonLabel: isPrematurePlacement
          ? 'Temporada encerrada'
          : formatSeasonLabel(row.latest_season_start, row.latest_season_label),
      };
    })
    .filter(Boolean)
    .filter((achievement) => BADGE_BY_KEY.has(achievement.key))
    .sort((left, right) => BADGE_PRIORITY.indexOf(left.key) - BADGE_PRIORITY.indexOf(right.key));
}

function buildFallbackShowcase(athlete, history = [], includeHistory = false) {
  const aggregate = new Map();
  const addBadges = (badges, seasonLabel) => {
    (badges || []).forEach((key) => {
      if (!BADGE_BY_KEY.has(key)) return;
      const existing = aggregate.get(key);
      aggregate.set(key, {
        key,
        timesEarned: (existing?.timesEarned || 0) + 1,
        latestSeasonLabel: existing?.latestSeasonLabel || seasonLabel,
      });
    });
  };

  addBadges(athlete?.badges, `Temporada ${MONTH_NAMES[new Date().getMonth()]}`);
  if (includeHistory) {
    history.forEach((season) => addBadges(
      season.badges,
      formatSeasonLabel(season.season_start, season.season_label),
    ));
  }

  return [...aggregate.values()]
    .sort((left, right) => BADGE_PRIORITY.indexOf(left.key) - BADGE_PRIORITY.indexOf(right.key));
}

function RankAvatar({ name, photoUrl, frame = 'minimal', size = 44, eager = false, className = '' }) {
  return (
    <ProfileAvatar
      src={photoUrl}
      name={name}
      frame={frame}
      size={size}
      decorative={false}
      eager={eager}
      className={className}
    />
  );
}

function SeasonTrophyMini() {
  return (
    <span className="hc-season-trophy-mini" aria-hidden="true">
      <span className="hc-season-trophy-mini__shield" />
      <span className="hc-season-trophy-mini__cup" />
      <span className="hc-season-trophy-mini__mark">H</span>
    </span>
  );
}

function SeasonHeader({ daysRemaining, monthProgress, onOpenTrophy }) {
  const month = MONTH_NAMES[new Date().getMonth()];
  const segments = Array.from({ length: 6 }, (_, index) => index);
  const activeSegments = Math.max(1, Math.ceil((monthProgress / 100) * segments.length));

  return (
    <header className="hc-arena-header">
      <div className="hc-arena-header__season">
        <div className="hc-arena-header__title">
          <h1>Temporada {month}</h1>
          <button
            type="button"
            className="hc-season-trophy-trigger"
            onClick={onOpenTrophy}
            aria-label={`Ver Troféu de ${month}`}
          >
            <SeasonTrophyMini />
          </button>
        </div>
        <div className="hc-arena-header__progress" aria-label={`${monthProgress}% da temporada concluida`}>
          {segments.map((segment) => (
            <span
              key={segment}
              className={`h-1.5 flex-1 rounded-full ${segment < activeSegments ? 'bg-[#126BFF]' : 'bg-white/18'}`}
            />
          ))}
        </div>
      </div>
      <div className="hc-arena-header__remaining">
        <Clock3 size={20} strokeWidth={2.1} aria-hidden="true" />
        <span>{daysRemaining} dias</span>
      </div>
    </header>
  );
}

function SeasonTrophyDialog({ month, year, leader, daysRemaining, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    dialog.showModal();
    const handleCancel = (event) => {
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="hc-season-trophy-dialog"
      aria-labelledby="season-trophy-title"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="hc-season-trophy-dialog__surface">
        <button type="button" onClick={onClose} className="hc-season-trophy-dialog__close" aria-label="Fechar Troféu da temporada">
          <X size={19} aria-hidden="true" />
        </button>

        <div className="hc-season-trophy-dialog__stage">
          <SeasonTrophy3D label={`Troféu de ${month}`} />
          <span className="hc-season-trophy-dialog__status">
            <Clock3 size={13} aria-hidden="true" /> Em disputa
          </span>
        </div>

        <div className="hc-season-trophy-dialog__content">
          <p className="hc-season-trophy-dialog__eyebrow">Relíquia da temporada</p>
          <h2 id="season-trophy-title">Troféu de {month}</h2>
          <p className="hc-season-trophy-dialog__description">
            A peça única de {month} de {year}. Será entregue ao primeiro colocado somente após o encerramento oficial da temporada.
          </p>

          <div className="hc-season-trophy-dialog__rule">
            <span>Critério de conquista</span>
            <strong>Finalizar a temporada em 1º lugar</strong>
          </div>

          {leader && (
            <div className="hc-season-trophy-dialog__leader">
              <RankAvatar name={leader.display_name} photoUrl={leader.avatar_url} frame={leader.avatar_frame} size={38} />
              <div className="min-w-0 flex-1">
                <span>Líder provisório</span>
                <strong>{leader.display_name}</strong>
              </div>
              <b>{formatPoints(leader.points)} pts</b>
            </div>
          )}

          <p className="hc-season-trophy-dialog__remaining">
            {daysRemaining > 0 ? `${daysRemaining} dias para definir o vencedor` : 'Fechamento da temporada em processamento'}
          </p>
        </div>
      </div>
    </dialog>
  );
}

const CLIMB_ROUTE_POINTS = [
  [112, 395],
  [121, 373],
  [137, 353],
  [134, 331],
  [153, 312],
  [162, 289],
  [181, 270],
  [184, 247],
  [204, 228],
  [211, 205],
  [232, 187],
  [239, 165],
];

const CLIMB_ROUTE = CLIMB_ROUTE_POINTS.map(([x, y]) => `${x},${y}`).join(' ');

function getPointOnRoute(progress) {
  const distances = CLIMB_ROUTE_POINTS.slice(1).map(([x, y], index) => {
    const [previousX, previousY] = CLIMB_ROUTE_POINTS[index];
    return Math.hypot(x - previousX, y - previousY);
  });
  const totalDistance = distances.reduce((sum, distance) => sum + distance, 0);
  let distanceRemaining = totalDistance * Math.min(1, Math.max(0, progress / 100));

  for (let index = 0; index < distances.length; index += 1) {
    if (distanceRemaining <= distances[index]) {
      const [startX, startY] = CLIMB_ROUTE_POINTS[index];
      const [endX, endY] = CLIMB_ROUTE_POINTS[index + 1];
      const segmentProgress = distances[index] ? distanceRemaining / distances[index] : 0;
      return {
        x: startX + (endX - startX) * segmentProgress,
        y: startY + (endY - startY) * segmentProgress,
      };
    }
    distanceRemaining -= distances[index];
  }

  const [x, y] = CLIMB_ROUTE_POINTS[CLIMB_ROUTE_POINTS.length - 1];
  return { x, y };
}

function ClimbPortrait({ entry, tone, eager = false, onOpen, size }) {
  const Frame = onOpen ? 'button' : 'div';
  const avatarSize = size || (tone === 'leader' ? 86 : tone === 'target' ? 88 : 78);
  return (
    <Frame
      type={onOpen ? 'button' : undefined}
      onClick={onOpen}
      className={`hc-climb-portrait is-${tone} ${onOpen ? 'is-interactive' : ''}`}
      aria-label={onOpen ? `Ver perfil de ${entry?.display_name || 'atleta'}` : undefined}
    >
      <RankAvatar
        name={entry?.display_name || 'Atleta'}
        photoUrl={entry?.avatar_url}
        frame={entry?.avatar_frame}
        size={avatarSize}
        eager={eager}
      />
    </Frame>
  );
}

function PodiumPortrait({ entry, place, eager = false, onOpen }) {
  const Frame = onOpen ? 'button' : 'div';
  return (
    <Frame
      type={onOpen ? 'button' : undefined}
      onClick={onOpen}
      className={`hc-podium-medal is-place-${place} ${onOpen ? 'is-interactive' : ''}`}
      aria-label={onOpen ? `Ver perfil de ${entry?.display_name || 'atleta'}` : undefined}
    >
      <RankAvatar
        name={entry?.display_name || 'Atleta'}
        photoUrl={entry?.avatar_url}
        frame={entry?.avatar_frame}
        size={place === 1 ? 84 : 68}
        eager={eager}
      />
    </Frame>
  );
}

function ArenaDuel({ viewer, athleteAhead, onOpenAthlete }) {
  const [expanded, setExpanded] = useState(false);
  const panelId = React.useId();
  if (!viewer) return null;

  const isLeader = viewer.rank === 1 || !athleteAhead;
  const target = isLeader ? viewer : athleteAhead;
  const targetPoints = target?.points || viewer.points;
  const progress = targetPoints > 0 ? Math.min(100, Math.round((viewer.points / targetPoints) * 100)) : 100;
  const pointsGap = Math.max(0, targetPoints - viewer.points);
  const marker = getPointOnRoute(progress);
  const markerStyle = {
    '--climb-marker-x': `${(marker.x / 360) * 100}%`,
    '--climb-marker-y': `${(marker.y / 500) * 100}%`,
  };

  return (
    <section
      className={`hc-duel-disclosure mt-5 ${isLeader ? 'is-leader' : ''} ${expanded ? 'is-expanded' : ''}`}
      aria-label={isLeader ? 'Liderança do ranking' : 'Diferença para o próximo atleta'}
      style={{ '--duel-progress': `${progress}%` }}
    >
      <button
        type="button"
        className="hc-duel-disclosure__trigger"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="hc-duel-disclosure__icon" aria-hidden="true">
          {isLeader ? <Crown size={16} fill="currentColor" /> : <Target size={16} />}
        </span>
        <span className="hc-duel-disclosure__copy">
          <strong>{isLeader ? 'Você está na liderança' : 'Próximo alvo'}</strong>
          <small>
            {isLeader
              ? `Defenda seus ${formatPoints(viewer.points)} pts`
              : `${formatPoints(pointsGap)} pts para alcançar ${target?.display_name || 'o próximo atleta'}`}
          </small>
        </span>
        <span className="hc-duel-disclosure__status">
          <strong>{isLeader ? '#1' : `${progress}%`}</strong>
          <ChevronDown size={17} aria-hidden="true" />
        </span>
        <span className="hc-duel-disclosure__meter" aria-hidden="true" />
      </button>

      <div id={panelId} className="hc-duel-disclosure__panel" hidden={!expanded}>
        {expanded && (
          <div className={`hc-climb ${isLeader ? 'is-leader' : ''}`} style={markerStyle}>
            <svg className="hc-climb__map" viewBox="0 0 360 500" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="hc-climb-route-gradient" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="var(--arena-cyan)" />
                  <stop offset="52%" stopColor="var(--arena-gold)" />
                  <stop offset="100%" stopColor="var(--arena-ember)" />
                </linearGradient>
              </defs>

              <g className="hc-climb__terrain is-upper" transform="translate(-24 18) scale(1.14 1.3)">
                {EFFORT_CONTOURS.map((path) => <path key={`upper-${path}`} d={path} />)}
              </g>
              <g className="hc-climb__terrain is-lower" transform="translate(386 516) rotate(180) scale(1.08 1.28)">
                {EFFORT_CONTOURS.map((path) => <path key={`lower-${path}`} d={path} />)}
              </g>

              {!isLeader && (
                <>
                  <polyline className="hc-climb__route-shadow" points={CLIMB_ROUTE} />
                  <polyline className="hc-climb__route" points={CLIMB_ROUTE} />
                  <polyline
                    className="hc-climb__route-progress"
                    points={CLIMB_ROUTE}
                    pathLength="100"
                    style={{ strokeDasharray: `${progress} ${Math.max(0, 100 - progress)}` }}
                  />
                  <polyline className="hc-climb__route-flow" points={CLIMB_ROUTE} pathLength="100" />

                  <g className="hc-climb__marker" transform={`translate(${marker.x} ${marker.y})`}>
                    <circle r="12" />
                    <circle r="6.5" />
                    <circle r="2.5" />
                  </g>
                </>
              )}
            </svg>

            <span className="hc-climb__corner is-top-left" aria-hidden="true" />
            <span className="hc-climb__corner is-top-right" aria-hidden="true" />
            <span className="hc-climb__corner is-bottom-left" aria-hidden="true" />
            <span className="hc-climb__corner is-bottom-right" aria-hidden="true" />

            {isLeader ? (
              <>
                <span className="hc-climb__rank-watermark is-leader" aria-hidden="true">1</span>
                <article className="hc-climb-leader">
                  <Crown className="hc-climb-leader__crown" size={34} fill="currentColor" aria-hidden="true" />
                  <ClimbPortrait entry={viewer} tone="leader" eager onOpen={() => onOpenAthlete(viewer)} />
                  <p className="hc-climb-leader__points">{formatPoints(viewer.points)} pts</p>
                  <p className="hc-climb-leader__message">Defenda a liderança</p>
                </article>
              </>
            ) : (
              <>
                <span className="hc-climb__rank-watermark is-target" aria-hidden="true">1</span>
                <span className="hc-climb__rank-watermark is-viewer" aria-hidden="true">2</span>

                <article className="hc-climb-athlete is-target">
                  <span className="hc-climb-athlete__label">ALVO</span>
                  <ClimbPortrait entry={target} tone="target" eager onOpen={() => onOpenAthlete(target)} />
                  <div className="hc-climb-athlete__score">
                    <span>{formatPoints(target?.points || 0)} pts</span>
                  </div>
                </article>

                <div className="hc-climb__gap">
                  <strong>{formatPoints(pointsGap)} pts</strong>
                  <span>para alcançar</span>
                </div>

                <div className="hc-climb__progress-label">
                  <strong>{progress}%</strong>
                  <span aria-hidden="true" />
                </div>

                <article className="hc-climb-athlete is-viewer">
                  <span className="hc-climb-athlete__label">VOCÊ</span>
                  <ClimbPortrait entry={viewer} tone="viewer" eager onOpen={() => onOpenAthlete(viewer)} />
                  <div className="hc-climb-athlete__score">
                    <span>{formatPoints(viewer.points)} pts</span>
                  </div>
                </article>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function PodiumBlock({ entry, place, onOpenAthlete }) {
  const champion = place === 1;
  const podiumClass = champion ? 'is-first' : place === 2 ? 'is-second' : 'is-third';
  if (!entry) return <div aria-hidden="true" className={`hc-podium-block ${podiumClass}`} />;

  return (
    <article className={`hc-podium-block ${podiumClass}`}>
      <div className="hc-podium-block__athlete">
        {champion && <Crown className="hc-podium-block__crown" size={20} fill="currentColor" aria-hidden="true" />}
        <PodiumPortrait entry={entry} place={place} eager={champion} onOpen={() => onOpenAthlete(entry)} />
        <p className="mt-2 w-full truncate text-center text-[0.75rem] font-extrabold text-[var(--arena-text)]">{entry.display_name}</p>
        <p className={`mt-0.5 text-center text-[0.6875rem] font-bold tabular-nums ${champion ? 'text-[var(--arena-ember)]' : place === 2 ? 'text-[var(--arena-cyan)]' : 'text-[var(--arena-violet)]'}`}>
          {formatPoints(entry.points)} pts
        </p>
      </div>
    </article>
  );
}

const EFFORT_CONTOURS = [
  'M-18 178 C20 140 48 162 78 132 C105 106 121 124 143 108 C162 94 159 62 188 48 C220 32 232 82 251 102 C274 126 295 104 320 127 C341 146 358 139 382 163',
  'M-14 158 C25 126 47 145 75 118 C101 93 120 112 143 94 C162 79 162 50 188 38 C216 25 229 67 249 88 C273 113 298 92 324 116 C345 134 361 130 378 145',
  'M6 139 C36 113 55 126 79 104 C103 82 121 99 143 80 C161 64 164 38 188 28 C211 18 224 52 246 75 C268 97 295 77 320 99 C337 114 350 114 368 125',
  'M28 122 C49 105 63 110 82 92 C102 73 122 89 143 68 C159 52 168 29 189 22 C207 17 221 43 242 62 C263 82 286 65 308 83 C321 94 334 97 347 101',
  'M44 105 C61 92 72 96 88 80 C105 64 123 78 142 58 C157 43 170 27 189 24 C204 22 219 42 237 55 C257 70 274 57 293 69 C303 75 315 81 324 82',
  'M64 89 C76 82 84 84 95 73 C110 58 125 69 142 51 C157 35 174 27 190 29 C203 30 216 44 230 52 C245 61 258 55 272 59 C282 62 290 69 299 70',
];

function ArenaPodium({ podium, onOpenAthlete }) {
  return (
    <section className="mt-5" aria-labelledby="podium-title">
      <div className="hc-arena-section-heading">
        <Trophy size={18} className="text-[var(--arena-ember)]" aria-hidden="true" />
        <h2 id="podium-title">Pódio da Arena</h2>
      </div>
      <div className="hc-arena-podium">
        <div className="hc-arena-podium__dome" aria-hidden="true" />
        <Podium3D />
        <div className="hc-arena-podium__platform">
          <PodiumBlock entry={podium[1]} place={2} onOpenAthlete={onOpenAthlete} />
          <PodiumBlock entry={podium[0]} place={1} onOpenAthlete={onOpenAthlete} />
          <PodiumBlock entry={podium[2]} place={3} onOpenAthlete={onOpenAthlete} />
        </div>
      </div>
    </section>
  );
}

function Movement({ previousRank, currentRank, isViewer = false, isTarget = false }) {
  if (!previousRank || previousRank === currentRank) {
    return <span className={isViewer ? 'text-white/72' : isTarget ? 'text-[var(--arena-gold)]' : 'text-[#667085]'}>-</span>;
  }
  const delta = previousRank - currentRank;
  return delta > 0 ? (
    <span className={`flex items-center gap-0.5 font-bold ${isViewer ? 'text-white' : 'text-[var(--arena-ember)]'}`} aria-label={`Subiu ${delta} posicoes`}>
      <TrendingUp size={13} aria-hidden="true" /> {delta}
    </span>
  ) : (
    <span className={`flex items-center gap-0.5 font-bold ${isViewer ? 'text-white/78' : 'text-[#5E83FF]'}`} aria-label={`Desceu ${Math.abs(delta)} posicoes`}>
      <TrendingDown size={13} aria-hidden="true" /> {Math.abs(delta)}
    </span>
  );
}

function RankingRow({ entry, isTarget = false, onOpenAthlete }) {
  return (
    <div className={`hc-ranking-row ${entry.is_viewer ? 'is-viewer' : ''} ${isTarget ? 'is-target' : ''}`}>
      <span className="text-center text-[1rem] font-extrabold tabular-nums">{entry.rank}</span>
      <span className="flex justify-center text-[0.6875rem]">
        <Movement previousRank={entry.previous_rank} currentRank={entry.rank} isViewer={entry.is_viewer} isTarget={isTarget} />
      </span>
      <button
        type="button"
        className="hc-ranking-row__avatar-button"
        onClick={() => onOpenAthlete(entry)}
        aria-label={`Ver perfil de ${entry.display_name}`}
      >
        <RankAvatar name={entry.display_name} photoUrl={entry.avatar_url} frame={entry.avatar_frame} size={36} />
      </button>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[0.9375rem] font-extrabold">{entry.is_viewer ? 'VOCE' : entry.display_name}</p>
          {entry.title && <Sparkles size={12} className={entry.is_viewer ? 'text-white' : 'text-[var(--arena-ember)]'} aria-label={entry.title} />}
        </div>
        <p className={`mt-0.5 flex items-center gap-1 text-[0.6875rem] font-semibold ${entry.is_viewer ? 'text-white/76' : isTarget ? 'text-[#FF9BC2]' : 'text-[var(--arena-muted)]'}`}>
          <Flame size={10} aria-hidden="true" /> {entry.streak || 0} dias - {entry.month_days || 0} treinos
        </p>
      </div>
      <div className="flex min-w-[72px] flex-col items-end gap-1">
        <strong className="text-right text-[0.9375rem] font-extrabold tabular-nums">{formatPoints(entry.points)} pts</strong>
        {isTarget && <span className="rounded-[7px] border border-[rgb(255_106_61_/_0.6)] bg-[rgb(255_106_61_/_0.14)] px-2 py-0.5 text-[0.625rem] font-extrabold text-[var(--arena-ember)]">ALVO</span>}
      </div>
    </div>
  );
}

function RankingList({ ranking, viewer, athleteAhead, onOpenAthlete }) {
  const [expanded, setExpanded] = useState(false);
  const rest = ranking.slice(3);
  const compact = useMemo(() => {
    if (expanded || rest.length <= 10) return rest;
    const first = rest.slice(0, 6);
    if (!viewer || viewer.rank <= 10) return first;
    const aroundViewer = rest.filter((entry) => Math.abs(entry.rank - viewer.rank) <= 1);
    return [...new Map([...first, ...aroundViewer].map((entry) => [entry.user_id, entry])).values()]
      .sort((a, b) => a.rank - b.rank);
  }, [expanded, rest, viewer]);

  if (rest.length === 0) return null;

  return (
    <section className="mt-6" aria-labelledby="global-ranking-title">
      <div className="hc-arena-section-heading">
        <TrendingUp size={18} className="text-[var(--arena-cyan)]" aria-hidden="true" />
        <h2 id="global-ranking-title">Ranking global</h2>
      </div>
      <div className="hc-ranking-table">
        {compact.map((entry) => (
          <RankingRow
            key={entry.user_id}
            entry={entry}
            isTarget={Boolean(athleteAhead && entry.user_id === athleteAhead.user_id)}
            onOpenAthlete={onOpenAthlete}
          />
        ))}
      </div>
      {rest.length > 10 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-[12px] text-[0.75rem] font-bold text-[var(--arena-cyan)] transition-colors hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--arena-cyan)] active:bg-white/7"
          aria-expanded={expanded}
        >
          {expanded ? 'Mostrar menos' : `Ver todos os ${rest.length} atletas`}
          <ChevronDown size={15} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      )}
    </section>
  );
}

function AchievementDetail({ badge, unlocked, onClose, context }) {
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
          <Achievement3D kind={badge.kind} geometry={badge.geometry} unlocked={unlocked} label={badge.label} />
          <span className={`hc-achievement-dialog__status ${unlocked ? 'is-earned' : ''}`}>
            {unlocked ? <Icon size={13} aria-hidden="true" /> : <LockKeyhole size={13} aria-hidden="true" />}
            {unlocked ? 'Conquistada' : 'Bloqueada'}
          </span>
        </div>
        <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[var(--arena-pink-text)]">Medalha da Arena</p>
          <h2 id="achievement-detail-title" className="mt-1 text-[1.5rem] font-extrabold text-[var(--arena-text)]">{badge.label}</h2>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--arena-muted)]">{badge.description}</p>
          {badge.reward && (
            <div className="mt-4 flex items-center gap-2 border-y border-[var(--arena-border)] py-3 text-[var(--arena-cyan)]">
              <Sparkles size={16} aria-hidden="true" />
              <span className="text-[0.6875rem] font-semibold text-[var(--arena-muted)]">Recompensa exclusiva</span>
              <strong className="ml-auto text-[0.75rem] font-extrabold">{badge.reward}</strong>
            </div>
          )}
          {context?.latestSeasonLabel && (
            <p className="mt-3 text-[0.75rem] font-bold text-[var(--arena-pink-text)]">
              Última conquista: {context.latestSeasonLabel}
              {context.timesEarned > 1 ? ` · ${context.timesEarned} vezes` : ''}
            </p>
          )}
          <div className="mt-5 border-t border-[var(--arena-border)] pt-4">
            <p className="text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[var(--arena-muted)]">Como conquistar</p>
            <p className="mt-1.5 text-[0.8125rem] font-semibold leading-relaxed text-[var(--arena-text)]">{badge.criteria}</p>
          </div>
          <p className="mt-4 text-center text-[0.625rem] font-medium text-[var(--arena-muted)]">Arraste a medalha para observar todos os angulos.</p>
        </div>
      </div>
    </dialog>
  );
}

function AthleteAchievementPopup({ athlete, history, userId, onClose, onInspectBadge }) {
  const dialogRef = React.useRef(null);
  const isViewer = Boolean(athlete?.is_viewer || athlete?.user_id === userId);
  const fallback = useMemo(
    () => buildFallbackShowcase(athlete, history, isViewer),
    [athlete, history, isViewer],
  );
  const [achievements, setAchievements] = useState(fallback);
  const [loading, setLoading] = useState(isSupabaseConfigured);

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

  useEffect(() => {
    let active = true;
    setAchievements(fallback);
    if (!isSupabaseConfigured || !athlete?.user_id) {
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    supabase
      .rpc('get_athlete_achievement_showcase', { p_user_id: athlete.user_id })
      .then(({ data, error }) => {
        if (!active) return;
        const normalized = error ? [] : normalizeAchievementShowcase(data || []);
        if (normalized.length > 0) setAchievements(normalized);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [athlete?.user_id, fallback]);

  const totalMedals = achievements.reduce((sum, achievement) => sum + achievement.timesEarned, 0);

  return (
    <dialog
      ref={dialogRef}
      className="hc-athlete-popup"
      aria-labelledby="athlete-popup-title"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="hc-athlete-popup__surface">
        <button type="button" onClick={onClose} className="hc-athlete-popup__close" aria-label="Fechar perfil da Arena">
          <X size={17} aria-hidden="true" />
        </button>

        <header className="hc-athlete-popup__header">
          <div className="hc-athlete-popup__crest">
            <ClimbPortrait entry={athlete} tone={athlete.rank === 1 ? 'leader' : 'viewer'} size={58} eager />
          </div>
          <div className="hc-athlete-popup__identity">
            <p>Perfil da Arena</p>
            <h2 id="athlete-popup-title">
              {athlete.display_name}
            </h2>
            <p className="hc-athlete-popup__meta">
              #{athlete.rank} · {athlete.division || 'Desafiante'} · {formatPoints(athlete.points)} pts
            </p>
          </div>
        </header>

        <section className="hc-athlete-popup__profile" aria-label={`Apresentação de ${athlete.display_name}`}>
          <div className="hc-athlete-popup__goal">
            <Target size={14} aria-hidden="true" />
            <span>Objetivo</span>
            <strong>{getPrimaryGoalLabel(athlete.primary_goal)}</strong>
          </div>
          <p className={athlete.bio ? '' : 'is-empty'}>
            {athlete.bio || 'Bio ainda não informada.'}
          </p>
        </section>

        <section className="hc-athlete-popup__collection" aria-label={`Medalhas conquistadas por ${athlete.display_name}`}>
          <div className="hc-athlete-popup__collection-title">
            <h3>Medalhas conquistadas</h3>
            <p>{totalMedals} {totalMedals === 1 ? 'conquista' : 'conquistas'}</p>
            {loading && <LoaderCircle className="hc-athlete-popup__loader" size={15} aria-label="Atualizando medalhas" />}
          </div>

          {achievements.length > 0 ? (
            <div className="hc-athlete-popup__medal-grid">
              {achievements.map((achievement) => {
                const badge = BADGE_BY_KEY.get(achievement.key);
                const Icon = badge.Icon;
                return (
                  <button
                    key={achievement.key}
                    type="button"
                    className={`hc-athlete-popup__medal is-${achievement.key} geometry-${badge.geometry}`}
                    onClick={() => onInspectBadge(badge, achievement)}
                    aria-label={`Ver medalha ${badge.label} em 3D`}
                  >
                    <span className="hc-athlete-popup__medal-mark" aria-hidden="true">
                      <Icon size={18} strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0">
                      <strong>{badge.label}</strong>
                      <small>{achievement.latestSeasonLabel}</small>
                    </span>
                    {achievement.timesEarned > 1 && <em>×{achievement.timesEarned}</em>}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="hc-athlete-popup__empty">
              <Medal size={20} aria-hidden="true" />
              <p>{loading ? 'Buscando conquistas...' : 'Nenhuma medalha conquistada ainda.'}</p>
            </div>
          )}
        </section>

        {achievements.length > 0 && (
          <p className="hc-athlete-popup__hint">Toque em uma medalha para observar em 3D.</p>
        )}
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
    <section className="mt-6" aria-labelledby="achievements-title">
      <div className="hc-arena-section-heading hc-arena-section-heading--with-meta">
        <Medal size={18} className="text-[var(--arena-cyan)]" aria-hidden="true" />
        <h2 id="achievements-title">Conquistas</h2>
        <span>{earned.size}/{BADGE_CATALOG.length}</span>
      </div>
      <div className="hc-achievement-rail -mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {BADGE_CATALOG.map((badge) => {
          const { key, label, detail, Icon } = badge;
          const unlocked = earned.has(badge.key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedBadge(badge)}
              className={`hc-achievement-card geometry-${badge.geometry} ${unlocked ? 'is-earned' : ''}`}
              aria-label={`${label}: ${unlocked ? 'conquistada' : 'bloqueada'}. Abrir detalhes.`}
            >
              <span className="hc-achievement-card__medal" aria-hidden="true">
                <span className="hc-achievement-card__rim">
                  {unlocked ? <Icon size={24} strokeWidth={1.9} /> : <LockKeyhole size={21} strokeWidth={2} />}
                </span>
              </span>
              <span className={`mt-3 block text-center text-[0.6875rem] font-bold leading-tight ${unlocked ? 'text-[var(--arena-text)]' : 'text-[var(--arena-muted)]'}`}>{label}</span>
              <span className="mt-1 block text-center text-[0.625rem] font-medium text-[var(--arena-muted)]">{detail}</span>
              <span className="mt-1.5 block text-center text-[0.625rem] font-bold leading-tight text-[var(--arena-cyan)]">
                Libera {badge.reward}
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
      <h2 id="history-title" className="hc-arena-subsection-title">Temporadas anteriores</h2>
      <div className="mt-3 space-y-2">
        {history.slice(0, 3).map((season) => (
          <div key={season.season_start} className="flex items-center gap-3 rounded-[14px] bg-[var(--arena-panel)] px-3.5 py-3 ring-1 ring-[var(--arena-border)]">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[rgb(255_106_61_/_0.12)] text-[var(--arena-ember)]">
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
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-[0.75rem] font-bold text-[var(--arena-cyan)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--arena-cyan)]">
        Como os pontos funcionam
        <ChevronDown size={15} aria-hidden="true" />
      </summary>
      <div className="grid gap-2 border-t border-[var(--arena-border)] py-3 text-[0.6875rem] font-medium text-[var(--arena-muted)]">
        <p><strong className="text-[var(--arena-text)]">{rules.trainingDay} pontos</strong> por dia com treino salvo.</p>
        <p><strong className="text-[var(--arena-text)]">{rules.activeStreakDay} pontos</strong> por dia de sequencia ativa.</p>
        <p><strong className="text-[var(--arena-text)]">{rules.workoutVariety} pontos</strong> por ficha diferente no mes.</p>
      </div>
    </details>
  );
}

function RankingSkeleton() {
  return (
    <div className="hc-ranking-arena -mx-5 -mt-10 min-h-[calc(100dvh-8rem)] px-5 pb-32 pt-5" aria-label="Carregando ranking">
      <div className="animate-pulse">
        <div className="flex justify-between">
          <div className="h-10 w-44 rounded-[10px] bg-[var(--arena-skeleton)]" />
          <div className="h-5 w-20 rounded bg-[var(--arena-skeleton)]" />
        </div>
        <div className="mt-5 h-48 rounded-[16px] bg-[var(--arena-skeleton)]" />
        <div className="mt-8 h-64 rounded-[16px] bg-[var(--arena-skeleton)]" />
        <div className="mt-7 space-y-2">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-14 rounded-[12px] bg-[var(--arena-skeleton)]" />)}
        </div>
      </div>
    </div>
  );
}

function RankingError({ message, onRetry }) {
  return (
    <div className="hc-ranking-arena -mx-5 -mt-10 flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center px-8 pb-32 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[rgb(255_106_61_/_0.12)] text-[var(--arena-ember)]">
        <Trophy size={22} aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-[1rem] font-bold">O ranking nao carregou</h1>
      <p className="mt-2 max-w-[30ch] text-[0.8125rem] leading-relaxed text-[var(--arena-muted)]">{message}</p>
      <button type="button" onClick={onRetry} className="mt-5 flex min-h-11 items-center gap-2 rounded-[12px] bg-[var(--arena-cyan)] px-5 text-[0.8125rem] font-bold text-[#041014] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--arena-cyan)] active:scale-[0.98]">
        <RefreshCw size={15} aria-hidden="true" /> Tentar novamente
      </button>
    </div>
  );
}

export default function RankingPage({ userId, viewerAvatarUrl = '', viewerProfile = {}, avatarRefreshKey = 0 }) {
  const [ranking, setRanking] = useState([]);
  const [history, setHistory] = useState([]);
  const [rules, setRules] = useState(RANKING_SCORING);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [selectedProfileBadge, setSelectedProfileBadge] = useState(null);
  const [showSeasonTrophy, setShowSeasonTrophy] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const run = async ({ quiet = false } = {}) => {
      if (!isSupabaseConfigured) {
        if (isMounted) {
          setError('O Supabase nao esta configurado neste ambiente.');
          setLoading(false);
        }
        return;
      }

      if (!quiet) setLoading(true);
      try {
        const [{ data, error: rankingError }, historyResponse, rulesResponse, profileShowcaseResponse] = await Promise.all([
          supabase.rpc('get_monthly_ranking', { p_viewer_id: userId || null }),
          supabase.rpc('get_ranking_season_history', { p_viewer_id: userId || null }),
          supabase.rpc('get_ranking_rules'),
          supabase.rpc('get_ranking_profile_showcase'),
        ]);
        if (rankingError) throw rankingError;
        if (!isMounted) return;
        const showcaseByUser = new Map(
          (profileShowcaseResponse.error ? [] : (profileShowcaseResponse.data || []))
            .map((row) => [row.user_id, normalizeRankingProfile(row)])
        );
        const localViewerProfile = normalizeRankingProfile(viewerProfile);
        const normalizedRanking = normalizeRanking(data || [], userId, viewerAvatarUrl, viewerProfile)
          .map((entry) => ({
            ...entry,
            ...(showcaseByUser.get(entry.user_id) || {}),
            ...(entry.is_viewer ? localViewerProfile : {}),
          }));
        setRanking(normalizedRanking);
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
        if (isMounted) setError(requestError?.message || 'Confira sua conexao e tente novamente.');
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
  }, [
    userId,
    viewerAvatarUrl,
    viewerProfile?.avatar_frame,
    viewerProfile?.bio,
    viewerProfile?.primary_goal,
    avatarRefreshKey,
    refreshKey,
  ]);

  const viewer = ranking.find((entry) => entry.is_viewer || entry.user_id === userId) || null;
  const podium = ranking.slice(0, 3);
  const athleteAhead = viewer?.rank > 1 ? ranking[viewer.rank - 2] : null;
  const now = new Date();
  const monthLength = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = monthLength - now.getDate();
  const monthProgress = Math.min(100, Math.max(1, Math.round((now.getDate() / monthLength) * 100)));

  if (loading) return <RankingSkeleton />;
  if (error && ranking.length === 0) return <RankingError message={error} onRetry={() => setRefreshKey((value) => value + 1)} />;

  return (
    <div className="hc-ranking-arena relative -mx-5 -mt-10 min-h-[calc(100dvh-8rem)] overflow-hidden px-5 pb-32 pt-5">
      <div className="hc-ranking-arena__light" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-[430px]">
        <SeasonHeader
          daysRemaining={daysRemaining}
          monthProgress={monthProgress}
          onOpenTrophy={() => setShowSeasonTrophy(true)}
        />

        {ranking.length === 0 ? (
          <section className="mt-8 rounded-[16px] bg-[var(--arena-panel)] px-5 py-12 text-center ring-1 ring-[var(--arena-border)]">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] bg-[rgb(255_106_61_/_0.12)] text-[var(--arena-ember)]">
              <Trophy size={22} aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-[1rem] font-bold">A temporada comeca com o primeiro treino</h2>
            <p className="mx-auto mt-2 max-w-[30ch] text-[0.8125rem] leading-relaxed text-[var(--arena-muted)]">
              Salve uma sessao de forca ou corrida para entrar na Arena de {MONTH_NAMES[now.getMonth()]}.
            </p>
          </section>
        ) : (
          <>
            <ArenaDuel viewer={viewer} athleteAhead={athleteAhead} onOpenAthlete={setSelectedAthlete} />
            <ArenaPodium podium={podium} onOpenAthlete={setSelectedAthlete} />
            <RankingList
              ranking={ranking}
              viewer={viewer}
              athleteAhead={athleteAhead}
              onOpenAthlete={setSelectedAthlete}
            />
            <AchievementRail viewer={viewer} history={history} />
            <SeasonHistory history={history} />
            <RankingRules rules={rules} />
          </>
        )}
      </div>
      {selectedAthlete && (
        <AthleteAchievementPopup
          athlete={selectedAthlete}
          history={history}
          userId={userId}
          onClose={() => setSelectedAthlete(null)}
          onInspectBadge={(badge, context) => {
            setSelectedAthlete(null);
            setSelectedProfileBadge({ badge, context });
          }}
        />
      )}
      {selectedProfileBadge && (
        <AchievementDetail
          badge={selectedProfileBadge.badge}
          context={selectedProfileBadge.context}
          unlocked
          onClose={() => setSelectedProfileBadge(null)}
        />
      )}
      {showSeasonTrophy && (
        <SeasonTrophyDialog
          month={MONTH_NAMES[now.getMonth()]}
          year={now.getFullYear()}
          leader={ranking[0] || null}
          daysRemaining={daysRemaining}
          onClose={() => setShowSeasonTrophy(false)}
        />
      )}
    </div>
  );
}

export { BRAND_PINK, BRAND_BLUE };
