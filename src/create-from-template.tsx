import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import {
  type Counterparty,
  createPayment,
  getCounterparties,
  getTags,
  getTemplates,
  type Tag,
  type Template,
} from "./api";

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

type PaymentStatus = "paid" | "unpaid";
type Currency = "RUB" | "USD" | "KZT";

interface FormValues {
  status: PaymentStatus;
  amount: string;
  currency: Currency;
  date: Date | null;
  description: string;
  tagIds: string[];
  counterpartyIds: string[];
}

function PaymentFormFromTemplate({
  template,
  onSuccess,
}: {
  template: Template;
  onSuccess: () => void;
}) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const { data: tags, isLoading: tagsLoading } = useCachedPromise(getTags);
  const { data: counterparties, isLoading: counterpartiesLoading } =
    useCachedPromise(getCounterparties);

  async function handleSubmit(values: FormValues) {
    if (!values.amount || Number.parseFloat(values.amount) === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Ошибка",
        message: "Введите корректную сумму",
      });
      return;
    }

    if (!values.date) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Ошибка",
        message: "Выберите дату",
      });
      return;
    }

    setIsLoading(true);

    try {
      await createPayment({
        status: values.status,
        amount: values.amount,
        currency: values.currency,
        date: `${values.date.getFullYear()}-${String(values.date.getMonth() + 1).padStart(2, "0")}-${String(values.date.getDate()).padStart(2, "0")}`,
        description: values.description || undefined,
        tagIds: values.tagIds || [],
        counterpartyIds: values.counterpartyIds || [],
      });
      onSuccess();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Ошибка создания платежа",
        message: error instanceof Error ? error.message : "Неизвестная ошибка",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      navigationTitle={`Платёж: ${template.name}`}
      isLoading={isLoading || tagsLoading || counterpartiesLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Создать платёж" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Шаблон"
        text={`${template.name}${template.description ? ` — ${template.description}` : ""}`}
      />

      <Form.Separator />

      <Form.Dropdown
        id="status"
        title="Статус"
        defaultValue={template.status || "unpaid"}
      >
        <Form.Dropdown.Item value="unpaid" title="Не оплачен" />
        <Form.Dropdown.Item value="paid" title="Оплачен" />
      </Form.Dropdown>

      <Form.TextField
        id="amount"
        title="Сумма"
        placeholder="-1000"
        defaultValue={
          template.amount
            ? template.type === "expense" && !template.amount.startsWith("-")
              ? `-${template.amount}`
              : template.amount
            : ""
        }
        autoFocus
      />

      <Form.Dropdown
        id="currency"
        title="Валюта"
        defaultValue={template.currency || "RUB"}
      >
        <Form.Dropdown.Item value="RUB" title="₽ RUB" />
        <Form.Dropdown.Item value="USD" title="$ USD" />
        <Form.Dropdown.Item value="KZT" title="₸ KZT" />
      </Form.Dropdown>

      <Form.DatePicker id="date" title="Дата" defaultValue={new Date()} />

      <Form.Separator />

      <Form.TextArea
        id="description"
        title="Описание"
        placeholder="Описание платежа..."
        defaultValue={template.description || ""}
      />

      <Form.TagPicker
        id="tagIds"
        title="Теги"
        defaultValue={template.tagIds || []}
      >
        {(tags || []).map((tag: Tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />
        ))}
      </Form.TagPicker>

      <Form.TagPicker
        id="counterpartyIds"
        title="Контрагенты"
        defaultValue={template.counterpartyIds || []}
      >
        {(counterparties || []).map((cp: Counterparty) => (
          <Form.TagPicker.Item
            key={cp.id}
            value={cp.id}
            title={cp.name}
            icon={cp.type === "person" ? "👤" : "🏢"}
          />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

export default function CreateFromTemplate() {
  const { push } = useNavigation();
  const {
    data: templates,
    isLoading,
    revalidate,
  } = useCachedPromise(getTemplates);

  function handleSelectTemplate(template: Template) {
    push(
      <PaymentFormFromTemplate template={template} onSuccess={revalidate} />,
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Поиск шаблонов...">
      {!templates || templates.length === 0 ? (
        <List.EmptyView
          icon={Icon.Document}
          title="Нет шаблонов"
          description="Создайте шаблоны в веб-приложении PayTracker"
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
                  title="Редактировать и создать"
                  icon={Icon.Pencil}
                  onAction={() => handleSelectTemplate(template)}
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
