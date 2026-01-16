import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { createPaymentFromTemplate, getTemplates, type Template } from "./api";

function getTypeIcon(type: string | null) {
  if (type === "expense")
    return { source: Icon.ArrowDown, tintColor: Color.Red };
  if (type === "income")
    return { source: Icon.ArrowUp, tintColor: Color.Green };
  return { source: Icon.Circle, tintColor: Color.SecondaryText };
}

function formatAmount(amount: string | null, currency: string | null): string {
  if (!amount) return "";
  const currencySymbol =
    currency === "RUB"
      ? "₽"
      : currency === "USD"
        ? "$"
        : currency === "KZT"
          ? "₸"
          : "";
  return `${amount} ${currencySymbol}`;
}

export default function CreateFromTemplate() {
  const {
    data: templates,
    isLoading,
    revalidate,
  } = useCachedPromise(getTemplates);

  async function handleCreatePayment(template: Template) {
    const confirmed = await confirmAlert({
      title: `Создать платёж "${template.name}"?`,
      message: template.amount
        ? `${template.type === "expense" ? "Расход" : "Доход"}: ${formatAmount(template.amount, template.currency)}`
        : "Будет создан платёж по шаблону с сегодняшней датой",
      primaryAction: {
        title: "Создать",
        style: Alert.ActionStyle.Default,
      },
    });

    if (!confirmed) return;

    try {
      await createPaymentFromTemplate(template);
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Ошибка",
        message:
          error instanceof Error ? error.message : "Не удалось создать платёж",
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Поиск шаблонов...">
      {!templates || templates.length === 0 ? (
        <List.EmptyView
          icon={Icon.Document}
          title="Нет шаблонов"
          description="Создайте шаблоны в веб-приложении Dopusk"
        />
      ) : (
        templates.map((template: Template) => (
          <List.Item
            key={template.id}
            title={template.name}
            subtitle={template.description || undefined}
            icon={getTypeIcon(template.type)}
            accessories={[
              template.amount
                ? { text: formatAmount(template.amount, template.currency) }
                : { text: "" },
              template.status === "paid"
                ? { icon: Icon.CheckCircle, tooltip: "Оплачен" }
                : { icon: Icon.Circle, tooltip: "Не оплачен" },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Создать платёж"
                  icon={Icon.Plus}
                  onAction={() => handleCreatePayment(template)}
                />
                <Action
                  title="Обновить список"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
