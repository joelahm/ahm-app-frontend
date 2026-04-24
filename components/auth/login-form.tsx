"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-context";
import { useAppToast } from "@/hooks/use-app-toast";

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
  const toast = useAppToast();
  const [showPassword, setShowPassword] = useState(false);
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

    try {
      await loginSchema.validate(values, { abortEarly: false });
      await login(values);
      toast.success("Welcome back!", {
        description: "You’re now signed in.",
      });
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

      const rawMessage =
        error instanceof Error ? error.message : "Unable to sign in.";
      const normalizedMessage = rawMessage.toLowerCase();

      if (
        normalizedMessage.includes("invalid") ||
        normalizedMessage.includes("unauthorized") ||
        normalizedMessage.includes("credential") ||
        normalizedMessage.includes("email or password")
      ) {
        toast.danger("Email or password is incorrect.", {
          description: "Please check your details and try again.",
        });

        return;
      }

      toast.danger("Sign-in failed.", {
        description:
          "We couldn’t sign you in right now. Please try again in a moment.",
      });
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
            endContent={
              <Button
                isIconOnly
                size="sm"
                type="button"
                variant="light"
                onPress={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            }
            errorMessage={errors.password?.message}
            isInvalid={!!errors.password}
            label="Password"
            radius="sm"
            size="sm"
            startContent={<Lock size={16} />}
            type={showPassword ? "text" : "password"}
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
