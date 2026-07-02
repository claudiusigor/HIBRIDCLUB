import React, { useEffect, useState } from 'react';
import { Flame, Trophy } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function getInitials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Avatar foto-ready: usa a foto do profile (avatar_url) quando existir;
// enquanto o upload de foto não for implementado, mostra as iniciais.
function RankAvatar({ name, photoUrl, size = 44 }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        loading="lazy"
        decoding="async"
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-gray-100 font-semibold text-gray-600 dark:bg-white/10 dark:text-gray-300"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {getInitials(name)}
    </div>
  );
}

function YouBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-[#0A3CFF] px-1.5 py-0.5 text-[9px] font-semibold text-white">
      Você
    </span>
  );
}

function PodiumStep({ entry, place, isViewer }) {
  const isChampion = place === 1;
  const stepHeight = place === 1 ? 88 : place === 2 ? 64 : 48;

  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-end">
        <div className="mb-2 h-11 w-11 rounded-full border border-dashed border-black/[0.08] dark:border-white/[0.08]" />
        <div
          className="w-full rounded-t-[12px] bg-black/[0.02] dark:bg-white/[0.03]"
          style={{ height: stepHeight }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-end">
      <div className="relative mb-2">
        <div className={isChampion ? 'rounded-full ring-2 ring-[#FE0972] ring-offset-2 ring-offset-white dark:ring-offset-[#0A0D14]' : ''}>
          <RankAvatar name={entry.display_name} photoUrl={entry.avatar_url} size={place === 1 ? 52 : 44} />
        </div>
        {isViewer && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2">
            <YouBadge />
          </span>
        )}
      </div>
      <p className="mb-2 max-w-[88px] truncate text-center text-[12px] font-semibold text-gray-950 dark:text-white">
        {entry.display_name}
      </p>
      <div
        className={`flex w-full flex-col items-center justify-start rounded-t-[12px] pt-2 ${
          isChampion
            ? 'bg-[#FE0972]/10 dark:bg-[#FE0972]/15'
            : 'bg-black/[0.03] dark:bg-white/[0.05]'
        }`}
        style={{ height: stepHeight }}
      >
        <span className={`text-[16px] font-bold leading-none ${isChampion ? 'text-[#FE0972]' : 'text-gray-950 dark:text-white'}`}>
          {place}
        </span>
        <span className="mt-1 text-[10px] font-medium text-gray-500 dark:text-gray-400">
          {entry.month_days}d
        </span>
      </div>
    </div>
  );
}

