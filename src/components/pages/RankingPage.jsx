import React, { useEffect, useState } from 'react';
import { Crown, Flame, Trophy } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const MEDAL_STYLES = {
  1: {
    chip: 'bg-[#D0FD3E] text-[#0A0D14]',
    ring: 'ring-[#D0FD3E] ring-offset-[#F5F7FB] dark:ring-offset-[#0A0D14]',
    glow: 'shadow-[0_18px_36px_rgba(208,253,62,0.22)]',
    score: 'text-[#0A3CFF] dark:text-[#D0FD3E]',
  },
  2: {
    chip: 'bg-[#E5E5EA] text-[#111827] dark:bg-white/18 dark:text-white',
    ring: 'ring-[#AEB4C2] ring-offset-[#F5F7FB] dark:ring-offset-[#0A0D14]',
    glow: 'shadow-[0_14px_28px_rgba(10,60,255,0.14)]',
    score: 'text-[#0A3CFF] dark:text-white',
  },
  3: {
    chip: 'bg-[#0A3CFF] text-white',
    ring: 'ring-[#0A3CFF] ring-offset-[#F5F7FB] dark:ring-offset-[#0A0D14]',
    glow: 'shadow-[0_14px_28px_rgba(10,60,255,0.2)]',
    score: 'text-[#0A3CFF] dark:text-white',
  },
};

const getRankPoints = (entry) =>
  Number(entry?.points ?? ((entry?.month_days || 0) * 100 + (entry?.streak || 0) * 25 + getWorkoutVariety(entry) * 10)) || 0;

const getWorkoutVariety = (entry) => {
  if (entry?.workout_variety != null) return Number(entry.workout_variety) || 0;
  return entry?.month_days > 0 ? 1 : 0;
};

function getInitials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function RankAvatar({ name, photoUrl, size = 44, className = '' }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [photoUrl]);

  if (photoUrl && !imageFailed) {
    return (
      <img
        src={photoUrl}
        alt={name}
        loading="lazy"
        decoding="async"
        onError={() => setImageFailed(true)}
        className={`block rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-[#0A3CFF] font-semibold text-white ring-1 ring-white/35 dark:bg-white/12 dark:ring-white/12 ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
    >
      {getInitials(name)}
    </div>
  );
}

function YouBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-[#0A3CFF]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#0A3CFF] ring-1 ring-[#0A3CFF]/12 dark:bg-[#D0FD3E]/12 dark:text-[#D0FD3E] dark:ring-[#D0FD3E]/18">
      Você
    </span>
  );
}

function PodiumStep({ entry, place, isViewer }) {
  const isChampion = place === 1;
  const style = MEDAL_STYLES[place];
  const avatarSize = isChampion ? 88 : 66;
  const points = getRankPoints(entry);

  if (!entry) {
    return (
      <div className={`flex flex-col items-center ${isChampion ? 'pb-0' : 'pb-4'}`}>
        <div className="mb-2 flex min-h-[38px] flex-col items-center justify-end">
          <span className="rounded-full bg-black/5 px-2 py-1 text-[10px] font-semibold text-black/45 dark:bg-white/8 dark:text-white/45">
            {place}
          </span>
        </div>
        <div
          className="rounded-full border border-dashed border-black/10 bg-white/45 dark:border-white/12 dark:bg-white/[0.05]"
          style={{ width: avatarSize, height: avatarSize }}
        />
      </div>
    );
  }

  return (
    <div className={`relative flex min-w-0 flex-col items-center ${isChampion ? 'pb-0' : 'pb-4'}`}>
      <div className="mb-2 flex min-h-[38px] flex-col items-center justify-end">
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${style.chip}`}>
          #{place}
        </span>
        {isChampion && (
          <Crown
            className="mt-1 text-[#D0FD3E] drop-shadow-[0_5px_10px_rgba(208,253,62,0.24)]"
            size={30}
            fill="currentColor"
            strokeWidth={1.7}
          />
        )}
      </div>

      <div className={`relative rounded-full p-1.5 ring-2 ring-offset-4 ${style.ring} ${style.glow}`}>
        <RankAvatar name={entry.display_name} photoUrl={entry.avatar_url} size={avatarSize} />
        {isViewer && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2">
            <YouBadge />
          </span>
        )}
      </div>

      <p className="mt-3 max-w-[96px] truncate text-center text-[11px] font-semibold leading-tight text-[#111827]/82 dark:text-white/84">
        {entry.display_name}
      </p>
      <p className={`mt-1 font-semibold leading-none tracking-[-0.02em] ${isChampion ? 'text-[24px]' : 'text-[20px]'} ${style.score}`}>
        {points}
      </p>
      <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] dark:text-white/38">
        pts
      </p>
      <p className="mt-1 text-[9px] font-medium text-[#64748B] dark:text-white/40">
        {entry.month_days} dia{entry.month_days === 1 ? '' : 's'}
      </p>
    </div>
  );
}

