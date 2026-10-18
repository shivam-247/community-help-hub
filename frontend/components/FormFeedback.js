"use client";
import { Text } from "../lib/i18n";
export function ErrorMessage({ message }) {
  return message ? (
    <p
      role="alert"
      className="text-sm text-danger bg-danger-soft rounded-lg p-3"
    >
      <Text>{message}</Text>
    </p>
  ) : null;
}
export function FieldError({ error, id }) {
  return error ? (
    <p id={id} role="alert" className="text-xs text-danger mt-1">
      <Text>{error.message}</Text>
    </p>
  ) : null;
}
