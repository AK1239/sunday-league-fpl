export type ActionFailure = {
  ok: false;
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
};

export type ActionSuccess<T = void> = { ok: true } & (T extends void
  ? object
  : { data: T });

export type ActionResult<T = void> = ActionSuccess<T> | ActionFailure;

export function actionOk(): { ok: true };
export function actionOk<T>(data: T): { ok: true; data: T };
export function actionOk<T>(data?: T) {
  if (data === undefined) {
    return { ok: true as const };
  }
  return { ok: true as const, data };
}

export function actionFail(
  code: string,
  message: string,
  fieldErrors?: Record<string, string>,
): ActionFailure {
  return { ok: false, code, message, fieldErrors };
}
