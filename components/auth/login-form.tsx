"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { Alert } from "@heroui/alert";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-context";

const loginSchema = yup.object({
  email: yup
    .string()
    .email("Enter a valid email")
    .required("Email is required"),
  password: yup.string().required("Password is required"),
});

type LoginFormValues = yup.InferType<typeof loginSchema>;

interface LoginFormProps {
  redirectTo?: string;
}

export const LoginForm = ({ redirectTo = "/dashboard" }: LoginFormProps) => {
  const router = useRouter();
  const { login } = useAuth();
  const [submitError, setSubmitError] = useState("");
  const {
    register,
    handleSubmit,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
  });

  const onSubmit = async (values: LoginFormValues) => {
    clearErrors();
    setSubmitError("");

    try {
      await loginSchema.validate(values, { abortEarly: false });
      await login(values);
      router.replace(redirectTo);
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        error.inner.forEach((issue) => {
          if (!issue.path) {
            return;
          }

          setError(issue.path as keyof LoginFormValues, {
            message: issue.message,
            type: "manual",
          });
        });

        return;
      }

      setSubmitError(error instanceof Error ? error.message : "Login failed.");
    }
  };

  return (
    <Card
      className="mx-auto w-full max-w-md border border-default-200"
      shadow="none"
    >
      <CardHeader className="flex flex-col items-start gap-1 px-6 pt-6">
        <h1 className="text-xl font-semibold text-[#111827]">Sign In</h1>
        <p className="text-sm text-default-500">
          Use your work email and password to continue.
        </p>
      </CardHeader>
      <CardBody className="space-y-4 px-6 pb-6">
        {submitError ? (
          <Alert color="danger" title={submitError} variant="flat" />
        ) : null}
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Input
            {...register("email")}
            errorMessage={errors.email?.message}
            isInvalid={!!errors.email}
            label="Email"
            radius="sm"
            size="sm"
            startContent={<Mail size={16} />}
            type="email"
          />
          <Input
            {...register("password")}
            errorMessage={errors.password?.message}
            isInvalid={!!errors.password}
            label="Password"
            radius="sm"
            size="sm"
            startContent={<Lock size={16} />}
            type="password"
          />
          <Button
            className="w-full"
            color="primary"
            isLoading={isSubmitting}
            radius="sm"
            type="submit"
          >
            Sign In
          </Button>
        </form>
      </CardBody>
    </Card>
  );
};
