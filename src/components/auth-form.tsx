"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = { mode: "login" | "register" };

export default function AuthForm({ mode }: Props) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();

      if (isRegister) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() }, emailRedirectTo: `${window.location.origin}/auth/callback` },
        });

        if (signUpError) throw signUpError;

        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setMessage("Tu cuenta fue creada. Revisa tu correo para confirmar la dirección y luego inicia sesión.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        router.replace("/");
        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo completar la solicitud.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <Link className="brand auth-brand" href="/">
          <span className="brand-mark">M</span>
          <span><strong>MASTER</strong><small>IPTV PLAYER</small></span>
        </Link>
        <div className="auth-visual-copy">
          <div className="eyebrow">TU ENTRETENIMIENTO, A TU MANERA</div>
          <h1>Todo tu contenido.<br /><span>Un solo lugar.</span></h1>
          <p>Organiza tus listas IPTV y administra tus dispositivos con una experiencia sencilla y segura.</p>
        </div>
        <div className="visual-orbit orbit-one" />
        <div className="visual-orbit orbit-two" />
        <div className="visual-footer">MASTER IPTV PLAYER <span>•</span> EXPERIENCIA MULTIDISPOSITIVO</div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-mobile-brand">
            <span className="brand-mark">M</span><strong>MASTER IPTV PLAYER</strong>
          </div>
          <div className="eyebrow">{isRegister ? "EMPIEZA AHORA" : "QUÉ BUENO TENERTE DE VUELTA"}</div>
          <h2>{isRegister ? "Crea tu cuenta" : "Inicia sesión"}</h2>
          <p className="auth-subtitle">{isRegister ? "Regístrate gratis y configura tu espacio personal." : "Ingresa para administrar tus listas y dispositivos."}</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isRegister && (
              <label>
                Nombre
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Cómo te llamas" autoComplete="name" required maxLength={80} />
              </label>
            )}
            <label>
              Correo electrónico
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@correo.com" autoComplete="email" required />
            </label>
            <label>
              Contraseña
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isRegister ? "Mínimo 8 caracteres" : "Tu contraseña"} autoComplete={isRegister ? "new-password" : "current-password"} minLength={8} required />
            </label>
            {error && <div className="form-alert error" role="alert">{error}</div>}
            {message && <div className="form-alert success" role="status">{message}</div>}
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? "Un momento..." : isRegister ? "Crear cuenta" : "Entrar al panel"}
              <span>→</span>
            </button>
          </form>

          <div className="auth-switch">
            {isRegister ? "¿Ya tienes una cuenta?" : "¿Todavía no tienes cuenta?"}
            {" "}<Link href={isRegister ? "/login" : "/register"}>{isRegister ? "Inicia sesión" : "Regístrate gratis"}</Link>
          </div>
          <Link className="back-home" href="/">← Volver al inicio</Link>
          <p className="auth-terms">Al continuar, aceptas utilizar el servicio únicamente con listas y contenidos que tengas autorización para usar.</p>
        </div>
      </section>
    </main>
  );
}
