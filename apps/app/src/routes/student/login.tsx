import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { asset } from '#/lib/asset'
import { api, ApiError } from '#/lib/api-client'
import { Button } from '#/components/ui/button.tsx'
import { Card, CardContent } from '#/components/ui/card.tsx'
import { Input } from '#/components/ui/input.tsx'
import { DecorativeBackground } from '#/components/decorative-background'

export const Route = createFileRoute('/student/login')({
  component: StudentLoginPage,
})

const loginSchema = z.object({
  registrationNumber: z.string().min(1, 'Registration number is required'),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
})

type LoginFormValues = z.infer<typeof loginSchema>

// Underline-style input (no box, no fill) — the one recurring visual
// departure from the shadcn Input default used elsewhere in the app.
// Overrides are appended last so tailwind-merge (via cn()) drops the
// base component's border/rounded/shadow classes in favor of these.
const underlineInputClass =
  'rounded-none border-0 border-b border-input bg-transparent px-0 shadow-none focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0'

function StudentLoginPage() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  const loginMutation = useMutation({
    mutationFn: (values: LoginFormValues) =>
      api.post('/student-auth/login', values),
    onSuccess: () => navigate({ to: '/student' }),
    onError: (err) => {
      setError('root', {
        message:
          err instanceof ApiError
            ? err.message
            : 'Something went wrong. Please try again.',
      })
    },
  })

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <DecorativeBackground />
      <Card className="w-full max-w-sm rounded-2xl border-0 bg-white shadow-2xl">
        <CardContent className="flex flex-col p-8 sm:p-10">
          <img
            src={asset('logo.png')}
            alt="Kwame Nkrumah Hall crest"
            className="mx-auto h-20 max-w-[140px] object-contain"
          />
          <h1 className="mt-5 text-2xl font-semibold text-foreground">
            Sign in
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            to your student dashboard
          </p>

          <form
            onSubmit={handleSubmit((values) => loginMutation.mutate(values))}
            className="flex flex-col"
          >
            {errors.root && (
              <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errors.root.message}
              </div>
            )}

            <Input
              placeholder="Registration number"
              className={underlineInputClass}
              {...register('registrationNumber')}
            />
            {errors.registrationNumber && (
              <p className="mt-1 text-xs text-destructive">
                {errors.registrationNumber.message}
              </p>
            )}

            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="4-digit PIN"
              className={`mt-5 ${underlineInputClass}`}
              {...register('pin')}
            />
            {errors.pin && (
              <p className="mt-1 text-xs text-destructive">
                {errors.pin.message}
              </p>
            )}

            <p className="mt-5 text-[13px] text-muted-foreground">
              Not registered yet?{' '}
              <Link to="/register" className="text-primary hover:underline">
                Register here
              </Link>
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              <Link
                to="/student/forgot-pin"
                className="text-primary hover:underline"
              >
                Forgot your PIN?
              </Link>
            </p>

            <div className="mt-8 flex items-center justify-end gap-2">
              <Button
                asChild
                variant="secondary"
                className="min-w-24 rounded-sm"
              >
                <Link to="/">Back</Link>
              </Button>
              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="min-w-24 rounded-sm"
              >
                {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
