import { Suspense } from "react";
import AuthLoading from "@/components/auth/auth-loading";
import SignUpForm from "./signup-form";

export default function SignUpPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <SignUpForm />
    </Suspense>
  );
}
