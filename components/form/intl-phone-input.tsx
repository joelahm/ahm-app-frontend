"use client";

import { useEffect, useRef } from "react";
import intlTelInput from "intl-tel-input";

interface IntlPhoneInputProps {
  errorMessage?: string;
  isInvalid?: boolean;
  onBlur?: () => void;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}

const normalizePhoneValue = (value: string) => value.replace(/[^\d+]/g, "");

const toInternationalPhoneNumber = (
  iti: ReturnType<typeof intlTelInput>,
  inputValue: string,
) => {
  let intlValue = "";

  try {
    intlValue = iti.getNumber()?.trim() ?? "";
  } catch {
    intlValue = "";
  }

  if (intlValue && intlValue.startsWith("+")) {
    return intlValue;
  }

  const normalizedInput = normalizePhoneValue(inputValue);

  if (!normalizedInput) {
    return "";
  }

  if (normalizedInput.startsWith("+")) {
    return normalizedInput;
  }

  let dialCode = "";

  try {
    dialCode = iti.getSelectedCountryData().dialCode ?? "";
  } catch {
    dialCode = "";
  }
  const localDigits = normalizedInput.replace(/\D/g, "").replace(/^0+/, "");

  return dialCode ? `+${dialCode}${localDigits}` : localDigits;
};

export const IntlPhoneInput = ({
  errorMessage,
  isInvalid = false,
  onBlur,
  onChange,
  placeholder = "Enter phone number",
  value,
}: IntlPhoneInputProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const itiRef = useRef<ReturnType<typeof intlTelInput> | null>(null);
  const onChangeRef = useRef(onChange);

  onChangeRef.current = onChange;

  useEffect(() => {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    const iti = intlTelInput(input, {
      allowDropdown: true,
      countrySearch: true,
      dropdownContainer: document.body,
      fixDropdownWidth: true,
      initialCountry: "gb",
      nationalMode: false,
      strictMode: false,
      separateDialCode: true,
    });

    itiRef.current = iti;

    const handleInputChange = () => {
      onChangeRef.current(toInternationalPhoneNumber(iti, input.value));
    };

    input.addEventListener("input", handleInputChange);
    input.addEventListener("countrychange", handleInputChange);

    return () => {
      input.removeEventListener("input", handleInputChange);
      input.removeEventListener("countrychange", handleInputChange);
      iti.destroy();
      itiRef.current = null;
    };
  }, []);

  useEffect(() => {
    const iti = itiRef.current;

    if (!iti) {
      return;
    }

    if (!value) {
      iti.setNumber("");

      return;
    }

    if (iti.getNumber() !== value) {
      iti.setNumber(value);
    }
  }, [value]);

  return (
    <div className="space-y-1">
      <input
        ref={inputRef}
        className={[
          "h-8 w-full rounded-md border bg-white px-3 text-sm text-[#111827] outline-none transition-colors",
          isInvalid
            ? "border-danger focus:border-danger"
            : "border-default-200 focus:border-[#0568C9]",
        ].join(" ")}
        placeholder={placeholder}
        type="tel"
        onBlur={onBlur}
      />
      {errorMessage ? (
        <p className="text-xs text-danger">{errorMessage}</p>
      ) : null}
    </div>
  );
};