function RankRow({ entry, isViewer }) {
  const idle = entry.month_days === 0;
  const points = getRankPoints(entry);
  const variety = getWorkoutVariety(entry);

  return (
    <div className={`flex min-h-[60px] items-center gap-3 rounded-[20px] border px-3 py-2.5 backdrop-blur-xl transition-transform duration-200 active:scale-[0.99] ${
      isViewer
        ? 'border-[#0A3CFF]/22 bg-[#0A3CFF]/8 shadow-[0_14px_30px_rgba(10,60,255,0.10)] dark:border-[#D0FD3E]/18 dark:bg-[#D0FD3E]/10'
        : 'border-white/70 bg-white/72 shadow-[0_12px_30px_rgba(14,23,42,0.07)] dark:border-white/8 dark:bg-white/[0.07] dark:shadow-none'
    } ${idle ? 'opacity-55' : ''}`}>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
        entry.rank <= 3
          ? 'bg-[#0A3CFF] text-white dark:bg-[#D0FD3E] dark:text-[#0A0D14]'
          : 'bg-black/5 text-[#374151] dark:bg-white/8 dark:text-white/70'
      }`}>
        {entry.rank}
      </span>
      <RankAvatar name={entry.display_name} photoUrl={entry.avatar_url} size={38} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`truncate text-[13px] font-semibold ${idle ? 'text-[#6B7280]' : 'text-[#111827] dark:text-white/88'}`}>
            {entry.display_name}
          </p>
          {isViewer && <YouBadge />}
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-[#64748B] dark:text-white/46">
          {entry.streak > 0 ? (
            <>
              <Flame size={10} strokeWidth={2.2} className="text-[#0A3CFF] dark:text-[#D0FD3E]" />
              {entry.streak} dia{entry.streak === 1 ? '' : 's'} em sequência
              {variety > 0 && <span className="text-[#94A3B8] dark:text-white/30">+ {variety} ficha{variety === 1 ? '' : 's'}</span>}
            </>
          ) : (
            <span>{entry.month_days > 0 ? `${entry.month_days} dia${entry.month_days === 1 ? '' : 's'} treinado${entry.month_days === 1 ? '' : 's'}` : 'Sem sequência ativa'}</span>
          )}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-[15px] font-semibold leading-none tracking-[-0.01em] ${idle ? 'text-[#8A8F98] dark:text-white/38' : 'text-[#0A3CFF] dark:text-[#D0FD3E]'}`}>
          {points}
        </p>
        <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#8A8F98] dark:text-white/34">
          pts
        </p>
      </div>
    </div>
  );
}

