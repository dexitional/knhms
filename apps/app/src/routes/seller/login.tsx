import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { asset } from "#/lib/asset"
import { api, ApiError } from "#/lib/api-client"

export const Route = createFileRoute("/seller/login")({
  component: SellerLoginPage,
})

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
})
type LoginFormValues = z.infer<typeof loginSchema>

// Same look as the admin login page.
const inputClass =
  "h-10 w-[250px] rounded-[5px] border-2 border-foreground bg-background px-[10px] py-[5px] text-[15px] font-semibold text-foreground shadow-[4px_4px_0px_#0D0D0D] outline-none placeholder:text-muted-foreground placeholder:opacity-80 focus:border-primary"

function SellerLoginPage() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  const loginMutation = useMutation({
    mutationFn: (values: LoginFormValues) => api.post("/seller-auth/login", values),
    onSuccess: () => navigate({ to: "/seller" }),
    onError: (err) =>
      setError("root", {
        message: err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      }),
  })

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#FFF5ED] px-4">
      <Link
        to="/e-market"
        className="inline-flex h-9 items-center gap-1.5 rounded-[5px] border-2 border-foreground bg-background px-3 text-sm font-semibold text-foreground shadow-[3px_3px_0px_#0D0D0D] transition-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
      >
        ← Back to E-Market
      </Link>
      <form
        onSubmit={handleSubmit((values) => loginMutation.mutate(values))}
        className="flex w-[300px] flex-col items-start gap-5 rounded-[5px] border-2 border-foreground bg-[#FFE8D6] p-5 shadow-[4px_4px_0px_#0D0D0D]"
      >
        <div className="mb-[25px]">
          <img src={asset("logo.png")} alt="Kwame Nkrumah Hall crest" className="mb-3 h-14 w-auto" />
          <div className="text-[20px] font-black text-foreground">Seller Portal</div>
          <div className="text-[17px] font-semibold text-muted-foreground">Sign in to manage your listings</div>
        </div>

        <input type="email" placeholder="Email" autoComplete="email" {...register("email")} className={inputClass} />
        {errors.email && <p className="-mt-3 text-xs text-destructive">{errors.email.message}</p>}

        <input
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          {...register("password")}
          className={inputClass}
        />
        {errors.password && <p className="-mt-3 text-xs text-destructive">{errors.password.message}</p>}

        {errors.root && <p className="text-xs text-destructive">{errors.root.message}</p>}

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="mx-auto mt-[50px] h-10 w-[120px] cursor-pointer rounded-[5px] border-2 border-foreground bg-background text-[17px] font-semibold text-foreground shadow-[4px_4px_0px_#0D0D0D] transition-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50"
        >
          {loginMutation.isPending ? "Signing in..." : "Sign in →"}
        </button>

        <p className="w-full text-center text-xs text-muted-foreground">
          New seller?{" "}
          <Link to="/seller/register" className="font-semibold text-foreground hover:text-primary">
            Register here
          </Link>
          <br />
          Forgot your password? Contact the hall office to reset it.
        </p>
      </form>
    </div>
  )
}
