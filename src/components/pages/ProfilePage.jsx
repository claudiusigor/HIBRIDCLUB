import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronDown,
  CircleCheckBig,
  Flame,
  LockKeyhole,
  LogOut,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import {
  AVATAR_FRAME_CATALOG,
  AVATAR_FRAME_VALUES,
  PROFILE_BIO_MAX_LENGTH,
  PROFILE_DISPLAY_NAME_MAX_LENGTH,
  getProfileCustomization,
  getUnlockedAvatarFrames,
  validateAvatarSourceFile,
} from '../../domain/profile';
import { getProfileBadgeKeys, updateUserProfile, uploadProfileAvatar } from '../../services/profile';
import AvatarEditor from '../profile/AvatarEditor';
import ProfileAvatar from '../profile/ProfileAvatar';

const FOCUS_OPTIONS = [
  { value: 'hybrid', label: 'Híbrido' },
  { value: 'strength', label: 'Força' },
  { value: 'running', label: 'Corrida' },
];

const GOAL_OPTIONS = [
  { value: '', label: 'Não definido' },
  { value: 'performance', label: 'Performance' },
  { value: 'consistency', label: 'Consistência' },
  { value: 'fat_loss', label: 'Redução de gordura' },
  { value: 'strength', label: 'Ganho de força' },
  { value: 'endurance', label: 'Resistência' },
];

const deriveDisplayName = (profile, user) => (
  profile?.display_name
  || user?.user_metadata?.full_name
  || user?.email?.split('@')[0]
  || 'Atleta'
);

function SignOutDialog({ open, onCancel, onConfirm }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return undefined;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="hc-profile-confirm"
      aria-labelledby="hc-profile-signout-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <div className="hc-profile-confirm__body">
        <button type="button" className="hc-profile-confirm__close" onClick={onCancel} aria-label="Fechar confirmação">
          <X size={18} />
        </button>
        <span className="hc-profile-confirm__icon"><LogOut size={20} /></span>
        <h2 id="hc-profile-signout-title">Sair da conta?</h2>
        <p>Seu treino salvo continuará disponível quando você entrar novamente.</p>
        <div className="hc-profile-confirm__actions">
          <button type="button" onClick={onCancel}>Cancelar</button>
          <button type="button" className="is-danger" onClick={onConfirm}>Sair</button>
        </div>
      </div>
    </dialog>,
    document.body
  );
}