function RankingSkeleton() {
  return (
    <div className="-mx-5 -mt-5 min-h-[calc(100dvh-9rem)] rounded-t-[30px] bg-[#F5F7FB] px-5 pb-28 pt-5 text-[#111827] dark:bg-[#0A0D14] dark:text-white">
      <header className="mb-5 flex items-center justify-between">
        <div className="h-5 w-28 animate-pulse rounded-lg bg-black/8 dark:bg-white/10" />
        <div className="h-7 w-20 animate-pulse rounded-full bg-black/8 dark:bg-white/10" />
      </header>
      <div className="rounded-[30px] border border-white/70 bg-white/70 px-3 py-5 dark:border-white/8 dark:bg-white/[0.06]">
        <div className="grid grid-cols-3 items-end gap-1">
          {[66, 88, 66].map((size, i) => (
            <div key={i} className="flex flex-col items-center justify-end">
              <div className="mb-2 h-6 w-8 animate-pulse rounded-full bg-black/8 dark:bg-white/10" />
              <div className="animate-pulse rounded-full bg-black/8 dark:bg-white/10" style={{ width: size, height: size }} />
              <div className="mt-3 h-3 w-16 animate-pulse rounded bg-black/8 dark:bg-white/10" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex min-h-[60px] items-center gap-3 rounded-[20px] bg-white/70 px-3 py-2.5 dark:bg-white/[0.06]">
            <div className="h-7 w-7 animate-pulse rounded-full bg-black/8 dark:bg-white/10" />
            <div className="h-10 w-10 animate-pulse rounded-full bg-black/8 dark:bg-white/10" />
            <div className="flex-1">
              <div className="h-4 w-32 animate-pulse rounded bg-black/8 dark:bg-white/10" />
              <div className="mt-1.5 h-3 w-24 animate-pulse rounded bg-black/8 dark:bg-white/10" />
            </div>
            <div className="h-6 w-8 animate-pulse rounded bg-black/8 dark:bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RankingPage({ userId, viewerAvatarUrl = '', avatarRefreshKey = 0 }) {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!isSupabaseConfigured) {
        if (isMounted) { setError('config'); setLoading(false); }
        return;
      }
      try {
        const { data, error: rpcError } = await supabase.rpc('get_monthly_ranking', {
          p_viewer_id: userId || null,
        });
        if (!isMounted) return;
        if (rpcError) throw rpcError;
        setRanking((data || []).map((entry) => (
          (entry.is_viewer || entry.user_id === userId) && viewerAvatarUrl && !entry.avatar_url
            ? { ...entry, avatar_url: viewerAvatarUrl }
            : entry
        )));
        setError(null);
      } catch (e) {
        if (isMounted) setError(e?.message || 'unknown');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    run();

    const onVisible = () => { if (!document.hidden) run(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', run);
    const syncTimer = window.setInterval(run, 30000);
    const profileChannel = supabase
      .channel('ranking-profile-avatar-sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, run)
      .subscribe();

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', run);
      window.clearInterval(syncTimer);
      supabase.removeChannel(profileChannel);
    };
  }, [userId, viewerAvatarUrl, avatarRefreshKey]);

  const monthLabel = MONTH_NAMES[new Date().getMonth()];
  const podium = ranking.slice(0, 3);
  const rest = ranking.slice(3);
  const viewer = ranking.find((r) => r.is_viewer || r.user_id === userId) || null;
  const viewerInPodium = viewer && viewer.rank <= 3;
  const showViewerCard = Boolean(viewer && !viewerInPodium);
  const podiumTarget = getRankPoints(podium[2]);
  const viewerPoints = getRankPoints(viewer);
  const pointsToPodium = Math.max(0, podiumTarget - viewerPoints);
  const progressPct = podiumTarget > 0
    ? Math.min(100, Math.round((viewerPoints / podiumTarget) * 100))
    : 0;

  if (loading) return <RankingSkeleton />;

  return (
    <div className={`relative -mx-5 -mt-5 min-h-[calc(100dvh-9rem)] overflow-hidden rounded-t-[30px] bg-[#F5F7FB] px-5 pt-5 text-[#111827] dark:bg-[#0A0D14] dark:text-white ${showViewerCard ? 'pb-56' : 'pb-28'}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-7%,rgba(10,60,255,0.20),transparent_16rem),radial-gradient(circle_at_90%_18%,rgba(208,253,62,0.16),transparent_12rem)] dark:bg-[radial-gradient(circle_at_50%_-7%,rgba(10,60,255,0.30),transparent_16rem),radial-gradient(circle_at_90%_18%,rgba(208,253,62,0.10),transparent_12rem)]" />
      <div className="pointer-events-none absolute left-1/2 top-[108px] h-28 w-[82%] -translate-x-1/2 rounded-[999px] border border-[#0A3CFF]/12 dark:border-white/8" />
      <div className="pointer-events-none absolute left-1/2 top-[132px] h-20 w-[64%] -translate-x-1/2 rounded-[999px] border border-[#D0FD3E]/30 opacity-70 dark:border-[#D0FD3E]/16" />

      <div className="relative">
        {error && (
          <div className="mb-4 rounded-[18px] border border-amber-400/24 bg-amber-300/16 px-4 py-3 text-[13px] text-amber-950 dark:text-amber-100">
            {error === 'config'
              ? 'O Supabase não está configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.'
              : (
                <>
                  <p className="font-semibold">Não foi possível carregar o ranking.</p>
                  <p className="mt-1 text-[12px] opacity-80">Detalhe do erro: {error}</p>
                  <p className="mt-1 text-[12px] opacity-80">
                    Se a função acabou de ser criada, aguarde alguns segundos e recarregue. O Supabase pode precisar recarregar o cache de schema.
                  </p>
                </>
              )}
          </div>
        )}

        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="hc-label text-[#0A3CFF] dark:text-[#D0FD3E]">HÍBRIDO DE VERDADE</p>
            <h2 className="mt-1 text-[21px] font-semibold tracking-[-0.02em] text-[#111827] dark:text-white">
              Ranking mensal
            </h2>
            <p className="mt-0.5 text-[11px] font-medium text-[#64748B] dark:text-white/48">
              {monthLabel} · 100 por dia, 25 por sequência
            </p>
          </div>
          <div className="rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-[#0A3CFF] ring-1 ring-[#0A3CFF]/10 backdrop-blur-xl dark:bg-white/8 dark:text-white/82 dark:ring-white/8">
            Pontos
          </div>
        </header>

        {ranking.length === 0 ? (
          <div className="rounded-[26px] border border-white/70 bg-white/78 px-5 py-12 text-center shadow-[0_18px_45px_rgba(14,23,42,0.08)] backdrop-blur-xl dark:border-white/8 dark:bg-white/[0.07] dark:shadow-none">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0A3CFF]/10 text-[#0A3CFF] dark:bg-[#D0FD3E]/10 dark:text-[#D0FD3E]">
              <Trophy size={18} />
            </div>
            <p className="mt-3 text-[15px] font-semibold text-[#111827] dark:text-white">
              O ranking começa com o primeiro treino
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#64748B] dark:text-white/56">
              Ninguém registrou treino este mês. Salve uma sessão e apareça aqui.
            </p>
          </div>
        ) : (
          <>
            <section className="mb-5 rounded-[30px] border border-white/70 bg-white/66 px-2 py-5 shadow-[0_20px_45px_rgba(14,23,42,0.08)] backdrop-blur-2xl dark:border-white/8 dark:bg-white/[0.055] dark:shadow-none">
              <div className="grid grid-cols-3 items-end gap-1">
                <PodiumStep entry={podium[1]} place={2} isViewer={podium[1]?.is_viewer} />
                <PodiumStep entry={podium[0]} place={1} isViewer={podium[0]?.is_viewer} />
                <PodiumStep entry={podium[2]} place={3} isViewer={podium[2]?.is_viewer} />
              </div>
            </section>

            {rest.length > 0 && (
              <section className="mb-3">
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="hc-label text-[#6B7280] dark:text-white/42">
                    Atletas
                  </p>
                  <span className="text-[11px] font-medium text-[#8A8F98] dark:text-white/36">
                    {ranking.length} no mês
                  </span>
                </div>
                <div className="space-y-2">
                  {rest.map((entry) => (
                    <RankRow key={entry.user_id} entry={entry} isViewer={entry.is_viewer} />
                  ))}
                </div>
              </section>
            )}

            {showViewerCard && (
              <div className="fixed bottom-[88px] left-1/2 z-30 w-[min(92vw,380px)] -translate-x-1/2 px-1">
                <div className="rounded-[24px] border border-[#0A3CFF]/16 bg-white/92 px-4 py-3 shadow-[0_20px_42px_rgba(10,13,20,0.18)] backdrop-blur-2xl dark:border-[#D0FD3E]/16 dark:bg-[#111827]/92">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0A3CFF] text-[12px] font-semibold text-white dark:bg-[#D0FD3E] dark:text-[#0A0D14]">
                        {viewer.rank}
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0A3CFF] dark:text-[#D0FD3E]">
                        Sua posição
                      </span>
                    </div>
                    <span className="text-[12px] font-medium text-[#64748B] dark:text-white/54">
                      de {ranking.length} atleta{ranking.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="mt-2.5 flex gap-6">
                    <div className="flex flex-col">
                      <span className="text-[20px] font-semibold leading-none tracking-[-0.02em] text-[#111827] dark:text-white">
                        {viewerPoints}
                      </span>
                      <span className="mt-1 text-[10px] text-[#64748B] dark:text-white/44">pontos</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[20px] font-semibold leading-none tracking-[-0.02em] text-[#111827] dark:text-white">
                        {viewer.month_days}
                      </span>
                      <span className="mt-1 text-[10px] text-[#64748B] dark:text-white/44">dias</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[20px] font-semibold leading-none tracking-[-0.02em] text-[#111827] dark:text-white">
                        {viewer.streak}
                      </span>
                      <span className="mt-1 text-[10px] text-[#64748B] dark:text-white/44">sequência</span>
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E5E5EA] dark:bg-white/12">
                      <div
                        className="h-full rounded-full bg-[#0A3CFF] transition-all duration-300 dark:bg-[#D0FD3E]"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[11px]">
                      <span className="text-[#64748B] dark:text-white/54">
                        {pointsToPodium === 0 ? 'No limite do pódio' : `${pointsToPodium} pts para o pódio`}
                      </span>
                      <span className="font-medium text-[#8A8F98] dark:text-white/44">
                        {podiumTarget > 0 ? `${viewerPoints} / ${podiumTarget}` : '--'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
