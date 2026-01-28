"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/rhid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, ArrowRight, Shield } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      setError("Preencha todos os campos");
      return;
    }

    startTransition(async () => {
      const result = await login(email, password);
      if (result.success) {
        router.push("/");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Grid pattern */}
        <div className="absolute inset-0 grid-pattern opacity-50" />
        
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-blue-500/[0.06] blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-indigo-500/[0.04] blur-[120px]" />
        
        {/* Spotlight effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.08)_0%,transparent_70%)]" />
      </div>

      <div className="relative w-full max-w-md mx-4 z-10">
        {/* Logo and title */}
        <div className="text-center mb-10 fade-in-up">
          {/* Logo */}
          <div className="relative inline-flex mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-blue-500/30 border border-blue-400/20">
              <MapPin className="w-10 h-10 text-white" strokeWidth={2} />
            </div>
            {/* Decorative ring */}
            <div className="absolute -inset-3 rounded-3xl border-2 border-blue-200 animate-pulse" />
            <div className="absolute -inset-6 rounded-[28px] border border-blue-100" />
          </div>
          
          <h1 className="text-4xl font-bold text-slate-800 tracking-tight">
            Ponto <span className="text-blue-600">RLP</span>
          </h1>
          <p className="mt-3 text-slate-500 font-medium">
            Sistema de Controle de Ponto
          </p>
        </div>

        {/* Login card */}
        <div className="fade-in-up stagger-2">
          <div className="relative">
            {/* Card glow effect */}
            <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-blue-200/50 via-transparent to-transparent opacity-70" />
            
            <div className="relative bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/50">
              {/* Decorative corner accent */}
              <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden rounded-tr-3xl">
                <div className="absolute top-0 right-0 w-px h-12 bg-gradient-to-b from-blue-400/50 to-transparent" />
                <div className="absolute top-0 right-0 w-12 h-px bg-gradient-to-l from-blue-400/50 to-transparent" />
              </div>
              
              <form action={handleSubmit} className="space-y-6">
                {/* Email field */}
                <div className="space-y-2">
                  <Label 
                    htmlFor="email" 
                    className={`
                      text-sm font-medium transition-colors duration-200
                      ${focusedField === 'email' ? 'text-blue-600' : 'text-slate-600'}
                    `}
                  >
                    E-mail
                  </Label>
                  <div className="relative group">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="seu@email.com"
                      required
                      autoComplete="email"
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      className="
                        h-12 bg-slate-50 border-slate-200 text-slate-800 text-base
                        placeholder:text-slate-400 rounded-xl px-4
                        focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20
                        focus:bg-white transition-all duration-200
                      "
                    />
                    {/* Focus glow */}
                    <div className={`
                      absolute inset-0 rounded-xl transition-opacity duration-300 pointer-events-none
                      bg-blue-50 -z-10
                      ${focusedField === 'email' ? 'opacity-100' : 'opacity-0'}
                    `} />
                  </div>
                </div>

                {/* Password field */}
                <div className="space-y-2">
                  <Label 
                    htmlFor="password" 
                    className={`
                      text-sm font-medium transition-colors duration-200
                      ${focusedField === 'password' ? 'text-blue-600' : 'text-slate-600'}
                    `}
                  >
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      className="
                        h-12 bg-slate-50 border-slate-200 text-slate-800 text-base
                        placeholder:text-slate-400 rounded-xl px-4
                        focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20
                        focus:bg-white transition-all duration-200
                      "
                    />
                    <div className={`
                      absolute inset-0 rounded-xl transition-opacity duration-300 pointer-events-none
                      bg-blue-50 -z-10
                      ${focusedField === 'password' ? 'opacity-100' : 'opacity-0'}
                    `} />
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 scale-in">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                      <Shield className="w-4 h-4 text-red-500" />
                    </div>
                    <p className="text-red-600 text-sm font-medium">{error}</p>
                  </div>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={isPending}
                  className="
                    w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 
                    hover:from-blue-600 hover:to-blue-700 
                    text-white font-semibold text-base rounded-xl
                    shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30
                    transition-all duration-300 btn-interactive
                    disabled:opacity-70 disabled:cursor-not-allowed
                    border border-blue-400/20
                    group
                  "
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Entrando...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Entrar
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-slate-500 fade-in-up stagger-3">
          Conecte-se com suas credenciais <span className="text-slate-600 font-medium">RHID</span>
        </p>
        
        {/* Decorative footer line */}
        <div className="flex items-center justify-center gap-3 mt-6 fade-in-up stagger-4">
          <div className="w-12 h-px bg-gradient-to-r from-transparent to-slate-300" />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <div className="w-12 h-px bg-gradient-to-l from-transparent to-slate-300" />
        </div>
      </div>
    </div>
  );
}
