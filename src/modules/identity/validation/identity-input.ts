import {
  groupCodes,
  type ChangePasswordInput,
  type CreateUserInput,
  type GroupCode,
  type LoginInput,
  type UpdateUserInput,
} from "../types/identity";

export type IdentityValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: Record<string, string> };

const usernamePattern = /^[a-z0-9._-]{3,50}$/;

function validateUsername(value: unknown, errors: Record<string, string>) {
  const username = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!usernamePattern.test(username)) {
    errors.username =
      "L’identifiant doit contenir 3 à 50 lettres minuscules, chiffres, points, tirets ou underscores.";
  }
  return username;
}

function validateDisplayName(value: unknown, errors: Record<string, string>) {
  const displayName = typeof value === "string" ? value.trim() : "";
  if (!displayName || displayName.length > 100) {
    errors.displayName = "Le nom affiché doit contenir entre 1 et 100 caractères.";
  }
  return displayName;
}

function validatePassword(
  value: unknown,
  field: string,
  errors: Record<string, string>,
) {
  const password = typeof value === "string" ? value : "";
  if (password.length < 8 || password.length > 128) {
    errors[field] = "Le mot de passe doit contenir entre 8 et 128 caractères.";
  }
  return password;
}

function validateGroupCodes(value: unknown, errors: Record<string, string>) {
  const values = Array.isArray(value) ? value : [];
  const valid = values.filter(
    (candidate): candidate is GroupCode =>
      typeof candidate === "string" && groupCodes.includes(candidate as GroupCode),
  );
  const unique = Array.from(new Set(valid));
  if (values.length !== unique.length || unique.length === 0) {
    errors.groupCodes = "Sélectionne au moins un groupe valide.";
  }
  return unique;
}

export function validateLoginInput(input: unknown): IdentityValidationResult<LoginInput> {
  const values = input instanceof FormData
    ? { username: input.get("username"), password: input.get("password") }
    : (input as Record<string, unknown> | null);
  const username = typeof values?.username === "string"
    ? values.username.trim().toLowerCase()
    : "";
  const password = typeof values?.password === "string" ? values.password : "";
  if (!username || !password) {
    return { success: false, errors: { credentials: "Identifiants invalides." } };
  }
  return { success: true, data: { username, password } };
}

export function validateCreateUserInput(
  input: unknown,
): IdentityValidationResult<CreateUserInput> {
  const values = (input ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const data = {
    username: validateUsername(values.username, errors),
    displayName: validateDisplayName(values.displayName, errors),
    temporaryPassword: validatePassword(
      values.temporaryPassword,
      "temporaryPassword",
      errors,
    ),
    groupCodes: validateGroupCodes(values.groupCodes, errors),
  };
  return Object.keys(errors).length ? { success: false, errors } : { success: true, data };
}

export function validateUpdateUserInput(
  input: unknown,
): IdentityValidationResult<UpdateUserInput> {
  const values = (input ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const status: "active" | "disabled" = values.status === "active" || values.status === "disabled"
    ? values.status
    : "active";
  if (values.status !== "active" && values.status !== "disabled") {
    errors.status = "Le statut du compte est invalide.";
  }
  const data = {
    username: validateUsername(values.username, errors),
    displayName: validateDisplayName(values.displayName, errors),
    status,
    groupCodes: validateGroupCodes(values.groupCodes, errors),
  };
  return Object.keys(errors).length ? { success: false, errors } : { success: true, data };
}

export function validateChangePasswordInput(
  input: unknown,
): IdentityValidationResult<ChangePasswordInput> {
  const values = (input ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const currentPassword = typeof values.currentPassword === "string" ? values.currentPassword : "";
  const newPassword = validatePassword(values.newPassword, "newPassword", errors);
  if (!currentPassword) errors.currentPassword = "Saisis ton mot de passe actuel.";
  if (currentPassword && currentPassword === newPassword) {
    errors.newPassword = "Choisis un mot de passe différent du mot de passe actuel.";
  }
  return Object.keys(errors).length
    ? { success: false, errors }
    : { success: true, data: { currentPassword, newPassword } };
}

export function validateTemporaryPasswordInput(input: unknown) {
  const values = (input ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const temporaryPassword = validatePassword(
    values.temporaryPassword,
    "temporaryPassword",
    errors,
  );
  return Object.keys(errors).length
    ? ({ success: false, errors } as const)
    : ({ success: true, data: { temporaryPassword } } as const);
}