export default function ProfilePage({
  user,
  profile,
  avatarUrl,
  stats = { monthDays: 0, streak: 0, points: 0 },
  onBack,
  onProfileUpdated,
  onSignOut,
}) {
  const fileInputRef = useRef(null);
  const initialFields = useMemo(() => getProfileCustomization({
    ...profile,
    display_name: deriveDisplayName(profile, user),
  }), [profile, user]);
  const [fields, setFields] = useState(initialFields);
  const [savedFields, setSavedFields] = useState(initialFields);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [avatarMessage, setAvatarMessage] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);
  const [earnedBadgeKeys, setEarnedBadgeKeys] = useState(() => stats.badges || []);

  useEffect(() => {
    setFields(initialFields);
    setSavedFields(initialFields);
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    const currentBadges = stats.badges || [];
    setEarnedBadgeKeys((existing) => [...new Set([...existing, ...currentBadges])]);

    void getProfileBadgeKeys(user?.id).then((badgeKeys) => {
      if (!active) return;
      setEarnedBadgeKeys([...new Set([...currentBadges, ...badgeKeys])]);
    });

    return () => {
      active = false;
    };
  }, [stats.badges, user?.id]);

  const normalizedFields = useMemo(() => getProfileCustomization(fields), [fields]);
  const isDirty = JSON.stringify(normalizedFields) !== JSON.stringify(savedFields);
  const unlockedFrames = useMemo(
    () => getUnlockedAvatarFrames(earnedBadgeKeys),
    [earnedBadgeKeys]
  );

  const updateField = (key, value) => {
    setFields((current) => ({ ...current, [key]: value }));
    setProfileMessage('');
    setProfileError('');
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    if (!user?.id || !isDirty) return;

    if (!unlockedFrames.includes(normalizedFields.avatar_frame)) {
      setProfileError('Essa moldura ainda precisa ser desbloqueada por uma medalha.');
      return;
    }

    setIsSavingProfile(true);
    setProfileError('');
    setProfileMessage('');
    try {
      const updatedProfile = await updateUserProfile(user.id, normalizedFields);
      const nextSavedFields = getProfileCustomization(updatedProfile);
      setFields(nextSavedFields);
      setSavedFields(nextSavedFields);
      onProfileUpdated?.(updatedProfile);
      setProfileMessage('Perfil atualizado.');
    } catch (error) {
      setProfileError(error.message || 'Não foi possível salvar o perfil.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setAvatarMessage('');
    setAvatarError('');
    try {
      validateAvatarSourceFile(file);
      setSelectedAvatarFile(file);
    } catch (error) {
      setAvatarError(error.message || 'Escolha uma imagem válida.');
    }
  };

  const handleAvatarApply = async (croppedFile) => {
    if (!user?.id) throw new Error('Entre na conta para salvar sua foto.');
    setAvatarError('');
    setAvatarMessage('');
    try {
      const updatedProfile = await uploadProfileAvatar(user.id, croppedFile, {
        previousAvatarUrl: avatarUrl,
      });
      onProfileUpdated?.(updatedProfile);
      setSelectedAvatarFile(null);
      setAvatarMessage('Foto atualizada no perfil e no ranking.');
    } catch (error) {
      setAvatarError(error.message || 'Não foi possível salvar a foto.');
      throw error;
    }
  };

  const currentName = normalizedFields.display_name || deriveDisplayName(profile, user);
  const currentFrame = AVATAR_FRAME_VALUES.includes(normalizedFields.avatar_frame)
    ? normalizedFields.avatar_frame
    : 'minimal';

  return (
    <div className="hc-profile-page">
      <header className="hc-profile-page__header">
        <button type="button" onClick={onBack} aria-label="Voltar para a tela anterior">
          <ArrowLeft size={19} />
        </button>
        <div>
          <h2>Perfil</h2>
          <p>Identidade e preferências</p>
        </div>
      </header>

      <section className="hc-profile-identity" aria-label="Resumo do perfil">
        <div className="hc-profile-identity__avatar">
          <ProfileAvatar src={avatarUrl} name={currentName} frame={currentFrame} size={96} decorative={false} />
          <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Alterar foto de perfil">
            <Camera size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleAvatarFileChange}
          />
        </div>
        <h3>{currentName}</h3>
        <p>{user?.email || 'Conta Hybrid Club'}</p>
        <button type="button" className="hc-profile-change-photo" onClick={() => fileInputRef.current?.click()}>
          Alterar foto
        </button>

        <div className="hc-profile-summary-stats">
          <div><Flame size={15} /><strong>{stats.streak || 0}</strong><span>Sequência</span></div>
          <div><CircleCheckBig size={15} /><strong>{stats.monthDays || 0}</strong><span>Dias no mês</span></div>
          <div><Sparkles size={15} /><strong>{stats.points || 0}</strong><span>Pontos</span></div>
        </div>

        <div className="hc-profile-inline-status" aria-live="polite">
          {avatarError ? <p role="alert" className="is-error">{avatarError}</p> : avatarMessage ? <p>{avatarMessage}</p> : null}
        </div>
      </section>

      <form onSubmit={handleProfileSave} className="hc-profile-form">
        <section className="hc-profile-section">
          <div className="hc-profile-section__heading">
            <h3>Identidade</h3>
            <p>Como você aparece dentro do app.</p>
          </div>

          <label className="hc-profile-field">
            <span>Nome no app</span>
            <input
              type="text"
              value={fields.display_name}
              onChange={(event) => updateField('display_name', event.target.value)}
              maxLength={PROFILE_DISPLAY_NAME_MAX_LENGTH}
              autoComplete="name"
              required
            />
          </label>

          <label className="hc-profile-field">
            <span>Bio no Ranking <b>{fields.bio.length}/{PROFILE_BIO_MAX_LENGTH}</b></span>
            <textarea
              value={fields.bio}
              onChange={(event) => updateField('bio', event.target.value)}
              maxLength={PROFILE_BIO_MAX_LENGTH}
              rows={3}
              placeholder="Uma frase curta que outros atletas poderão ler."
            />
          </label>
        </section>

        <section className="hc-profile-section">
          <div className="hc-profile-section__heading">
            <h3>Treino</h3>
            <p>O foco fica privado. O objetivo aparece no seu perfil do Ranking.</p>
          </div>

          <fieldset className="hc-profile-segments">
            <legend>Foco principal</legend>
            <div>
              {FOCUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={fields.training_focus === option.value ? 'is-active' : ''}
                  onClick={() => updateField('training_focus', option.value)}
                  aria-pressed={fields.training_focus === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="hc-profile-field">
            <span>Objetivo principal</span>
            <div className="hc-profile-select">
              <select value={fields.primary_goal || ''} onChange={(event) => updateField('primary_goal', event.target.value)}>
                {GOAL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <ChevronDown size={17} aria-hidden="true" />
            </div>
          </label>
        </section>

        <section className="hc-profile-section">
          <div className="hc-profile-section__heading">
            <h3>Aparência</h3>
            <p>Três estilos livres. As molduras especiais são liberadas pelas medalhas da Arena.</p>
          </div>
          <div className="hc-profile-frame-options" role="radiogroup" aria-label="Estilo da moldura">
            {AVATAR_FRAME_CATALOG.map((option) => {
              const unlocked = unlockedFrames.includes(option.value);
              const selected = fields.avatar_frame === option.value;
              const detail = option.rewardBadge
                ? option.detail
                : `${option.detail} · Disponível para todos`;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${option.label}. ${unlocked ? 'Disponível' : `Bloqueada: ${option.detail}`}`}
                  className={`${selected ? 'is-active' : ''} ${unlocked ? '' : 'is-locked'}`}
                  onClick={() => updateField('avatar_frame', option.value)}
                  disabled={!unlocked}
                >
                  <ProfileAvatar src={avatarUrl} name={currentName} frame={option.value} size={42} />
                  <span><strong>{option.label}</strong><small>{unlocked ? detail : `Desbloqueie com ${option.detail}`}</small></span>
                  {selected ? <Check size={16} /> : !unlocked ? <LockKeyhole size={15} /> : <span />}
                </button>
              );
            })}
          </div>
        </section>

        <section className="hc-profile-section hc-profile-account">
          <div className="hc-profile-section__heading">
            <h3>Conta</h3>
            <p>{user?.email || 'Sessão autenticada'}</p>
          </div>
          <button type="button" className="hc-profile-signout" onClick={() => setIsSignOutOpen(true)}>
            <LogOut size={17} />
            <span><strong>Sair da conta</strong><small>Encerrar esta sessão</small></span>
          </button>
        </section>

        <div className="hc-profile-save-status" aria-live="polite">
          {profileError ? <p role="alert" className="is-error">{profileError}</p> : profileMessage ? <p>{profileMessage}</p> : null}
        </div>

        <footer className="hc-profile-save-bar">
          <button type="submit" disabled={!isDirty || isSavingProfile}>
            <Save size={17} />
            {isSavingProfile ? 'Salvando...' : isDirty ? 'Salvar alterações' : 'Tudo salvo'}
          </button>
        </footer>
      </form>

      {selectedAvatarFile && (
        <AvatarEditor
          file={selectedAvatarFile}
          onCancel={() => setSelectedAvatarFile(null)}
          onApply={handleAvatarApply}
        />
      )}

      <SignOutDialog
        open={isSignOutOpen}
        onCancel={() => setIsSignOutOpen(false)}
        onConfirm={() => {
          setIsSignOutOpen(false);
          onSignOut?.();
        }}
      />
    </div>
  );
}
