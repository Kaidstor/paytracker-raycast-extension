import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiUrl: string;
  apiToken: string;
}

export async function getAccessToken(): Promise<string> {
  const { apiToken } = getPreferenceValues<Preferences>();

  if (!apiToken) {
    throw new Error(
      "API токен не настроен. Создайте токен в настройках PayTracker и добавьте его в настройки расширения.",
    );
  }

  return apiToken;
}
