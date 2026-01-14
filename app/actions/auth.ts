"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const RHID_API_BASE = "https://rhid.com.br/v2";
const TOKEN_COOKIE_NAME = "rhid_session";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

interface LoginResponse {
  accessToken: string;
  expiredPassword: boolean;
  isPerson: boolean;
  listCustomer: unknown;
  revendaInadimplente: boolean;
}

export type LoginResult =
  | { success: true; data: LoginResponse }
  | { success: false; error: string };

export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    console.log("Calling rhid.com.br login API...");
    
    // Correct endpoint: /v2/login.svc/
    const response = await fetch(`${RHID_API_BASE}/login.svc/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ 
        domain: null,
        email, 
        password 
      }),
    });

    console.log("rhid.com.br response status:", response.status);

    if (!response.ok) {
      console.error("Login failed with status:", response.status);
      return { success: false, error: "Credenciais inválidas" };
    }

    const data: LoginResponse = await response.json();
    console.log("Login successful, got accessToken");

    if (!data.accessToken) {
      console.error("No accessToken in response");
      return { success: false, error: "Resposta inválida do servidor" };
    }

    // Store just the accessToken in httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set(TOKEN_COOKIE_NAME, data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return { success: true, data };
  } catch (error) {
    console.error("Login error:", error instanceof Error ? error.message : "Unknown error");
    return {
      success: false,
      error: "Erro ao conectar com o servidor. Tente novamente.",
    };
  }
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE_NAME);
  redirect("/login");
}

export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(TOKEN_COOKIE_NAME);
  return sessionCookie?.value || null;
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAccessToken();
  return token !== null;
}