function RankRow({ entry, isViewer }) {
  const idle = entry.month_days === 0;
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${isViewer ? 'bg-[#0A3CFF]/[0.04] dark:bg-[#0A3CFF]/10' : ''} ${idle ? 'opacity-55' : ''}`}>
      <span className="w-6 shrink-0 text-center text-[14px] font-semibold text-gray-400 dark:text-gray-500">
        {entry.rank}
      </span>
      <RankAvatar name={entry.display_name} photoUrl={entry.avatar_url} size={38} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`truncate text-[14px] font-semibold ${idle ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
            {entry.display_name}
          </p>
          {isViewer && <YouBadge />}
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
          {entry.streak > 0 ? (
            <>
              <Flame size={10} strokeWidth={2.2} />
              {entry.streak} dia{entry.streak === 1 ? '' : 's'}
            </>
          ) : (
            <span className="text-gray-300 dark:text-gray-600">—</span>
          )}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-[16px] font-bold leading-none tracking-[-0.02em] ${idle ? 'text-gray-400 dark:text-gray-500' : 'text-gray-950 dark:text-white'}`}>
          {entry.month_days}
        </p>
        <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
          dias
        </p>
      </div>
    </div>
  );
}

function RankingSkeleton() {
  return (
    <div>
      <header className="mb-6 px-1">
        <div className="h-7 w-28 animate-pulse rounded-lg bg-gray-200 dark:bg-white/10" />
        <div className="mt-2 h-4 w-44 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
      </header>
      <div className="rounded-[24px] border border-black/[0.05] bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.05]">
        <div className="grid grid-cols-3 items-end gap-2">
          {[
            { h: 64, s: 44 },
            { h: 88, s: 52 },
            { h: 48, s: 44 },
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center justify-end">
              <div
                className="mb-2 animate-pulse rounded-full bg-gray-200 dark:bg-white/10"
                style={{ width: step.s, height: step.s }}
              />
              <div className="mb-2 h-3 w-14 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
              <div
                className="w-full animate-pulse rounded-t-[12px] bg-gray-200 dark:bg-white/10"
                style={{ height: step.h }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 space-y-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-5 w-5 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
            <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-white/10" />
            <div className="flex-1">
              <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
              <div className="mt-1.5 h-3 w-20 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
            </div>
            <div className="h-6 w-8 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RankingPage({ userId }) {
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
        setRanking(data || []);
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

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', run);
    };
  }, [userId]);

  const monthLabel = MONTH_NAMES[new Date().getMonth()];
  const podium = ranking.slice(0, 3);
  const rest = ranking.slice(3);
  const viewer = ranking.find((r) => r.is_viewer) || null;
  const viewerInPodium = viewer && viewer.rank <= 3;
  const showViewerCard = Boolean(viewer && !viewerInPodium);
  const podiumTarget = podium[2]?.month_days ?? 0;
  const daysToPodium = Math.max(0, podiumTarget - (viewer?.month_days ?? 0));
  const progressPct = podiumTarget > 0
    ? Math.min(100, Math.round(((viewer?.month_days ?? 0) / podiumTarget) * 100))
    : 0;

  if (loading) return <RankingSkeleton />;

  return (
    <div className={showViewerCard ? 'pb-56' : 'pb-2'}>
      {error && (
        <div className="mb-4 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {error === 'config'
            ? 'O Supabase não está configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.'
            : (
              <>
                <p className="font-semibold">Não foi possível carregar o ranking.</p>
                <p className="mt-1 text-[12px] opacity-80">Detalhe do erro: {error}</p>
                <p className="mt-1 text-[12px] opacity-80">
                  Se a função acabou de ser criada, aguarde alguns segundos e recarregue — o Supabase pode precisar recarregar o cache de schema.
                </p>
              </>
            )}
        </div>
      )}

      <header className="mb-6 px-1">
        <h2 className="text-[26px] font-bold tracking-[-0.03em] text-gray-950 dark:text-white">
          Ranking
        </h2>
        <p className="mt-0.5 text-[13px] text-gray-500 dark:text-gray-400">
          {monthLabel} · reset no dia 1
        </p>
      </header>

      {ranking.length === 0 ? (
        <div className="rounded-[24px] border border-black/[0.05] bg-white px-5 py-12 text-center dark:border-white/[0.08] dark:bg-white/[0.05]">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-white/10 dark:text-gray-500">
            <Trophy size={18} />
          </div>
          <p className="mt-3 text-[15px] font-semibold text-gray-950 dark:text-white">
            O ranking começa com o primeiro treino
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
            Ninguém registrou treino este mês. Salve uma sessão e apareça aqui.
          </p>
        </div>
      ) : (
        <>
          {/* Pódio top 3 */}
          <section className="mb-3 overflow-hidden rounded-[24px] border border-black/[0.05] bg-white px-5 pb-5 pt-5 dark:border-white/[0.08] dark:bg-white/[0.05]">
            <div className="grid grid-cols-3 items-end gap-2">
              <PodiumStep entry={podium[1]} place={2} isViewer={podium[1]?.is_viewer} />
              <PodiumStep entry={podium[0]} place={1} isViewer={podium[0]?.is_viewer} />
              <PodiumStep entry={podium[2]} place={3} isViewer={podium[2]?.is_viewer} />
            </div>
          </section>

          {/* Lista ranqueada (4º em diante, incluindo quem ainda não treinou) */}
          {rest.length > 0 && (
            <section className="mb-3">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
                Atletas
              </p>
              <div className="overflow-hidden rounded-[24px] border border-black/[0.05] bg-white dark:border-white/[0.08] dark:bg-white/[0.05]">
                <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                  {rest.map((entry) => (
                    <RankRow key={entry.user_id} entry={entry} isViewer={entry.is_viewer} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Card fixo do usuário (só quando fora do pódio) */}
          {showViewerCard && (
            <div className="fixed bottom-[88px] left-1/2 z-30 w-[min(92vw,380px)] -translate-x-1/2 px-1">
              <div className="rounded-[20px] border border-black/[0.06] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:border-white/[0.08] dark:bg-[#1C1C1E] dark:shadow-none">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0A3CFF] text-[12px] font-bold text-white">
                      {viewer.rank}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0A3CFF] dark:text-[#8FB1FF]">
                      Sua posição
                    </span>
                  </div>
                  <span className="text-[12px] font-medium text-gray-500 dark:text-gray-400">
                    de {ranking.length} atleta{ranking.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="mt-2.5 flex gap-6">
                  <div className="flex flex-col">
                    <span className="text-[20px] font-bold leading-none tracking-[-0.02em] text-gray-950 dark:text-white">
                      {viewer.month_days}
                    </span>
                    <span className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">dias treinados</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[20px] font-bold leading-none tracking-[-0.02em] text-gray-950 dark:text-white">
                      {viewer.streak}
                    </span>
                    <span className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">sequência atual</span>
                  </div>
                </div>
                <div className="mt-2.5">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#0A3CFF]/10 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#0A3CFF] transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px]">
                    <span className="text-gray-500 dark:text-gray-400">
                      {daysToPodium === 0 ? 'No limite do pódio' : `${daysToPodium} dia${daysToPodium === 1 ? '' : 's'} p/ o pódio`}
                    </span>
                    <span className="font-medium text-gray-400 dark:text-gray-500">
                      {podiumTarget > 0 ? `${viewer.month_days} / ${podiumTarget}` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
