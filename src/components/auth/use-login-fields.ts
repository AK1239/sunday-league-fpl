"use client";

import { useState } from "react";

/** Keeps email/password in React state so failed logins do not clear the fields. */
export function useLoginFields(initialEmail = "", initialPassword = "") {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  return {
    email,
    setEmail,
    password,
    setPassword,
  };
}
