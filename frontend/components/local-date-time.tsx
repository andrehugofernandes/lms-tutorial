"use client";

import { useEffect, useState } from "react";

type DateValue = string | number | Date | null | undefined;

interface LocalDateTimeProps {
  value: DateValue;
  fallback?: string;
}

const formatLocalDateTime = (value: Exclude<DateValue, null | undefined>) => {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const LocalDateTime = ({
  value,
  fallback = "Nao informado",
}: LocalDateTimeProps) => {
  const [formattedValue, setFormattedValue] = useState(
    value ? "Ajustando horario local..." : fallback
  );

  useEffect(() => {
    if (!value) {
      setFormattedValue(fallback);
      return;
    }

    setFormattedValue(formatLocalDateTime(value) ?? fallback);
  }, [fallback, value]);

  return <span suppressHydrationWarning>{formattedValue}</span>;
};
