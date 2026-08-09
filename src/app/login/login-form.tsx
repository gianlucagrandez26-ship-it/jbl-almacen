'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/client';
import { evento } from '@/lib/analytics';
import { Aviso } from '@/components/ui';
import { Loader2 } from 'lucide-react';

type Modo = 'entrar' | 'registrar';

export default function FormularioAcceso() {
  const parametros = useSearchParams();
  const destino = parametros.get('destino') ?? '/panel';

  const [modo, setModo] = useState<Modo>('entrar');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [nombre, setNombre] = useState('');
  const [cargando, setCargando] = useState<'correo' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(
    parametros.get('error') ? 'No se pudo completar el acceso. Inténtalo otra vez.' : null
  );
  const [aviso, setAviso] = useState<string | null>(null);

  const supabase = crearClienteNavegador();

  async function conCorreo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setCargando('correo');

    try {
      if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email: correo, password: clave });
        if (error) throw error;
        evento('login', { method: 'email' });
        window.location.assign(destino);
      } else {
        const { error } = await supabase.auth.signUp({
          email: correo,
          password: clave,
          options: {
            data: { full_name: nombre },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        evento('sign_up', { method: 'email' });
        setAviso('Cuenta creada. Revisa tu correo y confirma la dirección para entrar.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setError(
        msg.includes('Invalid login')
          ? 'Correo o contraseña incorrectos.'
          : msg.includes('already registered')
            ? 'Ese correo ya tiene una cuenta. Entra con tu contraseña.'
            : msg.includes('at least')
              ? 'La contraseña necesita al menos 6 caracteres.'
              : msg
      );
    } finally {
      setCargando(null);
    }
  }

  async function conGoogle() {
    setError(null);
    setCargando('google');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?destino=${encodeURIComponent(destino)}`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });

    if (error) {
      setError('No se pudo abrir el acceso con Google.');
      setCargando(null);
    } else {
      evento('login', { method: 'google' });
    }
  }

  return (
    <div className="w-full max-w-sm">
      <p className="eyebrow">Acceso al sistema</p>
      <h1 className="titulo mt-2 text-[26px] leading-tight">
        {modo === 'entrar' ? 'Entrar al almacén' : 'Crear cuenta'}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-acero-600">
        {modo === 'entrar'
          ? 'Usa el correo de la empresa o tu cuenta de Google.'
          : 'Tu cuenta empieza con permiso de operario. Un supervisor puede ampliarlo.'}
      </p>

      <button
        onClick={conGoogle}
        disabled={cargando !== null}
        className="btn-borde mt-7 w-full"
      >
        {cargando === 'google' ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
            <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
          </svg>
        )}
        Continuar con Google
      </button>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-acero-200" />
        <span className="font-mono text-micro uppercase tracking-[0.1em] text-acero-400">o</span>
        <span className="h-px flex-1 bg-acero-200" />
      </div>

      <form onSubmit={conCorreo} className="space-y-4">
        {modo === 'registrar' && (
          <div>
            <label htmlFor="nombre" className="etiqueta-campo">Nombre y apellido</label>
            <input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              autoComplete="name"
              className="campo"
              placeholder="Willy Gonzáles"
            />
          </div>
        )}

        <div>
          <label htmlFor="correo" className="etiqueta-campo">Correo</label>
          <input
            id="correo"
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            autoComplete="email"
            className="campo"
            placeholder="nombre@jblsac.com"
          />
        </div>

        <div>
          <label htmlFor="clave" className="etiqueta-campo">Contraseña</label>
          <input
            id="clave"
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required
            minLength={6}
            autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
            className="campo"
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        {error && <Aviso tono="error">{error}</Aviso>}
        {aviso && <Aviso tono="ok">{aviso}</Aviso>}

        <button type="submit" disabled={cargando !== null} className="btn-principal w-full">
          {cargando === 'correo' && <Loader2 size={16} className="animate-spin" />}
          {modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}
        </button>
      </form>

      <p className="mt-6 text-sm text-acero-600">
        {modo === 'entrar' ? '¿Aún no tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
        <button
          onClick={() => {
            setModo(modo === 'entrar' ? 'registrar' : 'entrar');
            setError(null);
            setAviso(null);
          }}
          className="font-medium text-tinta underline decoration-senal decoration-2 underline-offset-4 hover:decoration-tinta"
        >
          {modo === 'entrar' ? 'Créala aquí' : 'Entra aquí'}
        </button>
      </p>
    </div>
  );
}
