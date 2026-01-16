import {
  Action,
  ActionPanel,
  Form,
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
  getServices,
  getTags,
  type Service,
  type Tag,
} from "./api";

type PaymentType = "expense" | "income";
type PaymentStatus = "paid" | "unpaid";
type Currency = "RUB" | "USD" | "KZT";

interface FormValues {
  type: PaymentType;
  status: PaymentStatus;
  amount: string;
  currency: Currency;
  date: Date | null;
  description: string;
  serviceId: string;
  tagIds: string[];
  counterpartyIds: string[];
}

export default function CreatePayment() {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const { data: services, isLoading: servicesLoading } =
    useCachedPromise(getServices);
  const { data: tags, isLoading: tagsLoading } = useCachedPromise(getTags);
  const { data: counterparties, isLoading: counterpartiesLoading } =
    useCachedPromise(getCounterparties);

  async function handleSubmit(values: FormValues) {
    if (!values.amount || Number.parseFloat(values.amount) <= 0) {
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
        type: values.type,
        status: values.status,
        amount: values.amount,
        currency: values.currency,
        date: values.date.toISOString().split("T")[0],
        description: values.description || undefined,
        serviceId: values.serviceId || null,
        tagIds: values.tagIds || [],
        counterpartyIds: values.counterpartyIds || [],
      });
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
      isLoading={
        isLoading || servicesLoading || tagsLoading || counterpartiesLoading
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Создать платёж" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="type" title="Тип" defaultValue="expense">
        <Form.Dropdown.Item value="expense" title="Расход" icon="💸" />
        <Form.Dropdown.Item value="income" title="Доход" icon="💰" />
      </Form.Dropdown>

      <Form.Dropdown id="status" title="Статус" defaultValue="unpaid">
        <Form.Dropdown.Item value="unpaid" title="Не оплачен" />
        <Form.Dropdown.Item value="paid" title="Оплачен" />
      </Form.Dropdown>

      <Form.TextField id="amount" title="Сумма" placeholder="1000" autoFocus />

      <Form.Dropdown id="currency" title="Валюта" defaultValue="RUB">
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
      />

      {services && services.length > 0 && (
        <Form.Dropdown id="serviceId" title="Сервис">
          <Form.Dropdown.Item value="" title="Без сервиса" />
          {services.map((service: Service) => (
            <Form.Dropdown.Item
              key={service.id}
              value={service.id}
              title={service.name}
            />
          ))}
        </Form.Dropdown>
      )}

      {tags && tags.length > 0 && (
        <Form.TagPicker id="tagIds" title="Теги">
          {tags.map((tag: Tag) => (
            <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />
          ))}
        </Form.TagPicker>
      )}

      {counterparties && counterparties.length > 0 && (
        <Form.TagPicker id="counterpartyIds" title="Контрагенты">
          {counterparties.map((cp: Counterparty) => (
            <Form.TagPicker.Item
              key={cp.id}
              value={cp.id}
              title={cp.name}
              icon={cp.type === "person" ? "👤" : "🏢"}
            />
          ))}
        </Form.TagPicker>
      )}
    </Form>
  );
}
