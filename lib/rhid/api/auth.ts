"use server";

import { redirect } from "next/navigation";
import { RHID_CONFIG } from "../config";
import {
  setAccessToken,
  clearSession,
  getAccessToken,
  isAuthenticated,
} from "../client";
import type { LoginResponse, LoginResult } from "../types";

// Re-export client functions for convenience
export { clearSession, getAccessToken, isAuthenticated };

/**
 * Login to RHID API
 */
export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    console.log("Calling rhid.com.br login API...");

    const response = await fetch(`${RHID_CONFIG.BASE_URL}/login.svc/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        domain: null,
        email,
        password,
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

    // Store the access token
    await setAccessToken(data.accessToken);

    return { success: true, data };
  } catch (error) {
    console.error(
      "Login error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return {
      success: false,
      error: "Erro ao conectar com o servidor. Tente novamente.",
    };
  }
}

/**
 * Logout and redirect to login page
 */
export async function logout(): Promise<void> {
  await clearSession();
  redirect("/login");
}
