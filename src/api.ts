import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { getAccessToken } from "./oauth";

interface Preferences {
  apiUrl: string;
}

export interface Template {
  id: string;
  name: string;
  type: "expense" | "income" | null;
  status: "paid" | "unpaid" | null;
  serviceId: string | null;
  amount: string | null;
  currency: "RUB" | "USD" | "KZT" | null;
  description: string | null;
  tagIds: string[] | null;
}

export interface Service {
  id: string;
  name: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string | null;
}

export interface CreatePaymentParams {
  type: "expense" | "income";
  status?: "paid" | "unpaid";
  serviceId?: string | null;
  amount: string;
  currency: "RUB" | "USD" | "KZT";
  date: string;
  description?: string;
  tagIds?: string[];
  counterpartyIds?: string[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const { apiUrl } = getPreferenceValues<Preferences>();
  const accessToken = await getAccessToken();

  const response = await fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }

  const result = (await response.json()) as ApiResponse<T>;

  if (!result.success) {
    throw new Error(result.error || "Unknown API error");
  }

  return result.data as T;
}

export async function getTemplates(): Promise<Template[]> {
  return apiRequest<Template[]>("/api/v2/templates");
}

export async function getServices(): Promise<Service[]> {
  return apiRequest<Service[]>("/api/services");
}

export async function getTags(): Promise<Tag[]> {
  return apiRequest<Tag[]>("/api/tags");
}

export async function createPayment(
  params: CreatePaymentParams,
): Promise<void> {
  await apiRequest("/api/payments", {
    method: "POST",
    body: JSON.stringify(params),
  });

  await showToast({
    style: Toast.Style.Success,
    title: "Платёж создан",
    message: `${params.type === "expense" ? "Расход" : "Доход"}: ${params.amount} ${params.currency}`,
  });
}

export async function createPaymentFromTemplate(
  template: Template,
  overrides: Partial<CreatePaymentParams> = {},
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  const params: CreatePaymentParams = {
    type: template.type || "expense",
    status: template.status || "unpaid",
    serviceId: template.serviceId,
    amount: template.amount || "0",
    currency: template.currency || "RUB",
    date: today,
    description: template.description || undefined,
    tagIds: template.tagIds || [],
    ...overrides,
  };

  await createPayment(params);
}
