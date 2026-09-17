"use client";

import { useActionState, useState } from "react";
import {
  AlertCircleIcon,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2Icon,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, type LoginState } from "./actions";

const fieldControlClass =
  "flex h-[51px] items-center gap-2.5 rounded-[13px] border border-[#d5e3dc] bg-white px-4 text-[#7da094] transition-colors focus-within:border-[#4b9877] focus-within:bg-[#fcfffd] focus-within:shadow-[0_0_0_4px_rgb(75_152_119/12%)] dark:border-[#2a3f38] dark:bg-[#10201a] dark:focus-within:border-[#4b9877]";

const fieldInputClass =
  "h-full min-w-0 flex-1 border-0 bg-transparent px-0 text-sm text-[#18352e] outline-none placeholder:text-[#a8bab3] focus-visible:ring-0 focus-visible:shadow-none dark:text-[#e8f0ec] dark:placeholder:text-[#5c6f66]";

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    signIn,
    undefined
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="mt-[35px] space-y-5">
      <input type="hidden" name="next" value={next} />

      {notice ? (
        <div
          role="status"
          className="rounded-[10px] bg-[#e6f4e9] p-3 text-sm text-[#28644c]"
        >
          {notice}
        </div>
      ) : null}

      {state?.error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-[10px] bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">Email sekolah</Label>
        <div className={fieldControlClass}>
          <Mail size={18} aria-hidden="true" className="shrink-0" />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nama@sekolah.sch.id"
            required
            className={fieldInputClass}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className={fieldControlClass}>
          <KeyRound size={18} aria-hidden="true" className="shrink-0" />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Masukkan password"
            required
            className={fieldInputClass}
          />
          <button
            type="button"
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            onClick={() => setShowPassword((value) => !value)}
            className="grid shrink-0 place-items-center text-[#7da094] transition-colors hover:text-[#1d7255]"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-[53px] w-full rounded-[13px] bg-[#1b604b] text-sm font-bold text-white shadow-[0_9px_19px_rgb(23_94_72/18%)] transition-all hover:-translate-y-0.5 hover:bg-[#164d3e] hover:shadow-[0_12px_23px_rgb(23_94_72/25%)]"
      >
        {isPending ? (
          <>
            <Loader2Icon className="animate-spin" />
            Memproses...
          </>
        ) : (
          <>
            Masuk
            <ArrowRight size={18} />
          </>
        )}
      </Button>
    </form>
  );
}
